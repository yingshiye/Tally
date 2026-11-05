const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/** Whole calendar days from `now` to `date` (negative when in the past). */
export function dayDiff(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

/** "today", "tomorrow", "in 5 days" — for upcoming events. */
export function formatUntil(date: Date, now: Date = new Date()): string {
  const diff = dayDiff(date, now);
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}

/** "today", "yesterday", "3d ago", "2w ago", "4mo ago" — for past moments. */
export function formatAgo(date: Date, now: Date = new Date()): string {
  const days = Math.max(0, -dayDiff(date, now));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
