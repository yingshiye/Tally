import { localDateStamp } from "@/lib/date";

/** Monday 00:00 (local) of the week containing `date`. */
export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

/** Stable key for a week: the local YYYY-MM-DD of its Monday. */
export function weekKey(date: Date): string {
  return localDateStamp(weekStart(date));
}

/** Week key for a date-only string like "2026-11-02", or null if unparseable. */
export function weekKeyOfDateString(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : weekKey(d);
}

/** The Monday `n` weeks after (or before, if negative) the given week start. */
export function addWeeks(start: Date, n: number): Date {
  const next = new Date(start);
  next.setDate(next.getDate() + n * 7);
  return next;
}
