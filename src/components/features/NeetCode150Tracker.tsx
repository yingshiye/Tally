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

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

const DIFFICULTIES: { level: NeetCodeDifficulty; fill: string }[] = [
  { level: "Easy", fill: "bg-success" },
  { level: "Medium", fill: "bg-warning" },
  { level: "Hard", fill: "bg-danger" },
];

const DIFFICULTY_TOTALS = NEETCODE_150.flatMap((c) => c.problems).reduce(
  (acc, p) => ({ ...acc, [p.difficulty]: acc[p.difficulty] + 1 }),
  { Easy: 0, Medium: 0, Hard: 0 } as Record<NeetCodeDifficulty, number>,
);

const DIFFICULTY_STYLES: Record<NeetCodeDifficulty, string> = {
  Easy: "border-success/40 bg-success/5 text-success-text",
  Medium: "border-warning/40 bg-warning/5 text-warning-text",
  Hard: "border-danger/40 bg-danger/5 text-danger-text",
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
  const solvedByDifficulty = useMemo(() => {
    const counts: Record<NeetCodeDifficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
    for (const category of NEETCODE_150) {
      for (const problem of category.problems) {
        if (progress[problem.id] === "completed") counts[problem.difficulty] += 1;
      }
    }
    return counts;
  }, [progress]);
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
      <section aria-label="NeetCode 150 progress" className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="relative size-28 shrink-0">
            <svg viewBox="0 0 128 128" className="size-full -rotate-90" role="img" aria-label={`${completedCount} of ${NEETCODE_TOTAL} problems solved, ${completionPercent} percent`}>
              <circle cx="64" cy="64" r={RING_R} fill="none" strokeWidth="12" className="stroke-muted" />
              <circle
                cx="64"
                cy="64"
                r={RING_R}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dasharray] duration-[400ms]"
                strokeDasharray={`${(completionPercent / 100) * RING_C} ${RING_C}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold leading-none tabular-nums tracking-tight">
                {completedCount}<span className="text-sm font-normal text-muted-foreground">/{NEETCODE_TOTAL}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">solved</p>
            </div>
          </div>

          <div className="flex min-w-[220px] flex-1 flex-col gap-2.5">
            {DIFFICULTIES.map(({ level, fill }) => {
              const total = DIFFICULTY_TOTALS[level];
              const done = solvedByDifficulty[level];
              return (
                <div key={level} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-muted-foreground">{level}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className={cn("h-full rounded-full transition-[width] duration-[400ms]", fill)} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{done}/{total}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-border sm:border-l sm:pl-6">
            <Flag className={cn("size-4", reviewCount > 0 ? "text-warning-text" : "text-muted-foreground")} aria-hidden="true" />
            <div>
              <p className="text-xl font-semibold leading-none tabular-nums">{reviewCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">to review</p>
            </div>
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
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-[400ms]" style={{ width: `${(categoryCompleted / category.problems.length) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{categoryCompleted}/{category.problems.length}</span>
                </div>
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
                            isReview && "text-warning",
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
                            (hasNote || isNoteOpen) && "text-info",
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
