import type { Interval } from "./types";

const MIN = 60_000;

export type FreeSlotsInput = {
  dayStart: Date;
  dayEnd: Date;
  busy: Interval[];
  bufferMin: number;
  minSlotMin: number;
};

/**
 * Free time inside [dayStart, dayEnd): busy intervals are padded by the buffer,
 * merged, clipped to the window, subtracted, and gaps shorter than minSlotMin dropped.
 * An all-day event is just a busy interval covering the whole window.
 */
export function computeFreeSlots({ dayStart, dayEnd, busy, bufferMin, minSlotMin }: FreeSlotsInput): Interval[] {
  const lo = dayStart.getTime();
  const hi = dayEnd.getTime();
  if (hi <= lo) return [];
  const pad = bufferMin * MIN;

  const padded = busy
    .filter((b) => b.end.getTime() > b.start.getTime())
    .map((b) => ({ s: b.start.getTime() - pad, e: b.end.getTime() + pad }))
    .filter((b) => b.e > lo && b.s < hi)
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const merged: { s: number; e: number }[] = [];
  for (const b of padded) {
    const last = merged[merged.length - 1];
    if (last && b.s <= last.e) last.e = Math.max(last.e, b.e);
    else merged.push({ ...b });
  }

  const slots: Interval[] = [];
  let cursor = lo;
  for (const b of merged) {
    if (b.s > cursor) slots.push({ start: new Date(cursor), end: new Date(Math.min(b.s, hi)) });
    cursor = Math.max(cursor, b.e);
  }
  if (cursor < hi) slots.push({ start: new Date(cursor), end: new Date(hi) });

  return slots.filter((s) => (s.end.getTime() - s.start.getTime()) / MIN >= minSlotMin);
}

/** Free slots with planned blocks cut out, for display (capacity itself uses event-only slots). */
export function freeAroundBlocks(slots: Interval[], blocks: (Interval & { status: string })[], minSlotMin: number): Interval[] {
  const busy = blocks.filter((b) => b.status !== "skipped");
  return slots.flatMap((s) => computeFreeSlots({ dayStart: s.start, dayEnd: s.end, busy, bufferMin: 0, minSlotMin }));
}
