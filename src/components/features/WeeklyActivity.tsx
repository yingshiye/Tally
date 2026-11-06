"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Tables } from "@/types/supabase";
import { Tooltip } from "@/components/ui/tooltip";
import {
  addWeeks,
  weekKey,
  weekKeyOfDateString,
  weekStart,
} from "@/lib/applications/weeks";

type Application = Tables<"applications">;

const WEEKS = 8;
const PAGE_STEP = 4;

function weekLabel(start: Date): string {
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WeeklyActivity({
  applications,
  selectedWeek,
  onSelectWeek,
}: {
  applications: Application[];
  /** Monday key (YYYY-MM-DD) of the week filtering the table, or null. */
  selectedWeek: string | null;
  onSelectWeek: (week: string | null) => void;
}) {
  // How many pages of PAGE_STEP weeks the window is shifted into the past.
  const [page, setPage] = useState(0);

  const countByWeek = useMemo(() => {
    const map = new Map<string, number>();
    for (const application of applications) {
      const key = weekKeyOfDateString(application.applied_date);
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [applications]);

  const earliestKey = useMemo(() => {
    let earliest: string | null = null;
    for (const key of countByWeek.keys()) {
      if (earliest === null || key < earliest) earliest = key;
    }
    return earliest;
  }, [countByWeek]);

  const thisWeek = weekStart(new Date());
  const lastWeek = addWeeks(thisWeek, -page * PAGE_STEP);
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addWeeks(lastWeek, -(WEEKS - 1 - i));
    const key = weekKey(start);
    return { start, key, count: countByWeek.get(key) ?? 0 };
  });

  const max = Math.max(1, ...weeks.map((week) => week.count));
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const last = weeks[weeks.length - 1];
  const canGoEarlier = earliestKey !== null && earliestKey < weeks[0].key;
  const canGoLater = page > 0;
  const currentKey = weekKey(thisWeek);

  return (
    <section
      aria-label="Applications per week"
      className="rounded-lg border border-border bg-card px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">
          Applications per week
        </h2>
        <div className="flex gap-0.5">
          <Tooltip label="Earlier weeks">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canGoEarlier}
              aria-label="Show earlier weeks"
              className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip label="Later weeks">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canGoLater}
              aria-label="Show later weeks"
              className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
        <p className="ml-auto text-xs tabular-nums text-muted-foreground">
          {total} in {page === 0 ? `the last ${WEEKS}` : "these"} weeks
        </p>
      </div>
      <ul className="mt-3 flex h-16 items-end gap-1.5" role="list">
        {weeks.map((week) => {
          const isSelected = selectedWeek === week.key;
          const highlighted =
            selectedWeek !== null ? isSelected : week.key === currentKey;
          const label = `Week of ${weekLabel(week.start)}: ${week.count}`;
          return (
            <li key={week.key} className="h-full flex-1">
              <button
                type="button"
                onClick={() => onSelectWeek(isSelected ? null : week.key)}
                aria-pressed={isSelected}
                aria-label={`${label} applications`}
                className="group relative flex h-full w-full items-end rounded-t-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background group-hover:block group-focus-visible:block`}
                >
                  {label}
                </span>
                <span
                  className={`block w-full rounded-t-sm transition-colors ${
                    highlighted
                      ? "bg-primary"
                      : "bg-primary/25 group-hover:bg-primary/50"
                  }`}
                  style={{
                    height:
                      week.count === 0
                        ? 2
                        : `${Math.max(8, (week.count / max) * 100)}%`,
                  }}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{weekLabel(weeks[0].start)}</span>
        <span className="tabular-nums">
          {page === 0
            ? `This week: ${last.count}`
            : `Week of ${weekLabel(last.start)}: ${last.count}`}
        </span>
      </div>
    </section>
  );
}
