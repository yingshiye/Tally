"use client";

import { useMemo, useState } from "react";
import { Check, ExternalLink, Flag, StickyNote } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  NEETCODE_150,
  NEETCODE_TOTAL,
  problemUrl,
  type NeetCodeDifficulty,
} from "@/lib/prep/neetcode150";
import { cn } from "@/lib/utils";

type ProblemStatus = "not_started" | "review" | "completed";

type InitialProgress = {
  task_id: string;
  status: ProblemStatus;
  notes: string | null;
};

const DIFFICULTY_STYLES: Record<NeetCodeDifficulty, string> = {
  Easy: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
  Medium: "border-amber-500/40 bg-amber-500/5 text-amber-600",
  Hard: "border-red-500/40 bg-red-500/5 text-red-600",
};

export function NeetCode150Tracker({
  userId,
  initialProgress,
}: {
  userId: string;
  initialProgress: InitialProgress[];
}) {
  const [progress, setProgress] = useState<Record<string, ProblemStatus>>(() =>
    Object.fromEntries(initialProgress.map((item) => [item.task_id, item.status])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialProgress.filter((item) => item.notes).map((item) => [item.task_id, item.notes!])),
  );
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideSolved, setHideSolved] = useState(false);

  const completedCount = useMemo(
    () => Object.values(progress).filter((status) => status === "completed").length,
    [progress],
  );
  const reviewCount = useMemo(
    () => Object.values(progress).filter((status) => status === "review").length,
    [progress],
  );
  const completionPercent = Math.round((completedCount / NEETCODE_TOTAL) * 100);

  async function setStatus(problemId: string, nextStatus: ProblemStatus) {
    const previousStatus = progress[problemId] ?? "not_started";
    setProgress((current) => ({ ...current, [problemId]: nextStatus }));
    setSavingId(problemId);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: saveError } = await supabase.from("study_task_progress").upsert(
      {
        user_id: userId,
        task_id: problemId,
        status: nextStatus,
        completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,task_id" },
    );

    if (saveError) {
      setProgress((current) => ({ ...current, [problemId]: previousStatus }));
      setError("Progress could not be saved. Apply the latest Supabase migration and try again.");
    }
    setSavingId((current) => (current === problemId ? null : current));
  }

  function toggleSolved(problemId: string) {
    const current = progress[problemId] ?? "not_started";
    setStatus(problemId, current === "completed" ? "not_started" : "completed");
  }

  function toggleReview(problemId: string) {
    const current = progress[problemId] ?? "not_started";
    setStatus(problemId, current === "review" ? "not_started" : "review");
  }

  async function saveNote(problemId: string, value: string) {
    setSavingId(problemId);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: saveError } = await supabase.from("study_task_progress").upsert(
      {
        user_id: userId,
        task_id: problemId,
        notes: value.trim() === "" ? null : value,
      },
      { onConflict: "user_id,task_id" },
    );

    if (saveError) {
      setError("Note could not be saved. Apply the latest Supabase migration and try again.");
    }
    setSavingId((current) => (current === problemId ? null : current));
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="NeetCode 150 progress" className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-3">
          <div className="border-r border-border p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">Solved</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {completedCount}<span className="text-sm font-normal text-muted-foreground"> / {NEETCODE_TOTAL}</span>
            </p>
          </div>
          <div className="border-r border-border p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">Flagged for review</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{reviewCount}</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">Complete</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{completionPercent}%</p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={hideSolved}
            onChange={(event) => setHideSolved(event.target.checked)}
            className="size-3.5 rounded border-border"
          />
          Hide solved
        </label>
      </div>

      <div className="flex flex-col gap-4">
        {NEETCODE_150.map((category) => {
          const categoryCompleted = category.problems.filter(
            (problem) => progress[problem.id] === "completed",
          ).length;
          const visibleProblems = hideSolved
            ? category.problems.filter((problem) => progress[problem.id] !== "completed")
            : category.problems;

          if (hideSolved && visibleProblems.length === 0) return null;

          return (
            <section
              key={category.name}
              className="overflow-hidden rounded-lg border border-border bg-card"
              aria-labelledby={`category-${category.name}`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h3 id={`category-${category.name}`} className="text-sm font-semibold">{category.name}</h3>
                <span className="text-xs text-muted-foreground">{categoryCompleted}/{category.problems.length}</span>
              </div>
              <ul className="divide-y divide-border">
                {visibleProblems.map((problem) => {
                  const status = progress[problem.id] ?? "not_started";
                  const isCompleted = status === "completed";
                  const isReview = status === "review";
                  const noteValue = notes[problem.id] ?? "";
                  const hasNote = noteValue.trim() !== "";
                  const isNoteOpen = openNoteId === problem.id;
                  return (
                    <li key={problem.id} className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSolved(problem.id)}
                          disabled={savingId === problem.id}
                          aria-pressed={isCompleted}
                          aria-label={isCompleted ? `Mark ${problem.title} as not solved` : `Mark ${problem.title} as solved`}
                          title={isCompleted ? "Mark as not solved" : "Mark as solved"}
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-60",
                            isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent hover:border-foreground/40",
                          )}
                        >
                          <Check className="size-3.5" />
                        </button>

                        <a
                          href={problemUrl(problem.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-medium hover:underline",
                            isCompleted ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {problem.title}
                        </a>

                        {problem.premium && (
                          <span className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
                            Premium
                          </span>
                        )}

                        <span className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          DIFFICULTY_STYLES[problem.difficulty],
                        )}>
                          {problem.difficulty}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleReview(problem.id)}
                          disabled={savingId === problem.id}
                          aria-pressed={isReview}
                          aria-label={isReview ? `Unflag ${problem.title} for review` : `Flag ${problem.title} for review`}
                          title={isReview ? "Unflag for review" : "Flag for review"}
                          className={cn(
                            "shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60",
                            isReview && "text-amber-500",
                          )}
                        >
                          <Flag className="size-3.5" fill={isReview ? "currentColor" : "none"} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setOpenNoteId(isNoteOpen ? null : problem.id)}
                          aria-pressed={isNoteOpen}
                          aria-label={isNoteOpen ? `Hide note for ${problem.title}` : `${hasNote ? "Edit" : "Add"} note for ${problem.title}`}
                          title={isNoteOpen ? "Hide note" : hasNote ? "Edit note" : "Add note"}
                          className={cn(
                            "shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground",
                            (hasNote || isNoteOpen) && "text-sky-500",
                          )}
                        >
                          <StickyNote className="size-3.5" fill={hasNote ? "currentColor" : "none"} />
                        </button>

                        <a
                          href={problemUrl(problem.slug)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${problem.title} on LeetCode`}
                          title="Open on LeetCode"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>

                      {isNoteOpen && (
                        <div className="mt-2 pl-8">
                          <label className="sr-only" htmlFor={`note-${problem.id}`}>Note for {problem.title}</label>
                          <textarea
                            id={`note-${problem.id}`}
                            value={noteValue}
                            onChange={(event) => setNotes((current) => ({ ...current, [problem.id]: event.target.value }))}
                            onBlur={(event) => saveNote(problem.id, event.target.value)}
                            placeholder="Approach, complexity, mistakes to remember…"
                            rows={3}
                            className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-5 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
