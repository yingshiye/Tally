import { defaultGoals } from "./goals";
import test from "node:test";
import assert from "node:assert/strict";
import { buildToday, type BlockRow, type EventRow, type TaskRow, type TodayInput } from "./today";
import { todayResponseSchema } from "./schemas";

const U = "00000000-0000-4000-8000-000000000001";
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DEFAULT_GOALS = defaultGoals({ goal_applications: 5, goal_connections: 5, goal_followups: 3 });
const prefs = {
  timezone: "America/Los_Angeles", work_start: "09:00:00", work_end: "21:00:00",
  buffer_min: 10, starter_min: 15, top_n: 3,
};
const task = (n: number, over: Partial<TaskRow> = {}): TaskRow => ({
  id: uid(n), user_id: U, project_id: null, parent_id: null, title: `Task ${n}`, notes: null,
  importance: 2, estimate_min: 60, due_at: null, status: "todo", first_step: null, top3_date: null,
  source: "manual", completed_at: null, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z", ...over,
});
// 2026-05-04 PDT: 09:00 local = 16:00Z
const at = (hhmm: string) => `2026-05-04T${hhmm}:00Z`;
const block = (n: number, taskId: string | null, s: string, e: string, over: Partial<BlockRow> = {}): BlockRow => ({
  id: uid(100 + n), user_id: U, task_id: taskId, title: "Block", start_at: at(s), end_at: at(e),
  kind: "task", status: "planned", locked: false, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z", ...over,
});
const event = (n: number, s: string, e: string, over: Partial<EventRow> = {}): EventRow => ({
  id: uid(200 + n), user_id: U, title: "Lecture", start_at: at(s), end_at: at(e), all_day: false,
  source: "manual", external_id: null, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z", ...over,
});
const base = (over: Partial<TodayInput> = {}): TodayInput => ({
  date: "2026-05-04", now: new Date(at("15:00")), // 08:00 local, before work starts
  prefs, tasks: [], blocks: [], events: [], changes: [], goalDefs: DEFAULT_GOALS, goalLogs: [], applicationsCount: 0, inboxCount: 0, ...over,
});

test("empty day validates against the schema and has a full work window free", () => {
  const r = buildToday(base());
  todayResponseSchema.parse(r);
  assert.equal(r.capacity.freeMin, 720);
  assert.equal(r.capacity.plannedMin, 0);
  assert.equal(r.now, null);
  assert.equal(r.next, null);
  assert.deepEqual(r.goals.map((g) => [g.key, g.done, g.target]), [["applications", 0, 5], ["connections", 0, 5], ["followups", 0, 3]]);
});

test("events, buffers and blocks drive free time and the overloaded flag", () => {
  const r = buildToday(base({
    events: [event(1, "17:00", "18:00")], // 10:00-11:00 local
    blocks: [block(1, uid(1), "19:00", "21:00")],
    tasks: [task(1)],
  }));
  todayResponseSchema.parse(r);
  assert.equal(r.capacity.freeMin, 720 - 60 - 20); // event + 2 buffers
  assert.equal(r.capacity.plannedMin, 120);
  assert.equal(r.capacity.overloaded, false);
  const over = buildToday(base({
    events: [event(1, "16:00", "00:00", { end_at: "2026-05-05T02:00:00Z" })], // 09:00-19:00 local
    blocks: [block(1, null, "23:00", "23:30", { end_at: "2026-05-05T01:00:00Z" })], // 16:00-18:00 local = 120 min
  }));
  assert.equal(over.capacity.overloaded, true);
});

test("all-day events do not break the free-time math", () => {
  const r = buildToday(base({ events: [event(1, "07:00", "07:00", { all_day: true, start_at: at("07:00"), end_at: "2026-05-05T07:00:00Z" })] }));
  todayResponseSchema.parse(r);
  assert.equal(r.capacity.freeMin, 0);
});

test("now / next blocks are only set for today", () => {
  const blocks = [block(1, null, "17:00", "18:00"), block(2, null, "19:00", "20:00")];
  const during = buildToday(base({ now: new Date(at("17:30")), blocks }));
  assert.equal(during.now?.id, uid(101));
  assert.equal(during.next?.id, uid(102));
  const other = buildToday(base({ date: "2026-05-05", now: new Date(at("17:30")), blocks }));
  assert.equal(other.now, null);
  assert.equal(other.next?.id, uid(101)); // a future day leads with its first block
  const past = buildToday(base({ date: "2026-05-03", now: new Date(at("17:30")), blocks }));
  assert.equal(past.next, null);
});

test("today's free time starts at now once work has begun", () => {
  const r = buildToday(base({ now: new Date(at("23:00")) })); // 16:00 local
  assert.equal(r.capacity.freeMin, 300);
});

test("top 3: pinned tasks only, with needsFirstStep, postponedCount and progress minutes", () => {
  const big = task(1, { top3_date: "2026-05-04", estimate_min: 240 });
  const small = task(2, { top3_date: "2026-05-04", importance: 3 });
  const notPinned = task(3);
  const done = task(4, { top3_date: "2026-05-04", status: "done" });
  const r = buildToday(base({
    tasks: [big, small, notPinned, done],
    blocks: [block(1, small.id, "17:00", "18:00"), block(2, small.id, "19:00", "19:30", { status: "done" })],
    changes: [{ entity_type: "task", entity_id: big.id, action: "postpone" }],
  }));
  todayResponseSchema.parse(r);
  assert.deepEqual(r.top3.map((t) => t.id), [small.id, big.id, done.id]); // importance 3, then 2, done last
  const bigCard = r.top3.find((t) => t.id === big.id)!;
  assert.equal(bigCard.needsFirstStep, true);
  assert.equal(bigCard.postponedCount, 1);
  const smallCard = r.top3.find((t) => t.id === small.id)!;
  assert.equal(smallCard.plannedMin, 60);
  assert.equal(smallCard.doneMin, 30);
  assert.deepEqual(r.progress, { done: 1, total: 3 });
});

test("goals combine applications count with logged counts", () => {
  const r = buildToday(base({ applicationsCount: 2, goalLogs: [{ goal_key: "connections", count: 4 }] }));
  assert.deepEqual(r.goals.map((g) => g.done), [2, 4, 0]);
});

test("window is the full work window; backlog excludes tasks pinned for the date", () => {
  const pinned = task(1, { top3_date: "2026-05-04" });
  const open = task(2, { estimate_min: 240 });
  const r = buildToday(base({ tasks: [pinned], backlog: [pinned, open] }));
  todayResponseSchema.parse(r);
  assert.deepEqual(r.backlog.map((t) => t.id), [open.id]);
  assert.equal(r.backlog[0].needsFirstStep, true);
  assert.equal(r.window.startAt, "2026-05-04T16:00:00.000Z");
  assert.equal(r.window.endAt, "2026-05-05T04:00:00.000Z");
});
