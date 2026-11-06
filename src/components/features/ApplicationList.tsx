"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Inbox,
  SearchX,
} from "lucide-react";
import type { Tables } from "@/types/supabase";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getNextEvent } from "@/lib/applications/next-event";
import { normalizeCompany } from "@/lib/applications/duplicates";
import { ApplicationRow } from "./ApplicationRow";

type Application = Tables<"applications">;
type Event = Tables<"events">;
type StatusFilter = Application["status"] | "all";
type SortColumn = "company" | "status" | "applied_date" | "next_step";
type SortDirection = "asc" | "desc";

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Wishlist", value: "wishlist" },
  { label: "Applied", value: "applied" },
  { label: "OA", value: "oa" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_ORDER: Record<Application["status"], number> = {
  wishlist: 0,
  applied: 1,
  oa: 2,
  interview: 3,
  offer: 4,
  rejected: 5,
};

const COLUMNS: { key: SortColumn; label: string; className: string }[] = [
  { key: "company", label: "Company / Role", className: "px-3 py-2.5 sm:px-4" },
  {
    key: "status",
    label: "Status",
    className: "w-[84px] px-2 py-2.5 sm:w-[120px] sm:px-3",
  },
  {
    key: "applied_date",
    label: "Applied",
    className: "hidden w-[110px] px-3 py-2.5 lg:table-cell",
  },
  {
    key: "next_step",
    label: "Next step",
    className: "hidden w-[190px] px-3 py-2.5 lg:table-cell",
  },
];

export function ApplicationList({
  applications,
  events,
  userId,
}: {
  applications: Application[];
  events: Event[];
  userId: string;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("applied_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const nextEventByAppId = useMemo(() => {
    const now = new Date();
    const map = new Map<string, Event | null>();
    for (const app of applications) {
      map.set(app.id, getNextEvent(app.id, events, now));
    }
    return map;
  }, [applications, events]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (
        term &&
        !a.company.toLowerCase().includes(term) &&
        !a.role.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [applications, filter, search]);

  const sorted = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case "company": {
          return (
            (a.company.localeCompare(b.company) ||
              a.role.localeCompare(b.role)) * dir
          );
        }
        case "status":
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
        case "applied_date": {
          if (!a.applied_date && !b.applied_date) return 0;
          if (!a.applied_date) return 1;
          if (!b.applied_date) return -1;
          return (
            (new Date(a.applied_date).getTime() -
              new Date(b.applied_date).getTime()) *
            dir
          );
        }
        case "next_step": {
          const ea = nextEventByAppId.get(a.id);
          const eb = nextEventByAppId.get(b.id);
          if (!ea && !eb) return 0;
          if (!ea) return 1;
          if (!eb) return -1;
          return (
            (new Date(ea.event_date).getTime() -
              new Date(eb.event_date).getTime()) *
            dir
          );
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortColumn, sortDirection, nextEventByAppId]);

  // Groups keep the order in which each company first appears in `sorted`.
  const groups = useMemo(() => {
    const byKey = new Map<string, Application[]>();
    for (const app of sorted) {
      const key = normalizeCompany(app.company) || app.id;
      const list = byKey.get(key);
      if (list) list.push(app);
      else byKey.set(key, [app]);
    }
    return [...byKey.entries()].map(([key, apps]) => ({ key, apps }));
  }, [sorted]);

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  return (
    <TooltipProvider>
      <section
        className="overflow-clip rounded-lg border border-border bg-card"
        aria-labelledby="applications-table-title"
      >
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="applications-table-title"
              className="text-sm font-semibold text-foreground"
            >
              Applications
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sorted.length}{" "}
              {sorted.length === 1 ? "application" : "applications"}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or role…"
              aria-label="Search applications by company or role"
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[200px]"
            />
            <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={grouped}
                onChange={(e) => setGrouped(e.target.checked)}
                className="size-3.5 accent-foreground"
              />
              Group by company
            </label>
            <div
              className="scrollbar-visible flex gap-1 overflow-x-auto pb-1 sm:pb-0"
              role="group"
              aria-label="Filter applications by status"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  aria-pressed={filter === f.value}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-[color,background-color,transform] duration-150 active:scale-95 ${
                    filter === f.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
                {COLUMNS.map((col) => {
                  const isActive = sortColumn === col.key;
                  const ariaSort = isActive
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                  return (
                    <th
                      key={col.key}
                      className={`${col.className} font-medium`}
                      aria-sort={ariaSort}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 whitespace-nowrap rounded-sm text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {col.label}
                        {isActive ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown
                            className="h-3 w-3 opacity-40"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </th>
                  );
                })}
                <th className="w-[76px] px-2 py-2.5 text-right font-medium sm:w-[144px] sm:px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {applications.length === 0 ? (
                          <Inbox className="size-5" aria-hidden="true" />
                        ) : (
                          <SearchX className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {applications.length === 0
                          ? "No applications yet"
                          : "No matching applications"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {applications.length === 0
                          ? 'Use "Add application" at the top of the page to log your first one.'
                          : "Try a different search or status filter."}
                      </p>
                      {applications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                          }}
                          className="mt-3 rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-95"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const renderRow = (
                    app: Application,
                    index: number,
                    hideCompany = false,
                  ) => (
                    <ApplicationRow
                      key={app.id}
                      index={index}
                      application={app}
                      events={events}
                      nextEvent={nextEventByAppId.get(app.id) ?? null}
                      userId={userId}
                      hideCompany={hideCompany}
                    />
                  );
                  if (!grouped) {
                    return sorted.map((app, i) => renderRow(app, i));
                  }
                  let rowIndex = 0;
                  return groups.flatMap(({ key, apps }) => {
                    const isOpen = !collapsed.has(key);
                    const counts = new Map<Application["status"], number>();
                    for (const a of apps) {
                      counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
                    }
                    const summary = [...counts.entries()]
                      .sort((x, y) => STATUS_ORDER[x[0]] - STATUS_ORDER[y[0]])
                      .map(([status, n]) => `${n} ${status === "oa" ? "OA" : status}`)
                      .join(" · ");
                    return [
                      <tr key={`group-${key}`} className="border-t border-foreground/20 bg-muted first:border-t-0">
                        {/* Narrow screens only render 3 columns; a colSpan past
                            the real column count would steal width from the rows. */}
                        <td colSpan={3} className="p-0 lg:hidden">
                          <button
                            type="button"
                            onClick={() => toggleGroup(key)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5 sm:px-4"
                          >
                            <ChevronRight
                              className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
                                isOpen ? "rotate-90" : ""
                              }`}
                              aria-hidden="true"
                            />
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-[11px] font-semibold text-muted-foreground">
                              {apps[0].company.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate text-[15px] font-medium text-foreground">
                              {apps[0].company}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {apps.length} {apps.length === 1 ? "role" : "roles"}
                            </span>
                            <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:inline">
                              {summary}
                            </span>
                          </button>
                        </td>
                        <td colSpan={5} className="hidden p-0 lg:table-cell">
                          <button
                            type="button"
                            onClick={() => toggleGroup(key)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-2.5 sm:px-4"
                          >
                            <ChevronRight
                              className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
                                isOpen ? "rotate-90" : ""
                              }`}
                              aria-hidden="true"
                            />
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-[11px] font-semibold text-muted-foreground">
                              {apps[0].company.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate text-[15px] font-medium text-foreground">
                              {apps[0].company}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {apps.length} {apps.length === 1 ? "role" : "roles"}
                            </span>
                            <span className="ml-auto hidden truncate text-xs text-muted-foreground sm:inline">
                              {summary}
                            </span>
                          </button>
                        </td>
                      </tr>,
                      ...(isOpen
                        ? apps.map((app) => renderRow(app, rowIndex++, true))
                        : []),
                    ];
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
      </section>
    </TooltipProvider>
  );
}
