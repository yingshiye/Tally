"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/planner/schemas";

const MESSAGES: Record<string, string> = {
  unauthenticated: "Your session expired. Sign in again.",
  invalid_input: "That didn't look right. Check it and try again.",
  not_found: "That item no longer exists.",
  locked: "That block is locked. Unlock it first.",
  overlap: "That overlaps another block or calendar event.",
  outside_day: "Blocks have to stay inside the day.",
  needs_first_step: "Add a first step before pinning this task.",
  limit_reached: "Your Top 3 is full. Unpin something first.",
  task_closed: "That task is already closed.",
  already_pinned: "Already in your Top 3.",
  no_slot: "No free slot in the next week.",
  db_error: "Couldn't save that. Try again.",
};

/** Runs a server action, refreshes the page data on success, and surfaces a short error message. */
export function usePlannerAction() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  const run = useCallback(async <T,>(action: Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
    const result = await action;
    if (result.ok) {
      router.refresh();
    } else if (result.error !== "needs_choice") {
      setToast(MESSAGES[result.error] ?? "Something went wrong.");
      window.setTimeout(() => setToast(null), 3500);
    }
    return result;
  }, [router]);

  return { run, toast, dismissToast: () => setToast(null) };
}
