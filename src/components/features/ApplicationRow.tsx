"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  CalendarPlus,
  CalendarClock,
  FileCheck2,
  FilePlus2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatUntil } from "@/lib/format/relative";
import { EditApplicationModal } from "./EditApplicationModal";
import { AddEventModal } from "./AddEventModal";
import { AttachResumeVersionDialog } from "./AttachResumeVersionDialog";

type Application = Tables<"applications">;
type Event = Tables<"events">;

function formatDate(dateStr: string): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const date = isDateOnly ? new Date(`${dateStr}T00:00:00`) : new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const STATUS_STYLES: Record<
  Application["status"],
  { badge: string; dot: string }
> = {
  wishlist: {
    badge: "bg-muted text-muted-foreground",
    dot: "bg-subtle-foreground",
  },
  applied: { badge: "bg-info-bg text-info-text", dot: "bg-info" },
  oa: { badge: "bg-accent text-accent-foreground", dot: "bg-primary" },
  interview: { badge: "bg-warning-bg text-warning-text", dot: "bg-warning" },
  offer: { badge: "bg-success-bg text-success-text", dot: "bg-success" },
  rejected: { badge: "bg-muted text-muted-foreground", dot: "bg-danger" },
};

const PIPELINE: Application["status"][] = [
  "applied",
  "oa",
  "interview",
  "offer",
];

const STATUS_LABELS: Record<Application["status"], string> = {
  wishlist: "wishlist",
  applied: "applied",
  oa: "OA",
  interview: "interview",
  offer: "offer",
  rejected: "rejected",
};

export function ApplicationRow({
  application,
  events,
  nextEvent,
  userId,
  index = 0,
  hideCompany = false,
}: {
  index?: number;
  /** Inside a company group the header already names the company. */
  hideCompany?: boolean;
  application: Application;
  events: Event[];
  nextEvent: Event | null;
  userId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  const stageReached = PIPELINE.indexOf(application.status);
  const initials = application.company.slice(0, 2).toUpperCase();

  const now = new Date();
  const nextEventDate = nextEvent ? new Date(nextEvent.event_date) : null;
  const isEventSoon =
    nextEventDate !== null &&
    nextEventDate.getTime() - now.getTime() < 7 * 86_400_000;

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", application.id);

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
    } else {
      setDeleteOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <tr
        className="row-in group transition-colors hover:bg-muted/60"
        style={{ "--row-i": index } as React.CSSProperties}
      >
        {/* Company / Role */}
        <td className={
          hideCompany
            ? "relative py-3 pl-8 pr-3 before:absolute before:inset-y-0 before:left-5 before:border-l before:border-foreground/20 sm:pl-14 sm:pr-4 sm:before:left-6"
            : "px-3 py-3 sm:px-4"
        }>
          <div className="flex min-w-0 items-start gap-3">
            {!hideCompany && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              {hideCompany ? (
                <p
                  className="break-words text-sm font-medium text-foreground"
                  title={application.role}
                >
                  {application.role}
                </p>
              ) : (
                <>
                  <p className="truncate text-sm font-medium text-foreground">
                    {application.company}
                  </p>
                  <p
                    className="mt-0.5 break-words text-xs text-muted-foreground"
                    title={application.role}
                  >
                    {application.role}
                  </p>
                </>
              )}
              <p className="mt-1 text-xs text-subtle-foreground lg:hidden">
                {application.applied_date
                  ? formatDate(application.applied_date)
                  : "—"}
                {nextEventDate && nextEvent
                  ? ` · ${nextEvent.title} ${formatDate(nextEventDate.toISOString())}`
                  : ""}
              </p>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-2 py-3 sm:px-3">
          <div
            className="flex flex-col gap-1.5"
            role="img"
            aria-label={`Status: ${STATUS_LABELS[application.status]}`}
          >
            <div className="flex items-center gap-1" aria-hidden="true">
              {PIPELINE.map((stage, stageIndex) => (
                <span
                  key={stage}
                  className={`size-2 rounded-full ${
                    stageIndex <= stageReached
                      ? STATUS_STYLES[application.status].dot
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                application.status === "wishlist" ||
                application.status === "rejected"
                  ? "text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {application.status === "rejected" && (
                <span
                  className="size-1.5 rounded-full bg-danger"
                  aria-hidden="true"
                />
              )}
              {STATUS_LABELS[application.status]}
            </span>
          </div>
        </td>

        {/* Applied */}
        <td className="hidden px-3 py-3 lg:table-cell">
          <p className="text-[13px] text-muted-foreground">
            {application.applied_date
              ? formatDate(application.applied_date)
              : "—"}
          </p>
        </td>

        {/* Next event */}
        <td className="hidden px-3 py-3 lg:table-cell">
          {nextEventDate && nextEvent ? (
            <div className="flex min-w-0 flex-col items-start gap-1">
              <span
                title={formatDate(nextEventDate.toISOString())}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isEventSoon
                    ? "bg-warning-bg text-warning-text"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CalendarClock className="size-3" aria-hidden="true" />
                {formatUntil(nextEventDate, now)}
              </span>
              <p className="max-w-full truncate text-xs text-muted-foreground">
                {nextEvent.title}
              </p>
            </div>
          ) : (
            <span
              className="text-[13px] text-subtle-foreground"
              aria-label="No next step"
            >
              —
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-2 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-end gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Tooltip label="Edit application">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                aria-label={`Edit ${application.company} application`}
                className="rounded-md p-1.5 text-muted-foreground transition-[color,background-color,transform] duration-150 active:scale-90 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip
              label={
                application.submitted_resume_version_id
                  ? "Change attached resume"
                  : "Attach submitted resume"
              }
            >
              <button
                type="button"
                onClick={() => setResumeOpen(true)}
                aria-label={
                  application.submitted_resume_version_id
                    ? `Change attached resume for ${application.company}`
                    : `Attach submitted resume to ${application.company}`
                }
                className={`rounded-md p-1.5 transition-[color,background-color,transform] duration-150 active:scale-90 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  application.submitted_resume_version_id
                    ? "text-success-text hover:text-success-text"
                    : "text-muted-foreground hover:text-accent-foreground"
                }`}
              >
                {application.submitted_resume_version_id ? (
                  <FileCheck2 className="h-3.5 w-3.5" />
                ) : (
                  <FilePlus2 className="h-3.5 w-3.5" />
                )}
              </button>
            </Tooltip>
            <Tooltip label="Add event">
              <button
                type="button"
                onClick={() => setAddEventOpen(true)}
                aria-label={`Add event for ${application.company}`}
                className="rounded-md p-1.5 text-muted-foreground transition-[color,background-color,transform] duration-150 active:scale-90 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip label="Delete application permanently">
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
                aria-label={`Delete ${application.company} application permanently`}
                className="rounded-md p-1.5 text-muted-foreground transition-[color,background-color,transform] duration-150 active:scale-90 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </td>
      </tr>

      {editOpen && (
        <EditApplicationModal
          application={application}
          events={events.filter(
            (event) => event.application_id === application.id,
          )}
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={userId}
        />
      )}

      <AddEventModal
        application={application}
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        userId={userId}
      />

      {resumeOpen && (
        <AttachResumeVersionDialog
          application={application}
          open={resumeOpen}
          onOpenChange={setResumeOpen}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!next) setDeleteError(null);
          setDeleteOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              Delete application?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              {application.company} — {application.role}
            </span>{" "}
            and all its events. This cannot be undone.
          </p>
          {deleteError && (
            <p className="text-sm text-danger-text">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
