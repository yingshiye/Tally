// Postponements are derived from the planner_changes log, never stored as a counter.

export type ChangeRecord = {
  entity_type: string;
  entity_id: string;
  action: string;
  before?: unknown;
  after?: unknown;
};

function taskIdOf(snapshot: unknown): string | null {
  if (snapshot && typeof snapshot === "object" && "task_id" in snapshot) {
    const id = (snapshot as { task_id: unknown }).task_id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

/**
 * How many times a task was postponed: 'postpone' entries on the task itself,
 * plus 'postpone' entries on its blocks (the block's snapshot carries task_id).
 */
export function countPostponements(taskId: string, changes: ChangeRecord[]): number {
  let n = 0;
  for (const c of changes) {
    if (c.action !== "postpone") continue;
    if (c.entity_type === "task" && c.entity_id === taskId) n++;
    else if (c.entity_type === "block" && (taskIdOf(c.after) ?? taskIdOf(c.before)) === taskId) n++;
  }
  return n;
}

/** The third postpone opens a choice (shrink / split / new time / drop) instead of silently moving. */
export function postponeNeedsChoice(priorPostponements: number): boolean {
  return priorPostponements >= 2;
}
