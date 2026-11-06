"use server";
// Planner mutations. Each one: authenticate -> validate (Zod) -> enforce rules -> write -> log to planner_changes.
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/supabase";
import { checkPlacement, findStarterSlot } from "../block-rules";
import { countPostponements, postponeNeedsChoice } from "../deferrals";
import { parseCapture } from "../parse-capture";
import * as S from "../schemas";
import type { ActionResult } from "../schemas";
import { addDays, dayBounds, localDateOf } from "../time";
import { validatePin } from "../top3";
import { dbFail, fail, logChange, ok, withAction, type Ctx } from "./context";
import { APPLICATIONS_KEY, planGoalSave, validateGoalDrafts } from "../goals";
import { getGoals, loadToday } from "./queries";

const refresh = () => revalidatePath("/today");

// ─── helpers ─────────────────────────────────────────────────────────────────
async function dayFacts(ctx: Ctx, instant: Date) {
  const prefs = await ctx.prefs();
  const date = localDateOf(instant, prefs.timezone);
  const day = dayBounds(date, prefs.timezone);
  const [events, blocks] = await Promise.all([
    ctx.supabase.from("planner_calendar_events").select("start_at,end_at,all_day").eq("user_id", ctx.userId)
      .lt("start_at", day.end.toISOString()).gt("end_at", day.start.toISOString()),
    ctx.supabase.from("planner_blocks").select("id,start_at,end_at,status").eq("user_id", ctx.userId)
      .lt("start_at", day.end.toISOString()).gt("end_at", day.start.toISOString()),
  ]);
  if (events.error) throw events.error;
  if (blocks.error) throw blocks.error;
  return {
    prefs, date, day,
    // All-day events are context (a holiday, "midterm week"), not time that blocks placement.
    events: (events.data ?? []).filter((e) => !e.all_day).map((e) => ({ start: new Date(e.start_at), end: new Date(e.end_at) })),
    blocks: (blocks.data ?? []).map((b) => ({ id: b.id, status: b.status, start: new Date(b.start_at), end: new Date(b.end_at) })),
  };
}

const placementError = {
  invalid_range: "invalid_input", outside_day: "outside_day", overlap_event: "overlap", overlap_block: "overlap",
} as const;

async function insertBlock(ctx: Ctx, v: { taskId: string | null; title: string; start: Date; end: Date; kind: "task" | "starter" | "break" }) {
  const facts = await dayFacts(ctx, v.start);
  const check = checkPlacement({ start: v.start, end: v.end, day: facts.day, events: facts.events, blocks: facts.blocks });
  if (!check.ok) return fail(placementError[check.error]);
  const { data, error } = await ctx.supabase.from("planner_blocks").insert({
    user_id: ctx.userId, task_id: v.taskId, title: v.title, kind: v.kind,
    start_at: check.start.toISOString(), end_at: check.end.toISOString(),
  }).select("*").single();
  if (error) return dbFail("insert block", error);
  await logChange(ctx, { entityType: "block", entityId: data.id, action: "create", after: { task_id: data.task_id, start_at: data.start_at, end_at: data.end_at } });
  return ok(data);
}

async function findProjectId(ctx: Ctx, hint: string): Promise<string | null> {
  const { data } = await ctx.supabase.from("planner_projects").select("id,name,kind").eq("user_id", ctx.userId).is("archived_at", null);
  const norm = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, " ").trim();
  const h = norm(hint);
  return (data ?? []).find((p) => norm(p.name) === h || norm(p.kind) === h)?.id ?? null;
}

// ─── inbox ───────────────────────────────────────────────────────────────────
export async function captureToInbox(raw: unknown) {
  return withAction(S.captureInputSchema, raw, async (ctx, { text }) => {
    const { data, error } = await ctx.supabase.from("planner_inbox_items").insert({ user_id: ctx.userId, raw_text: text }).select("id").single();
    if (error) return dbFail("capture", error);
    refresh();
    return ok({ id: data.id });
  });
}

export async function triageInboxItem(raw: unknown) {
  return withAction(S.triageInputSchema, raw, async (ctx, input) => {
    const { data: item } = await ctx.supabase.from("planner_inbox_items").select("*").eq("id", input.inboxItemId).eq("user_id", ctx.userId).maybeSingle();
    if (!item || item.status !== "new") return fail("not_found");
    const prefs = await ctx.prefs();
    // Short syntax typed at capture time fills whatever the chips did not set.
    const parsed = parseCapture(item.raw_text, { now: ctx.now, timezone: prefs.timezone });
    const projectId = input.projectId !== undefined ? input.projectId : parsed.projectHint ? await findProjectId(ctx, parsed.projectHint) : null;
    const { data: task, error } = await ctx.supabase.from("planner_tasks").insert({
      user_id: ctx.userId,
      title: input.title ?? parsed.title,
      project_id: projectId,
      estimate_min: input.estimateMin !== undefined ? input.estimateMin : parsed.estimateMin,
      importance: input.importance ?? parsed.importance ?? 2,
      due_at: input.dueAt !== undefined ? input.dueAt : parsed.dueAt?.toISOString() ?? null,
      source: "inbox",
    }).select("*").single();
    if (error) return dbFail("triage insert task", error);
    const { error: markError } = await ctx.supabase.from("planner_inbox_items").update({ status: "triaged", task_id: task.id }).eq("id", item.id);
    if (markError) {
      await ctx.supabase.from("planner_tasks").delete().eq("id", task.id); // keep inbox and tasks consistent
      return dbFail("triage mark item", markError);
    }
    await logChange(ctx, { entityType: "task", entityId: task.id, action: "create", reason: "from inbox" });
    refresh();
    return ok({ taskId: task.id });
  });
}

export async function discardInboxItem(raw: unknown) {
  return withAction(S.discardInboxInputSchema, raw, async (ctx, { inboxItemId }) => {
    const { data, error } = await ctx.supabase.from("planner_inbox_items").update({ status: "discarded" })
      .eq("id", inboxItemId).eq("user_id", ctx.userId).eq("status", "new").select("id");
    if (error) return dbFail("discard inbox", error);
    if (!data?.length) return fail("not_found");
    refresh();
    return ok(null);
  });
}

// ─── tasks ───────────────────────────────────────────────────────────────────
export async function createTask(raw: unknown) {
  return withAction(S.createTaskInputSchema, raw, async (ctx, i) => {
    const { data, error } = await ctx.supabase.from("planner_tasks").insert({
      user_id: ctx.userId, title: i.title, notes: i.notes ?? null, project_id: i.projectId ?? null, parent_id: i.parentId ?? null,
      importance: i.importance, estimate_min: i.estimateMin ?? null, due_at: i.dueAt ?? null, first_step: i.firstStep || null,
    }).select("id").single();
    if (error) return dbFail("create task", error);
    await logChange(ctx, { entityType: "task", entityId: data.id, action: "create" });
    refresh();
    return ok({ taskId: data.id });
  });
}

export async function updateTask(raw: unknown) {
  return withAction(S.updateTaskInputSchema, raw, async (ctx, { taskId, ...f }) => {
    const patch: Database["public"]["Tables"]["planner_tasks"]["Update"] = {};
    if (f.title !== undefined) patch.title = f.title;
    if (f.notes !== undefined) patch.notes = f.notes;
    if (f.projectId !== undefined) patch.project_id = f.projectId;
    if (f.importance !== undefined) patch.importance = f.importance;
    if (f.estimateMin !== undefined) patch.estimate_min = f.estimateMin;
    if (f.dueAt !== undefined) patch.due_at = f.dueAt;
    if (!Object.keys(patch).length) return ok(null);
    const { data, error } = await ctx.supabase.from("planner_tasks").update(patch).eq("id", taskId).eq("user_id", ctx.userId).select("id");
    if (error) return dbFail("update task", error);
    if (!data?.length) return fail("not_found");
    refresh();
    return ok(null);
  });
}

async function closeTask(ctx: Ctx, taskId: string, status: "done" | "dropped") {
  const { data: before } = await ctx.supabase.from("planner_tasks").select("status,top3_date").eq("id", taskId).eq("user_id", ctx.userId).maybeSingle();
  if (!before) return fail("not_found");
  const { error } = await ctx.supabase.from("planner_tasks")
    .update({ status, completed_at: status === "done" ? ctx.now.toISOString() : null }).eq("id", taskId).eq("user_id", ctx.userId);
  if (error) return dbFail("close task", error);
  await logChange(ctx, { entityType: "task", entityId: taskId, action: status === "done" ? "complete" : "drop", before: { status: before.status }, after: { status } });
  refresh();
  return ok(null);
}
export async function completeTask(raw: unknown) {
  return withAction(S.taskIdInputSchema, raw, (ctx, { taskId }) => closeTask(ctx, taskId, "done"));
}
export async function dropTask(raw: unknown) {
  return withAction(S.taskIdInputSchema, raw, (ctx, { taskId }) => closeTask(ctx, taskId, "dropped"));
}

export async function setFirstStep(raw: unknown) {
  return withAction(S.setFirstStepInputSchema, raw, async (ctx, { taskId, firstStep }) => {
    const { data, error } = await ctx.supabase.from("planner_tasks").update({ first_step: firstStep || null }).eq("id", taskId).eq("user_id", ctx.userId).select("id");
    if (error) return dbFail("set first step", error);
    if (!data?.length) return fail("not_found");
    refresh();
    return ok(null);
  });
}

export async function pinTask(raw: unknown) {
  return withAction(S.pinInputSchema, raw, async (ctx, { taskId, date }) => {
    const { data: task } = await ctx.supabase.from("planner_tasks").select("id,status,estimate_min,first_step,top3_date").eq("id", taskId).eq("user_id", ctx.userId).maybeSingle();
    if (!task) return fail("not_found");
    const prefs = await ctx.prefs();
    const { data: pinned, error } = await ctx.supabase.from("planner_tasks").select("id").eq("user_id", ctx.userId).eq("top3_date", date).neq("status", "dropped");
    if (error) return dbFail("load pinned", error);
    const check = validatePin({ task, pinnedTaskIds: (pinned ?? []).map((p) => p.id), topN: prefs.top_n });
    if (!check.ok) return fail(check.reason);
    const { error: updateError } = await ctx.supabase.from("planner_tasks").update({ top3_date: date }).eq("id", taskId).eq("user_id", ctx.userId);
    if (updateError) return dbFail("pin", updateError);
    await logChange(ctx, { entityType: "task", entityId: taskId, action: "pin", before: { top3_date: task.top3_date }, after: { top3_date: date } });
    refresh();
    return ok(null);
  });
}

export async function unpinTask(raw: unknown) {
  return withAction(S.unpinInputSchema, raw, async (ctx, { taskId }) => {
    const { data: task } = await ctx.supabase.from("planner_tasks").select("top3_date").eq("id", taskId).eq("user_id", ctx.userId).maybeSingle();
    if (!task) return fail("not_found");
    const { error } = await ctx.supabase.from("planner_tasks").update({ top3_date: null }).eq("id", taskId).eq("user_id", ctx.userId);
    if (error) return dbFail("unpin", error);
    await logChange(ctx, { entityType: "task", entityId: taskId, action: "unpin", before: { top3_date: task.top3_date }, after: { top3_date: null } });
    refresh();
    return ok(null);
  });
}

// ─── blocks ──────────────────────────────────────────────────────────────────
export async function createBlock(raw: unknown) {
  return withAction(S.createBlockInputSchema, raw, async (ctx, i) => {
    let title = i.title;
    if (i.taskId) {
      const { data: task } = await ctx.supabase.from("planner_tasks").select("title,status").eq("id", i.taskId).eq("user_id", ctx.userId).maybeSingle();
      if (!task) return fail("not_found");
      if (task.status === "done" || task.status === "dropped") return fail("task_closed");
      title ??= task.title;
    }
    const result = await insertBlock(ctx, { taskId: i.taskId ?? null, title: title ?? "Block", start: new Date(i.startAt), end: new Date(i.endAt), kind: i.kind });
    if (result.ok) refresh();
    return result.ok ? ok({ blockId: result.data.id }) : result;
  });
}

export async function moveBlock(raw: unknown) {
  return withAction(S.moveBlockInputSchema, raw, async (ctx, i) => {
    const { data: block } = await ctx.supabase.from("planner_blocks").select("*").eq("id", i.blockId).eq("user_id", ctx.userId).maybeSingle();
    if (!block) return fail("not_found");
    if (block.locked) return fail("locked");

    const facts = await dayFacts(ctx, new Date(i.startAt));
    const check = checkPlacement({ start: new Date(i.startAt), end: new Date(i.endAt), day: facts.day, events: facts.events, blocks: facts.blocks, ignoreBlockId: block.id });
    if (!check.ok) return fail(placementError[check.error]);

    const tz = facts.prefs.timezone;
    const oldStart = new Date(block.start_at);
    const oldEnd = new Date(block.end_at);
    const laterDay = localDateOf(check.start, tz) > localDateOf(oldStart, tz);
    const sameLength = check.end.getTime() - check.start.getTime() === oldEnd.getTime() - oldStart.getTime();
    if (check.start.getTime() === oldStart.getTime() && check.end.getTime() === oldEnd.getTime()) return ok(null);

    let action: "move" | "resize" | "postpone" = sameLength ? "move" : "resize";
    if (laterDay && block.task_id) {
      // Moving to a later day is a postpone. The third one asks the user to choose instead of silently moving.
      const { data: log, error: logError } = await ctx.supabase.from("planner_changes").select("entity_type,entity_id,action,before,after").eq("user_id", ctx.userId).eq("action", "postpone");
      if (logError) return dbFail("load postpones", logError);
      const prior = countPostponements(block.task_id, log ?? []);
      if (postponeNeedsChoice(prior) && !i.confirmPostpone) return fail("needs_choice", { data: { postponedCount: prior } });
      action = "postpone";
    }

    const { error } = await ctx.supabase.from("planner_blocks").update({ start_at: check.start.toISOString(), end_at: check.end.toISOString() }).eq("id", block.id).eq("user_id", ctx.userId);
    if (error) return dbFail("move block", error);
    await logChange(ctx, {
      entityType: "block", entityId: block.id, action,
      before: { task_id: block.task_id, start_at: block.start_at, end_at: block.end_at },
      after: { task_id: block.task_id, start_at: check.start.toISOString(), end_at: check.end.toISOString() },
    });
    refresh();
    return ok(null);
  });
}

export async function deleteBlock(raw: unknown) {
  return withAction(S.blockIdInputSchema, raw, async (ctx, { blockId }) => {
    const { data: block } = await ctx.supabase.from("planner_blocks").select("*").eq("id", blockId).eq("user_id", ctx.userId).maybeSingle();
    if (!block) return fail("not_found");
    if (block.locked) return fail("locked");
    const { error } = await ctx.supabase.from("planner_blocks").delete().eq("id", blockId).eq("user_id", ctx.userId);
    if (error) return dbFail("delete block", error);
    await logChange(ctx, { entityType: "block", entityId: blockId, action: "drop", before: { task_id: block.task_id, start_at: block.start_at, end_at: block.end_at } });
    refresh();
    return ok(null);
  });
}

export async function setBlockStatus(raw: unknown) {
  return withAction(S.setBlockStatusInputSchema, raw, async (ctx, { blockId, status }) => {
    const { data: block } = await ctx.supabase.from("planner_blocks").select("status").eq("id", blockId).eq("user_id", ctx.userId).maybeSingle();
    if (!block) return fail("not_found");
    const { error } = await ctx.supabase.from("planner_blocks").update({ status }).eq("id", blockId).eq("user_id", ctx.userId);
    if (error) return dbFail("block status", error);
    if (status !== "planned") await logChange(ctx, { entityType: "block", entityId: blockId, action: status === "done" ? "complete" : "drop", before: { status: block.status }, after: { status } });
    refresh();
    return ok(null);
  });
}

export async function setBlockLocked(raw: unknown) {
  return withAction(S.setBlockLockedInputSchema, raw, async (ctx, { blockId, locked }) => {
    const { data, error } = await ctx.supabase.from("planner_blocks").update({ locked }).eq("id", blockId).eq("user_id", ctx.userId).select("id");
    if (error) return dbFail("lock block", error);
    if (!data?.length) return fail("not_found");
    refresh();
    return ok(null);
  });
}

/** Put a 15-minute starter block in the next free slot that fits (today first, then the next 6 days). */
export async function scheduleStarter(raw: unknown) {
  return withAction(S.scheduleStarterInputSchema, raw, async (ctx, { taskId }) => {
    const { data: task } = await ctx.supabase.from("planner_tasks").select("title,first_step,status").eq("id", taskId).eq("user_id", ctx.userId).maybeSingle();
    if (!task) return fail("not_found");
    if (task.status === "done" || task.status === "dropped") return fail("task_closed");
    const prefs = await ctx.prefs();
    const today = localDateOf(ctx.now, prefs.timezone);
    for (let offset = 0; offset < 7; offset++) {
      const view = await loadToday(ctx.supabase, ctx.userId, ctx.now, addDays(today, offset), prefs);
      const slot = findStarterSlot({
        freeSlots: view.freeSlots.map((s) => ({ start: new Date(s.startAt), end: new Date(s.endAt) })),
        blocks: view.blocks.map((b) => ({ id: b.id, status: b.status, start: new Date(b.startAt), end: new Date(b.endAt) })),
        from: ctx.now, durationMin: prefs.starter_min,
      });
      if (!slot) continue;
      const title = task.first_step ? `Start: ${task.first_step}` : `Plan the first step: ${task.title}`;
      const result = await insertBlock(ctx, { taskId, title, start: slot.start, end: slot.end, kind: "starter" });
      if (result.ok) refresh();
      return result.ok ? ok({ blockId: result.data.id }) : result;
    }
    return fail("no_slot");
  });
}

// ─── goals ───────────────────────────────────────────────────────────────────
export async function incrementGoal(raw: unknown) {
  return withAction(S.goalIncrementInputSchema, raw, async (ctx, { goalKey, date, delta }) => {
    if (goalKey === APPLICATIONS_KEY) return fail("invalid_input", { message: "Applications count automatically" });
    const active = await getGoals(ctx.supabase, ctx.userId, await ctx.prefs());
    if (!active.some((g) => g.key === goalKey)) return fail("not_found");
    const { data: row } = await ctx.supabase.from("planner_goal_logs").select("count").eq("user_id", ctx.userId).eq("goal_key", goalKey).eq("local_date", date).maybeSingle();
    const count = Math.max(0, (row?.count ?? 0) + delta);
    const { error } = await ctx.supabase.from("planner_goal_logs").upsert({ user_id: ctx.userId, goal_key: goalKey, local_date: date, count });
    if (error) return dbFail("goal", error);
    refresh();
    return ok({ count });
  });
}

/** Replace the whole goal list: rename, retarget, reorder, add (no key) and remove (omitted). Removed goals are archived. */
export async function saveGoals(raw: unknown): Promise<ActionResult> {
  return withAction(S.saveGoalsInputSchema, raw, async (ctx, { goals }) => {
    const existing = await getGoals(ctx.supabase, ctx.userId, await ctx.prefs());
    const problem = validateGoalDrafts(goals, new Set(existing.map((g) => g.key)));
    if (problem) return fail("invalid_input", { message: problem });
    const plan = planGoalSave(existing, goals, () => Math.random().toString(36).slice(2, 6));
    const rows = [
      ...plan.updates.map((g) => ({ user_id: ctx.userId, ...g, archived_at: null })),
      ...plan.inserts.map((g) => ({ user_id: ctx.userId, ...g, archived_at: null })),
    ];
    const { error } = await ctx.supabase.from("planner_goals").upsert(rows, { onConflict: "user_id,key" });
    if (error) return dbFail("save goals", error);
    if (plan.archives.length) {
      const { error: archiveError } = await ctx.supabase.from("planner_goals")
        .update({ archived_at: new Date().toISOString() }).eq("user_id", ctx.userId).in("key", plan.archives);
      if (archiveError) return dbFail("archive goals", archiveError);
    }
    refresh();
    revalidatePath("/settings", "layout");
    return ok(null);
  });
}

// ─── manual calendar events ──────────────────────────────────────────────────
export async function createCalendarEvent(raw: unknown) {
  return withAction(S.createCalendarEventInputSchema, raw, async (ctx, i) => {
    if (new Date(i.endAt) <= new Date(i.startAt)) return fail("invalid_input", { message: "End must be after start" });
    const { data, error } = await ctx.supabase.from("planner_calendar_events").insert({
      user_id: ctx.userId, title: i.title, start_at: i.startAt, end_at: i.endAt, all_day: i.allDay,
    }).select("id").single();
    if (error) return dbFail("create event", error);
    refresh();
    return ok({ eventId: data.id });
  });
}

export async function deleteCalendarEvent(raw: unknown) {
  return withAction(S.deleteCalendarEventInputSchema, raw, async (ctx, { eventId }) => {
    const { data, error } = await ctx.supabase.from("planner_calendar_events").delete().eq("id", eventId).eq("user_id", ctx.userId).eq("source", "manual").select("id");
    if (error) return dbFail("delete event", error);
    if (!data?.length) return fail("not_found");
    refresh();
    return ok(null);
  });
}

// ─── preferences ─────────────────────────────────────────────────────────────
export async function updatePreferences(raw: unknown): Promise<ActionResult> {
  return withAction(S.updatePreferencesInputSchema, raw, async (ctx, i) => {
    if (i.timezone) {
      try { new Intl.DateTimeFormat("en-US", { timeZone: i.timezone }); } catch { return fail("invalid_input", { message: "Unknown time zone" }); }
    }
    const current = await ctx.prefs();
    const start = i.workStart ?? current.work_start.slice(0, 5);
    const end = i.workEnd ?? current.work_end.slice(0, 5);
    if (end <= start) return fail("invalid_input", { message: "Work end must be after work start" });
    const { error } = await ctx.supabase.from("planner_preferences").update({
      ...(i.timezone && { timezone: i.timezone }), work_start: start, work_end: end,
      ...(i.bufferMin !== undefined && { buffer_min: i.bufferMin }),
      ...(i.starterMin !== undefined && { starter_min: i.starterMin }),
      ...(i.topN !== undefined && { top_n: i.topN }),
      ...(i.showEventTitles !== undefined && { show_event_titles: i.showEventTitles }),
    }).eq("user_id", ctx.userId);
    if (error) return dbFail("update prefs", error);
    refresh();
    return ok(null);
  });
}

// ─── reads used by client panels ─────────────────────────────────────────────
export async function listInbox(): Promise<ActionResult<{ id: string; rawText: string; createdAt: string }[]>> {
  return withAction(S.emptyInputSchema, {}, async (ctx) => {
    const { data, error } = await ctx.supabase.from("planner_inbox_items").select("id,raw_text,created_at")
      .eq("user_id", ctx.userId).eq("status", "new").order("created_at", { ascending: true }).limit(100);
    if (error) return dbFail("list inbox", error);
    return ok((data ?? []).map((r) => ({ id: r.id, rawText: r.raw_text, createdAt: r.created_at })));
  });
}
