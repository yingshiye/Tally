"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { parseCapture } from "@/lib/planner/parse-capture";
import { discardInboxItem, listInbox, triageInboxItem } from "@/lib/planner/server/actions";
import { addDays, localDateOf, weekdayOf, zonedToUtc } from "@/lib/planner/time";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/planner/schemas";

export type ProjectOption = { id: string; name: string };
type Item = { id: string; rawText: string };
type Pick = { project: string | null; minutes: number | null; importance: 1 | 2 | 3; due: "none" | "today" | "tomorrow" | "week" | "date"; date: string };

const chip = "rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring";
const on = "border-primary bg-primary/10 text-primary";
const off = "border-border text-muted-foreground hover:bg-muted";

/** Inbox as a side drawer: each captured line becomes a task with one or two taps. */
export function InboxDrawer({
  open, onOpenChange, projects, timezone, run,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; projects: ProjectOption[]; timezone: string;
  run: <T,>(a: Promise<ActionResult<T>>) => Promise<ActionResult<T>>;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>({});

  useEffect(() => {
    if (!open) return;
    let live = true;
    void listInbox().then((r) => { if (live && r.ok) setItems(r.data.map((i) => ({ id: i.id, rawText: i.rawText }))); });
    return () => { live = false; };
  }, [open]);

  const defaults = useCallback((text: string): Pick => {
    const p = parseCapture(text, { now: new Date(), timezone });
    const proj = p.projectHint ? projects.find((x) => x.name.toLowerCase().replace(/[-_\s]+/g, " ") === p.projectHint!.toLowerCase().replace(/[-_\s]+/g, " "))?.id ?? null : null;
    const today = localDateOf(new Date(), timezone);
    const due: Pick["due"] = !p.dueDate ? "none" : p.dueDate === today ? "today" : p.dueDate === addDays(today, 1) ? "tomorrow" : "date";
    return { project: proj, minutes: p.estimateMin, importance: p.importance ?? 2, due, date: p.dueDate ?? addDays(today, 3) };
  }, [projects, timezone]);

  const pickOf = (i: Item) => picks[i.id] ?? defaults(i.rawText);
  const set = (i: Item, patch: Partial<Pick>) => setPicks((s) => ({ ...s, [i.id]: { ...pickOf(i), ...patch } }));

  function dueAt(p: Pick): string | null {
    const today = localDateOf(new Date(), timezone);
    const day = p.due === "none" ? null : p.due === "today" ? today : p.due === "tomorrow" ? addDays(today, 1)
      : p.due === "week" ? addDays(today, (7 - weekdayOf(today)) % 7) : p.date;
    return day ? zonedToUtc(day, "23:59", timezone).toISOString() : null;
  }

  async function add(i: Item) {
    const p = pickOf(i);
    const parsed = parseCapture(i.rawText, { now: new Date(), timezone });
    const r = await run(triageInboxItem({
      inboxItemId: i.id, title: parsed.title, projectId: p.project, estimateMin: p.minutes, importance: p.importance, dueAt: dueAt(p),
    }));
    if (r.ok) setItems((list) => (list ?? []).filter((x) => x.id !== i.id));
  }
  async function discard(i: Item) {
    const r = await run(discardInboxItem({ inboxItemId: i.id }));
    if (r.ok) setItems((list) => (list ?? []).filter((x) => x.id !== i.id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 right-0 left-auto h-dvh max-w-full translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inbox</DialogTitle>
          <DialogDescription>Turn captured thoughts into tasks.</DialogDescription>
        </DialogHeader>
        {items === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">Inbox is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">Press ⌘K anywhere to capture a thought.</p>
          </div>
        ) : (
          <ul className="grid gap-4">
            {items.map((i) => {
              const p = pickOf(i);
              return (
                <li key={i.id} className="grid gap-2 border-b border-border pb-4 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{parseCapture(i.rawText, { now: new Date(), timezone }).title}</p>
                    <Tooltip label="Discard"><button type="button" aria-label="Discard" onClick={() => discard(i)} className="rounded p-1 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><Trash2 className="size-4" /></button></Tooltip>
                  </div>
                  {projects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" aria-label="Project">
                      {projects.map((pr) => <button key={pr.id} type="button" aria-pressed={p.project === pr.id} className={cn(chip, p.project === pr.id ? on : off)} onClick={() => set(i, { project: p.project === pr.id ? null : pr.id })}>{pr.name}</button>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5" aria-label="Duration">
                    {[15, 30, 60, 90].map((m) => <button key={m} type="button" aria-pressed={p.minutes === m} className={cn(chip, p.minutes === m ? on : off)} onClick={() => set(i, { minutes: p.minutes === m ? null : m })}>{m} m</button>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5" aria-label="Importance">
                    {([1, 2, 3] as const).map((n) => <button key={n} type="button" aria-pressed={p.importance === n} aria-label={`Importance ${n}`} className={cn(chip, p.importance === n ? on : off)} onClick={() => set(i, { importance: n })}>{"!".repeat(n)}</button>)}
                    <span className="mx-1 h-4 w-px bg-border" />
                    {([["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "This week"]] as const).map(([k, label]) => (
                      <button key={k} type="button" aria-pressed={p.due === k} className={cn(chip, p.due === k ? on : off)} onClick={() => set(i, { due: p.due === k ? "none" : k })}>{label}</button>
                    ))}
                    <input type="date" aria-label="Pick a due date" value={p.due === "date" ? p.date : ""} onChange={(e) => e.target.value && set(i, { due: "date", date: e.target.value })}
                      className={cn(chip, p.due === "date" ? on : off, "bg-transparent")} />
                  </div>
                  <Button size="sm" className="justify-self-start" onClick={() => add(i)}>Add task</Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
