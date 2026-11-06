import type { Interval } from "./types";

const MIN = 60_000;

export type Capacity = { freeMin: number; plannedMin: number; overloaded: boolean };

export function totalMinutes(intervals: Interval[]): number {
  return Math.round(intervals.reduce((sum, i) => sum + (i.end.getTime() - i.start.getTime()), 0) / MIN);
}

/** Minutes of planned (not skipped) blocks that fall inside the window. Breaks do not count as work. */
export function plannedMinutes(
  blocks: (Interval & { kind: string; status: string })[],
  window: Interval,
): number {
  let ms = 0;
  for (const b of blocks) {
    if (b.status === "skipped" || b.kind === "break") continue;
    const s = Math.max(b.start.getTime(), window.start.getTime());
    const e = Math.min(b.end.getTime(), window.end.getTime());
    if (e > s) ms += e - s;
  }
  return Math.round(ms / MIN);
}

/**
 * Free vs planned minutes. Overloaded means more is planned than there is room for.
 * Pass free slots computed from calendar events only (not from task blocks),
 * otherwise planned work would be subtracted from capacity twice.
 */
export function computeCapacity(freeSlots: Interval[], plannedMin: number): Capacity {
  const freeMin = totalMinutes(freeSlots);
  return { freeMin, plannedMin, overloaded: plannedMin > freeMin };
}
