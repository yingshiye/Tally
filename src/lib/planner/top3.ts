// Rules for pinning a task as a top priority. Pure; the server passes the data in.

export const BIG_TASK_MIN = 120;

type PinTask = {
  id: string;
  status: string;
  estimate_min: number | null;
  first_step: string | null;
  top3_date?: string | null;
};

/** A task over 120 minutes with no first step has no clear way to start. */
export function needsFirstStep(task: Pick<PinTask, "estimate_min" | "first_step">): boolean {
  return (task.estimate_min ?? 0) > BIG_TASK_MIN && !(task.first_step ?? "").trim();
}

export type PinCheck =
  | { ok: true }
  | { ok: false; reason: "needs_first_step" | "limit_reached" | "task_closed" | "already_pinned" };

/** Can this task be pinned for a local date, given who is already pinned that day? */
export function validatePin(input: {
  task: PinTask;
  pinnedTaskIds: string[];
  topN: number;
}): PinCheck {
  const { task, pinnedTaskIds, topN } = input;
  if (task.status === "done" || task.status === "dropped") return { ok: false, reason: "task_closed" };
  if (pinnedTaskIds.includes(task.id)) return { ok: false, reason: "already_pinned" };
  if (needsFirstStep(task)) return { ok: false, reason: "needs_first_step" };
  if (pinnedTaskIds.length >= topN) return { ok: false, reason: "limit_reached" };
  return { ok: true };
}
