"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dayDiff, formatUntil } from "@/lib/format/relative";
import { EditApplicationModal } from "./EditApplicationModal";
import type { Tables } from "@/types/supabase";

type Event = Tables<"events">;
type Application = Tables<"applications">;

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const STRIP_DAYS = 14;

function DayStrip({ events }: { events: Event[] }) {
  const today = new Date();
  const days = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i,
    );
    const dayEvents = events.filter(
      (event) => dayDiff(new Date(event.event_date), today) === i,
    );
    return { date, dayEvents };
  });

  return (
    <ol
      className="grid grid-cols-7 gap-1 sm:grid-cols-14"
      aria-label="Next 14 days"
    >
      {days.map(({ date, dayEvents }, i) => {
        const hasOffer = dayEvents.some((event) =>
          /offer|deadline/i.test(event.title),
        );
        return (
          <li
            key={date.toISOString()}
            title={
              dayEvents.length > 0
                ? dayEvents.map((event) => event.title).join(", ")
                : undefined
            }
            className="flex flex-col items-center gap-1 text-center"
          >
            <span className="text-[11px] text-subtle-foreground">
              {date.toLocaleDateString("en-US", { weekday: "narrow" })}
            </span>
            <span
              className={`flex size-7 items-center justify-center rounded-md text-xs tabular-nums ${
                i === 0
                  ? "bg-foreground font-medium text-background"
                  : "text-foreground"
              }`}
            >
              {date.getDate()}
            </span>
            <span
              className={`size-1.5 rounded-full ${
                dayEvents.length === 0
                  ? "bg-transparent"
                  : hasOffer
                    ? "bg-success"
                    : "bg-warning"
              }`}
              aria-hidden="true"
            />
          </li>
        );
      })}
    </ol>
  );
}

export function UpcomingPanel({
  events,
  allEvents,
  applications,
  userId,
}: {
  events: Event[];
  allEvents: Event[];
  applications: Application[];
  userId: string;
}) {
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const applicationsById = new Map(
    applications.map((application) => [application.id, application]),
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <DayStrip events={events} />
          <div className="my-1 border-t border-border" />
          {events.slice(0, 5).map((event) => {
            const isOfferRelated = /offer|deadline/i.test(event.title);
            const application = applicationsById.get(event.application_id);
            return (
              <button
                key={event.id}
                type="button"
                onClick={() =>
                  application && setSelectedApplication(application)
                }
                disabled={!application}
                aria-label={
                  application
                    ? `Open ${application.company} application for ${event.title}`
                    : undefined
                }
                className="flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-left transition-colors duration-150 hover:bg-muted/60 active:bg-muted focus-visible:bg-muted/60 disabled:cursor-default"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isOfferRelated ? "bg-success" : "bg-warning"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">
                    {event.title}
                  </span>
                  {application && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {application.company} · {application.role}
                    </span>
                  )}
                </span>
                <span
                  title={formatEventDate(event.event_date)}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
                >
                  {formatUntil(new Date(event.event_date))}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>
      {selectedApplication && (
        <EditApplicationModal
          application={selectedApplication}
          events={allEvents.filter(
            (event) => event.application_id === selectedApplication.id,
          )}
          open
          onOpenChange={(open) => !open && setSelectedApplication(null)}
          userId={userId}
        />
      )}
    </>
  );
}
