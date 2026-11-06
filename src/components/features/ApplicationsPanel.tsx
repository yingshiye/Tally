"use client";

import { useState } from "react";
import type { Tables } from "@/types/supabase";
import { WeeklyActivity } from "./WeeklyActivity";
import { ApplicationList } from "./ApplicationList";

/** Holds the week picked in the chart so it can filter the table below it. */
export function ApplicationsPanel({
  applications,
  events,
  userId,
}: {
  applications: Tables<"applications">[];
  events: Tables<"events">[];
  userId: string;
}) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  return (
    <>
      <WeeklyActivity
        applications={applications}
        selectedWeek={selectedWeek}
        onSelectWeek={setSelectedWeek}
      />
      <ApplicationList
        applications={applications}
        events={events}
        userId={userId}
        weekFilter={selectedWeek}
        onClearWeek={() => setSelectedWeek(null)}
      />
    </>
  );
}
