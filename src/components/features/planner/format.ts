// Display helpers. All times are shown in the user's planner time zone, never the browser's.
export function fmtTime(iso: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .replace(":00", "")
    .toLowerCase()
    .replace(" ", "");
}

export function fmtDateLong(localDate: string): string {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
}

export function minutesBetween(a: string | Date, b: string | Date): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

/** "today", "tomorrow", "in 3 days", "2 days ago" for a due instant, in the planner zone. */
export function dueLabel(dueIso: string, todayLocal: string, tz: string): { text: string; tone: "danger" | "warning" | "muted" } {
  const dueLocal = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(dueIso));
  const days = Math.round((Date.parse(dueLocal) - Date.parse(todayLocal)) / 86_400_000);
  if (days < 0) return { text: days === -1 ? "yesterday" : `${-days} days ago`, tone: "danger" };
  if (days === 0) return { text: "today", tone: "warning" };
  if (days === 1) return { text: "tomorrow", tone: "warning" };
  return { text: days <= 7 ? `in ${days} days` : dueLocal.slice(5).replace("-", "/"), tone: days <= 7 ? "warning" : "muted" };
}
