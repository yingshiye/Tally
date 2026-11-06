// Time-zone helpers. Everything is stored in UTC; "today" is always computed
// in the user's time zone. No clock access: callers pass instants in.
import type { Interval } from "./types";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function wallParts(instant: Date, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of the zone from UTC at this instant, in ms (negative west of Greenwich). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = wallParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localDateOf(instant: Date, timeZone: string): string {
  const p = wallParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Add whole days to a YYYY-MM-DD date (calendar arithmetic, DST-proof). */
export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Day of week of a local date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(localDate: string): number {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * The UTC instant at which the wall clock in `timeZone` reads `localDate` + `time` ("HH:MM").
 * A time skipped by spring-forward resolves to the instant after the gap;
 * a time repeated by fall-back resolves to its first occurrence.
 */
export function zonedToUtc(localDate: string, time: string, timeZone: string): Date {
  const [y, m, d] = localDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const candidates = [...new Set([wall - offsetMs(new Date(wall), timeZone), wall - offsetMs(new Date(wall - 86_400_000), timeZone), wall - offsetMs(new Date(wall + 86_400_000), timeZone)])];
  const valid = candidates.filter((c) => c + offsetMs(new Date(c), timeZone) === wall);
  const pick = valid.length ? Math.min(...valid) : Math.max(...candidates);
  return new Date(pick);
}

/** Midnight-to-midnight bounds of a local date. 23 h on spring-forward day, 25 h on fall-back day. */
export function dayBounds(localDate: string, timeZone: string): Interval {
  return {
    start: zonedToUtc(localDate, "00:00", timeZone),
    end: zonedToUtc(addDays(localDate, 1), "00:00", timeZone),
  };
}

/** The work window of a local date, e.g. 09:00–21:00 local. */
export function workWindow(localDate: string, workStart: string, workEnd: string, timeZone: string): Interval {
  return {
    start: zonedToUtc(localDate, workStart, timeZone),
    end: zonedToUtc(localDate, workEnd, timeZone),
  };
}
