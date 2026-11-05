import type { Tables } from "@/types/supabase";

type Application = Tables<"applications">;

const WEEKS = 8;

function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() + 6) % 7; // Monday as week start
  start.setDate(start.getDate() - offset);
  return start;
}

function weekLabel(start: Date): string {
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WeeklyActivity({
  applications,
}: {
  applications: Application[];
}) {
  const thisWeek = weekStart(new Date());
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - (WEEKS - 1 - i) * 7);
    return { start, count: 0 };
  });

  for (const application of applications) {
    if (!application.applied_date) continue;
    const applied = new Date(`${application.applied_date}T00:00:00`);
    const startTime = weekStart(applied).getTime();
    const bucket = weeks.find((week) => week.start.getTime() === startTime);
    if (bucket) bucket.count += 1;
  }

  const max = Math.max(1, ...weeks.map((week) => week.count));
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const current = weeks[weeks.length - 1];

  return (
    <section
      aria-label="Applications per week"
      className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium text-foreground">
          Applications per week
        </h2>
        <p className="text-xs tabular-nums text-muted-foreground">
          {total} in the last {WEEKS} weeks
        </p>
      </div>
      <ul className="mt-3 flex h-16 items-end gap-1.5" role="list">
        {weeks.map((week, i) => {
          const isCurrent = i === weeks.length - 1;
          return (
            <li
              key={week.start.toISOString()}
              title={`Week of ${weekLabel(week.start)}: ${week.count}`}
              aria-label={`Week of ${weekLabel(week.start)}: ${week.count} applications`}
              className="flex h-full flex-1 items-end"
            >
              <div
                className={`w-full rounded-t-sm ${isCurrent ? "bg-primary" : "bg-primary/25"}`}
                style={{
                  height:
                    week.count === 0
                      ? 2
                      : `${Math.max(8, (week.count / max) * 100)}%`,
                }}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{weekLabel(weeks[0].start)}</span>
        <span className="tabular-nums">This week: {current.count}</span>
      </div>
    </section>
  );
}
