// Builds the GET /api/planner/today response from plain rows. Pure: no clock, no database.
import { APPLICATIONS_KEY, type GoalDef } from "./goals";
import type { Database } from "../../types/supabase";
import { displayTitle } from "./event-title";
import { computeCapacity, plannedMinutes } from "./capacity";
import { countPostponements, type ChangeRecord } from "./deferrals";
import { computeFreeSlots } from "./free-slots";
import type { BlockDto, TaskCard, TodayResponse } from "./schemas";
import { needsFirstStep } from "./top3";
import { dayBounds, localDateOf, workWindow } from "./time";

type Tables = Database["public"]["Tables"];
export type TaskRow = Tables["planner_tasks"]["Row"];
export type BlockRow = Tables["planner_blocks"]["Row"];
export type EventRow = Tables["planner_calendar_events"]["Row"];
export type PrefsRow = Tables["planner_preferences"]["Row"];

const MIN = 60_000;
const iso = (d: Date) => d.toISOString();

export function toBlockDto(b: BlockRow): BlockDto {
  return {
    id: b.id, taskId: b.task_id, title: b.title,
    startAt: iso(new Date(b.start_at)), endAt: iso(new Date(b.end_at)),
    kind: b.kind as BlockDto["kind"], status: b.status as BlockDto["status"], locked: b.locked,
  };
}

export type TodayInput = {
  date: string;
  now: Date;
  prefs: Pick<PrefsRow, "timezone" | "work_start" | "work_end" | "buffer_min" | "starter_min" | "top_n">
    & { show_event_titles?: boolean };
  /** Pinned tasks for the date plus tasks referenced by the day's blocks. */
  tasks: TaskRow[];
  /** Open, unpinned tasks (already limited and ordered by the query). */
  backlog?: TaskRow[];
  blocks: BlockRow[];
  events: EventRow[];
  changes: ChangeRecord[];
  /** The user's active goals in display order. */
  goalDefs: GoalDef[];
  goalLogs: { goal_key: string; count: number }[];
  applicationsCount: number;
  inboxCount: number;
};

const hhmm = (t: string) => t.slice(0, 5); // Postgres "09:00:00" -> "09:00"

export function buildToday(input: TodayInput): TodayResponse {
  const { date, now, prefs } = input;
  const tz = prefs.timezone;
  const isToday = localDateOf(now, tz) === date;

  const day = dayBounds(date, tz);
  const work = workWindow(date, hhmm(prefs.work_start), hhmm(prefs.work_end), tz);
  // For today, only the part of the work window that is still ahead counts as free or planned.
  const window = {
    start: isToday && now > work.start ? (now < work.end ? now : work.end) : work.start,
    end: work.end,
  };

  const busy = input.events.map((e) =>
    e.all_day ? day : { start: new Date(e.start_at), end: new Date(e.end_at) },
  );
  const freeSlots = computeFreeSlots({
    dayStart: window.start, dayEnd: window.end, busy,
    bufferMin: prefs.buffer_min, minSlotMin: prefs.starter_min,
  });

  const blocks = input.blocks
    .map((b) => ({ ...b, start: new Date(b.start_at), end: new Date(b.end_at) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id));

  const capacity = computeCapacity(freeSlots, plannedMinutes(blocks, window));

  const taskById = new Map(input.tasks.map((t) => [t.id, t]));
  const minutesFor = (taskId: string, status: string) =>
    Math.round(
      blocks
        .filter((b) => b.task_id === taskId && b.status === status && b.kind !== "break")
        .reduce((s, b) => s + (b.end.getTime() - b.start.getTime()), 0) / MIN,
    );

  const card = (t: TaskRow): TaskCard => ({
    id: t.id, title: t.title, status: t.status as TaskCard["status"],
    importance: t.importance as TaskCard["importance"], projectId: t.project_id,
    dueAt: t.due_at ? iso(new Date(t.due_at)) : null,
    estimateMin: t.estimate_min, firstStep: t.first_step,
    needsFirstStep: needsFirstStep(t),
    postponedCount: countPostponements(t.id, input.changes),
    plannedMin: minutesFor(t.id, "planned"), doneMin: minutesFor(t.id, "done"),
  });

  const top3 = input.tasks
    .filter((t) => t.top3_date === date && t.status !== "dropped")
    .sort((a, b) =>
      Number(a.status === "done") - Number(b.status === "done")
      || b.importance - a.importance
      || a.id.localeCompare(b.id))
    .slice(0, prefs.top_n)
    .map(card);

  const active = blocks.filter((b) => b.status === "planned");
  const nowBlock = isToday ? active.find((b) => b.start <= now && now < b.end) : undefined;
  // Today: the next block after now. A future day: its first block ("first up"). Past days: none.
  const nextBlock = isToday ? active.find((b) => b.start > now) : date > localDateOf(now, tz) ? active[0] : undefined;

  const dayTaskIds = new Set<string>(top3.map((t) => t.id));
  for (const b of blocks) if (b.task_id && b.status !== "skipped") dayTaskIds.add(b.task_id);
  const dayTasks = [...dayTaskIds].map((id) => taskById.get(id)).filter((t): t is TaskRow => !!t && t.status !== "dropped");

  const logged = (key: string) => input.goalLogs.find((g) => g.goal_key === key)?.count ?? 0;

  return {
    date, timezone: tz, generatedAt: iso(now),
    window: { startAt: iso(work.start), endAt: iso(work.end) },
    top3,
    backlog: (input.backlog ?? []).filter((t) => t.top3_date !== date).map(card),
    now: nowBlock ? toBlockDto(nowBlock) : null,
    next: nextBlock ? toBlockDto(nextBlock) : null,
    blocks: blocks.map(toBlockDto),
    events: input.events
      .map((e) => ({ id: e.id, title: displayTitle(e.title, e.source, prefs.show_event_titles), startAt: iso(new Date(e.start_at)), endAt: iso(new Date(e.end_at)), allDay: e.all_day }))
      .sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id)),
    freeSlots: freeSlots.map((s) => ({ startAt: iso(s.start), endAt: iso(s.end) })),
    capacity,
    goals: input.goalDefs.map((g) => ({
      key: g.key, label: g.label, target: g.target,
      done: g.key === APPLICATIONS_KEY ? input.applicationsCount : logged(g.key),
    })),
    progress: { done: dayTasks.filter((t) => t.status === "done").length, total: dayTasks.length },
    inboxCount: input.inboxCount,
  };
}
