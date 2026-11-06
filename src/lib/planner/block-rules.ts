// Rules for placing a block on the day. Pure: the server passes in the facts.
import type { Interval } from "./types";

export const GRID_MIN = 15;
const MIN = 60_000;

/** Snap an instant to the nearest 15-minute mark. */
export function snapToGrid(instant: Date, gridMin = GRID_MIN): Date {
  const g = gridMin * MIN;
  return new Date(Math.round(instant.getTime() / g) * g);
}

export type BlockLike = Interval & { id: string; status: string };

export type PlacementCheck =
  | { ok: true; start: Date; end: Date }
  | { ok: false; error: "invalid_range" | "outside_day" | "overlap_event" | "overlap_block" };

const overlaps = (a: Interval, b: Interval) =>
  a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();

/**
 * Validate a block position: snap to 15 min, stay inside the local day,
 * never overlap a (timed) calendar event or another active block.
 * Skipped blocks and all-day events (pass them out of `events`) do not block placement.
 * Ends at least one grid step after the start.
 */
export function checkPlacement(input: {
  start: Date;
  end: Date;
  day: Interval;
  events: Interval[];
  blocks: BlockLike[];
  ignoreBlockId?: string;
}): PlacementCheck {
  const start = snapToGrid(input.start);
  let end = snapToGrid(input.end);
  if (end.getTime() - start.getTime() < GRID_MIN * MIN) end = new Date(start.getTime() + GRID_MIN * MIN);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ok: false, error: "invalid_range" };
  if (start < input.day.start || end > input.day.end) return { ok: false, error: "outside_day" };

  const range = { start, end };
  if (input.events.some((e) => overlaps(range, e))) return { ok: false, error: "overlap_event" };
  const clash = input.blocks.some(
    (b) => b.id !== input.ignoreBlockId && b.status !== "skipped" && overlaps(range, b),
  );
  if (clash) return { ok: false, error: "overlap_block" };
  return { ok: true, start, end };
}

/** First gap (on the 15-minute grid) at or after `from` where `durationMin` fits inside a free slot and clear of blocks. */
export function findStarterSlot(input: {
  freeSlots: Interval[];
  blocks: BlockLike[];
  from: Date;
  durationMin: number;
}): Interval | null {
  const dur = input.durationMin * MIN;
  const active = input.blocks.filter((b) => b.status !== "skipped");
  for (const slot of [...input.freeSlots].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    let t = Math.max(slot.start.getTime(), input.from.getTime());
    t = Math.ceil(t / (GRID_MIN * MIN)) * GRID_MIN * MIN;
    while (t + dur <= slot.end.getTime()) {
      const candidate = { start: new Date(t), end: new Date(t + dur) };
      const hit = active.find((b) => overlaps(candidate, b));
      if (!hit) return candidate;
      t = Math.ceil(hit.end.getTime() / (GRID_MIN * MIN)) * GRID_MIN * MIN;
    }
  }
  return null;
}
