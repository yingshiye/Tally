// Database reads for the planner. Server-only; builds the input for the pure buildToday().
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { dayBounds, localDateOf } from "../time";
import { defaultGoals, type GoalDef } from "../goals";
import { buildToday, type PrefsRow, type TaskRow } from "../today";
import type { TodayResponse } from "../schemas";

type Client = SupabaseClient<Database>;

/** The user's preferences; creates the default row on first use. */
export async function getPreferences(supabase: Client, userId: string): Promise<PrefsRow> {
  const { data, error } = await supabase.from("planner_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: insertError } = await supabase
    .from("planner_preferences").upsert({ user_id: userId }, { onConflict: "user_id" }).select("*").single();
  if (insertError) throw insertError;
  return created;
}

/** The user's active goals in display order. First use seeds the three defaults from the legacy columns. */
export async function getGoals(supabase: Client, userId: string, prefs: PrefsRow): Promise<GoalDef[]> {
  const { data, error } = await supabase.from("planner_goals").select("key,label,target")
    .eq("user_id", userId).is("archived_at", null).order("sort").order("created_at");
  if (error) throw error;
  if (data.length) return data;
  const defaults = defaultGoals(prefs);
  const { error: seedError } = await supabase.from("planner_goals").upsert(
    defaults.map((g, sort) => ({ user_id: userId, ...g, sort })), { onConflict: "user_id,key", ignoreDuplicates: true });
  if (seedError) throw seedError;
  return defaults;
}

export async function loadToday(supabase: Client, userId: string, now: Date, requestedDate?: string, prefsIn?: PrefsRow): Promise<TodayResponse> {
  const prefs = prefsIn ?? (await getPreferences(supabase, userId));
  const date = requestedDate ?? localDateOf(now, prefs.timezone);
  const day = dayBounds(date, prefs.timezone);
  const dayStart = day.start.toISOString();
  const dayEnd = day.end.toISOString();
  const goalDefs = await getGoals(supabase, userId, prefs);

  const [blocksR, eventsR, pinnedR, inboxR, goalsR, appsR, postponesR, backlogR] = await Promise.all([
    supabase.from("planner_blocks").select("*").eq("user_id", userId).lt("start_at", dayEnd).gt("end_at", dayStart),
    supabase.from("planner_calendar_events").select("*").eq("user_id", userId).lt("start_at", dayEnd).gt("end_at", dayStart),
    supabase.from("planner_tasks").select("*").eq("user_id", userId).eq("top3_date", date),
    supabase.from("planner_inbox_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "new"),
    supabase.from("planner_goal_logs").select("goal_key,count").eq("user_id", userId).eq("local_date", date),
    // Applications are counted from the existing table by applied_date (a plain local date).
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("applied_date", date),
    // Postpone counts come from the log. Single-user data, so a capped scan is fine.
    supabase.from("planner_changes").select("entity_type,entity_id,action,before,after").eq("user_id", userId).eq("action", "postpone").limit(2000),
    supabase.from("planner_tasks").select("*").eq("user_id", userId).in("status", ["todo", "doing"]).is("parent_id", null)
      .order("due_at", { ascending: true, nullsFirst: false }).order("importance", { ascending: false }).order("id").limit(40),
  ]);
  for (const r of [blocksR, eventsR, pinnedR, inboxR, goalsR, appsR, postponesR, backlogR]) if (r.error) throw r.error;

  const blocks = blocksR.data ?? [];
  const tasks = new Map<string, TaskRow>((pinnedR.data ?? []).map((t) => [t.id, t]));
  const missing = [...new Set(blocks.map((b) => b.task_id).filter((id): id is string => !!id && !tasks.has(id)))];
  if (missing.length) {
    const { data, error } = await supabase.from("planner_tasks").select("*").eq("user_id", userId).in("id", missing);
    if (error) throw error;
    for (const t of data ?? []) tasks.set(t.id, t);
  }

  return buildToday({
    date, now, prefs,
    tasks: [...tasks.values()],
    backlog: backlogR.data ?? [],
    blocks,
    events: eventsR.data ?? [],
    changes: postponesR.data ?? [],
    goalDefs,
    goalLogs: goalsR.data ?? [],
    applicationsCount: appsR.count ?? 0,
    inboxCount: inboxR.count ?? 0,
  });
}

export type CalendarSyncStatus = { connected: boolean; lastSyncAt: string | null; upcomingEvents: number };

/** Whether an Apple Calendar token is active, when it last synced, and how many imported events are ahead. */
export async function getCalendarSyncStatus(supabase: Client, userId: string, now: Date): Promise<CalendarSyncStatus> {
  const [integration, events] = await Promise.all([
    supabase.from("planner_integrations").select("last_used_at").eq("user_id", userId).eq("kind", "calendar_sync").is("revoked_at", null).maybeSingle(),
    supabase.from("planner_calendar_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("source", "apple").gt("end_at", now.toISOString()),
  ]);
  if (integration.error) throw integration.error;
  if (events.error) throw events.error;
  return { connected: !!integration.data, lastSyncAt: integration.data?.last_used_at ?? null, upcomingEvents: events.count ?? 0 };
}
