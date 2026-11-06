"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { usePlannerAction } from "@/components/features/planner/usePlannerAction";
import { APPLICATIONS_KEY, MAX_GOALS, MAX_GOAL_LABEL, validateGoalDrafts, type GoalDef } from "@/lib/planner/goals";
import { saveGoals } from "@/lib/planner/server/actions";

type Row = { rid: string; key?: string; label: string; target: number };

let counter = 0;
const toRows = (goals: GoalDef[]): Row[] => goals.map((g) => ({ rid: g.key, ...g }));

export function GoalsSettings({ initial }: { initial: GoalDef[] }) {
  const [saved] = useState<Row[]>(() => toRows(initial));
  const [rows, setRows] = useState<Row[]>(saved);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const { run } = usePlannerAction();

  const dirty = useMemo(() => JSON.stringify(rows) !== JSON.stringify(saved), [rows, saved]);
  const existingKeys = useMemo(() => new Set(saved.flatMap((r) => (r.key ? [r.key] : []))), [saved]);

  function patch(rid: string, change: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.rid === rid ? { ...r, ...change } : r)));
    setMessage(null);
  }

  async function save() {
    const drafts = rows.map((r) => ({ key: r.key, label: r.label, target: r.target }));
    const problem = validateGoalDrafts(drafts, existingKeys);
    if (problem) {
      setMessage({ kind: "error", text: problem });
      return;
    }
    setPending(true);
    const result = await run(saveGoals({ goals: drafts.map((d) => ({ ...d, label: d.label.trim() })) }));
    setPending(false);
    if (result.ok) {
      // The server assigns keys to new goals; reload them so later saves refer to the right rows.
      setMessage({ kind: "ok", text: "Saved" });
      window.location.reload();
    } else {
      setMessage({ kind: "error", text: result.message ?? "Couldn't save that. Try again." });
    }
  }

  return (
    <section aria-labelledby="goals-title" className="space-y-3">
      <div>
        <h2 id="goals-title" className="text-base font-semibold">Daily goals</h2>
        <p className="text-sm text-muted-foreground">Things you want to do every day. Add as many as you like, up to {MAX_GOALS}.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="rounded-lg border border-border bg-card px-4"
      >
        <ul>
          {rows.map((r) => {
            const builtIn = r.key === APPLICATIONS_KEY;
            return (
              <li key={r.rid} className="grid grid-cols-[1fr_5rem_2rem] items-center gap-2.5 border-b border-border py-3 sm:gap-3">
                {builtIn ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm">{r.label}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Counts automatically</span>
                  </div>
                ) : (
                  <Input value={r.label} maxLength={MAX_GOAL_LABEL} onChange={(e) => patch(r.rid, { label: e.target.value })} aria-label="Goal name" autoComplete="off" />
                )}
                <Input
                  type="number" min={0} max={100} className="tabular-nums"
                  value={Number.isNaN(r.target) ? "" : r.target}
                  onChange={(e) => patch(r.rid, { target: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
                  aria-label={`${r.label || "New goal"} per day`}
                />
                {builtIn ? <span /> : (
                  <Tooltip label={`Delete ${r.label || "goal"}`}>
                    <button
                      type="button" aria-label={`Delete ${r.label || "goal"}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      onClick={() => { setRows((rs) => rs.filter((x) => x.rid !== r.rid)); setMessage(null); }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-b border-border py-3">
          <Button
            type="button" variant="outline" size="sm" disabled={rows.length >= MAX_GOALS}
            onClick={() => { setRows((rs) => [...rs, { rid: `new-${++counter}`, label: "", target: 1 }]); setMessage(null); }}
          >
            <Plus /> Add goal
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 py-3">
          <span role="status" className={message?.kind === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{message?.text}</span>
          <Button type="button" variant="outline" onClick={() => { setRows(saved); setMessage(null); }} disabled={!dirty || pending}>Reset</Button>
          <Button type="submit" disabled={!dirty || pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground">Deleting a goal hides it from Today. Its past counts are kept.</p>
    </section>
  );
}
