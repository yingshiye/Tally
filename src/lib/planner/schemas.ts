// Zod schemas: the shape of GET /api/planner/today and every mutation input.
// The server validates all input with these; the client is never trusted.
import { z } from "zod";

const isoDateTime = z.iso.datetime({ offset: true });
const localDate = z.iso.date(); // YYYY-MM-DD
const id = z.uuid();

export const importanceSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const goalKeySchema = z.string().regex(/^[a-z0-9_]{1,40}$/);
export const manualGoalKeySchema = goalKeySchema;
export const blockKindSchema = z.enum(["task", "starter", "break"]);

// ─── GET /api/planner/today response ─────────────────────────────────────────
export const taskCardSchema = z.object({
  id,
  title: z.string(),
  status: z.enum(["todo", "doing", "done", "dropped"]),
  importance: importanceSchema,
  projectId: id.nullable(),
  dueAt: isoDateTime.nullable(),
  estimateMin: z.number().int().nullable(),
  firstStep: z.string().nullable(),
  needsFirstStep: z.boolean(),
  postponedCount: z.number().int().min(0),
  plannedMin: z.number().int().min(0),
  doneMin: z.number().int().min(0),
});

export const blockSchema = z.object({
  id,
  taskId: id.nullable(),
  title: z.string(),
  startAt: isoDateTime,
  endAt: isoDateTime,
  kind: blockKindSchema,
  status: z.enum(["planned", "done", "skipped"]),
  locked: z.boolean(),
});

export const calendarEventSchema = z.object({
  id,
  title: z.string(),
  startAt: isoDateTime,
  endAt: isoDateTime,
  allDay: z.boolean(),
});

export const slotSchema = z.object({ startAt: isoDateTime, endAt: isoDateTime });

export const todayResponseSchema = z.object({
  date: localDate,
  timezone: z.string(),
  generatedAt: isoDateTime,
  /** The day's full work window (work_start to work_end). */
  window: slotSchema,
  top3: z.array(taskCardSchema),
  /** Open tasks not pinned for this date: candidates for Top 3 and for scheduling. */
  backlog: z.array(taskCardSchema),
  now: blockSchema.nullable(),
  next: blockSchema.nullable(),
  blocks: z.array(blockSchema),
  events: z.array(calendarEventSchema),
  freeSlots: z.array(slotSchema),
  capacity: z.object({
    freeMin: z.number().int(),
    plannedMin: z.number().int(),
    overloaded: z.boolean(),
  }),
  goals: z.array(z.object({
    key: goalKeySchema,
    label: z.string(),
    done: z.number().int().min(0),
    target: z.number().int().min(0),
  })),
  progress: z.object({ done: z.number().int().min(0), total: z.number().int().min(0) }),
  inboxCount: z.number().int().min(0),
});
export type TodayResponse = z.infer<typeof todayResponseSchema>;
export type TaskCard = z.infer<typeof taskCardSchema>;
export type BlockDto = z.infer<typeof blockSchema>;

export const todayQuerySchema = z.object({ date: localDate.optional() });

// ─── Mutation inputs ─────────────────────────────────────────────────────────
const title = z.string().trim().min(1).max(300);

export const emptyInputSchema = z.object({});

export const captureInputSchema = z.object({ text: z.string().trim().min(1).max(2000) });

export const triageInputSchema = z.object({
  inboxItemId: id,
  title: title.optional(),
  projectId: id.nullable().optional(),
  estimateMin: z.number().int().min(1).max(1440).nullable().optional(),
  importance: importanceSchema.optional(),
  dueAt: isoDateTime.nullable().optional(),
});

export const discardInboxInputSchema = z.object({ inboxItemId: id });

export const createTaskInputSchema = z.object({
  title,
  notes: z.string().max(5000).nullable().optional(),
  projectId: id.nullable().optional(),
  parentId: id.nullable().optional(),
  importance: importanceSchema.default(2),
  estimateMin: z.number().int().min(1).max(1440).nullable().optional(),
  dueAt: isoDateTime.nullable().optional(),
  firstStep: z.string().trim().max(500).nullable().optional(),
});

export const updateTaskInputSchema = z.object({
  taskId: id,
  title: title.optional(),
  notes: z.string().max(5000).nullable().optional(),
  projectId: id.nullable().optional(),
  importance: importanceSchema.optional(),
  estimateMin: z.number().int().min(1).max(1440).nullable().optional(),
  dueAt: isoDateTime.nullable().optional(),
});

export const taskIdInputSchema = z.object({ taskId: id });

export const setFirstStepInputSchema = z.object({
  taskId: id,
  firstStep: z.string().trim().max(500),
});

export const pinInputSchema = z.object({ taskId: id, date: localDate });
export const unpinInputSchema = z.object({ taskId: id });

export const createBlockInputSchema = z.object({
  taskId: id.nullable().optional(),
  title: title.optional(),
  startAt: isoDateTime,
  endAt: isoDateTime,
  kind: blockKindSchema.default("task"),
});

export const moveBlockInputSchema = z.object({
  blockId: id,
  startAt: isoDateTime,
  endAt: isoDateTime,
  /** Set after the user chose "pick a new time" in the third-postpone dialog. */
  confirmPostpone: z.boolean().optional(),
});

export const blockIdInputSchema = z.object({ blockId: id });
export const setBlockStatusInputSchema = z.object({ blockId: id, status: z.enum(["planned", "done", "skipped"]) });
export const setBlockLockedInputSchema = z.object({ blockId: id, locked: z.boolean() });

export const scheduleStarterInputSchema = z.object({ taskId: id, now: isoDateTime.optional() });

export const goalIncrementInputSchema = z.object({
  goalKey: manualGoalKeySchema,
  date: localDate,
  delta: z.union([z.literal(1), z.literal(-1)]).default(1),
});

export const createCalendarEventInputSchema = z.object({
  title,
  startAt: isoDateTime,
  endAt: isoDateTime,
  allDay: z.boolean().default(false),
});
export const deleteCalendarEventInputSchema = z.object({ eventId: id });

export const updatePreferencesInputSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  workStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  bufferMin: z.number().int().min(0).max(120).optional(),
  starterMin: z.number().int().min(5).max(60).optional(),
  topN: z.number().int().min(1).max(10).optional(),
  showEventTitles: z.boolean().optional(),
});

export const saveGoalsInputSchema = z.object({
  goals: z.array(z.object({
    key: goalKeySchema.optional(),
    label: z.string().trim().min(1).max(30),
    target: z.number().int().min(0).max(100),
  })).min(1).max(8),
});

// ─── Mutation results ────────────────────────────────────────────────────────
export type ActionError =
  | "unauthenticated" | "invalid_input" | "not_found" | "locked" | "overlap" | "outside_day"
  | "needs_first_step" | "limit_reached" | "task_closed" | "already_pinned"
  | "needs_choice" | "no_slot" | "db_error";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError; message?: string; data?: { postponedCount?: number } };
