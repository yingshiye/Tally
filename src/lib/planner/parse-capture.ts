// Deterministic quick-capture syntax. No LLM.
//   30m / 90m / 2h / 1.5h / 1h30m  -> estimate
//   ! / !! / !!!                    -> importance 1 / 2 / 3
//   #name                           -> project hint
//   @today @tomorrow @fri @11/20    -> due date (end of that local day)
// Everything else is the title. Tokens that don't parse stay in the title.
import { addDays, localDateOf, weekdayOf, zonedToUtc } from "./time";

export type ParsedCapture = {
  title: string;
  estimateMin: number | null;
  importance: 1 | 2 | 3 | null;
  projectHint: string | null;
  /** Local due date, YYYY-MM-DD. */
  dueDate: string | null;
  /** End of the due date (23:59 local) as a UTC instant. */
  dueAt: Date | null;
};

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
};

export function parseDuration(token: string): number | null {
  const t = token.toLowerCase();
  let m = /^(\d+)m$/.exec(t);
  if (m) return Number(m[1]) || null;
  m = /^(\d+(?:\.\d+)?)h$/.exec(t);
  if (m) return Math.round(Number(m[1]) * 60) || null;
  m = /^(\d+)h(\d{1,2})m$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]) || null;
  return null;
}

function validMonthDay(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Resolve an @-token to a local date. A weekday means its next occurrence after today (same weekday = a week away). */
export function resolveDueToken(word: string, today: string): string | null {
  const w = word.toLowerCase();
  if (w === "today") return today;
  if (w === "tomorrow" || w === "tmr") return addDays(today, 1);
  if (w in WEEKDAYS) {
    const diff = (WEEKDAYS[w] - weekdayOf(today) + 7) % 7 || 7;
    return addDays(today, diff);
  }
  const md = /^(\d{1,2})\/(\d{1,2})$/.exec(w);
  if (md) {
    const month = Number(md[1]);
    const day = Number(md[2]);
    const year = Number(today.slice(0, 4));
    for (const y of [year, year + 1]) {
      if (!validMonthDay(y, month, day)) continue;
      const candidate = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (candidate >= today) return candidate; // past dates roll to next year
    }
  }
  return null;
}

export function parseCapture(raw: string, ctx: { now: Date; timezone: string }): ParsedCapture {
  const today = localDateOf(ctx.now, ctx.timezone);
  const result: ParsedCapture = {
    title: "", estimateMin: null, importance: null, projectHint: null, dueDate: null, dueAt: null,
  };
  const rest: string[] = [];

  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    if (result.importance === null && /^!{1,3}$/.test(token)) {
      result.importance = token.length as 1 | 2 | 3;
      continue;
    }
    if (result.projectHint === null && /^#[\p{L}\p{N}_-]+$/u.test(token)) {
      result.projectHint = token.slice(1);
      continue;
    }
    if (result.dueDate === null && token.startsWith("@")) {
      const due = resolveDueToken(token.slice(1), today);
      if (due) {
        result.dueDate = due;
        result.dueAt = zonedToUtc(due, "23:59", ctx.timezone);
        continue;
      }
    }
    if (result.estimateMin === null) {
      const mins = parseDuration(token);
      if (mins) {
        result.estimateMin = mins;
        continue;
      }
    }
    rest.push(token);
  }

  // If nothing is left (e.g. the input was only "30m"), keep the raw text as the title.
  result.title = rest.length ? rest.join(" ") : raw.trim();
  return result;
}
