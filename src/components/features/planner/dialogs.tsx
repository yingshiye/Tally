"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zonedToUtc } from "@/lib/planner/time";
import type { TaskCard } from "@/lib/planner/schemas";
import { fmtDuration, fmtTime, minutesBetween } from "./format";

export type PostponeChoice =
  | { kind: "shrink" } | { kind: "split" } | { kind: "drop" }
  | { kind: "time"; start: Date };

/** Shown on the third postpone: choose what to do instead of silently moving the work again. */
export function PostponeDialog({
  open, title, count, timezone, defaultDate, onChoose, onCancel,
}: {
  open: boolean; title: string; count: number; timezone: string; defaultDate: string;
  onChoose: (c: PostponeChoice) => void; onCancel: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const opt = "flex w-full flex-col items-start rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPicking(false); onCancel(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Postponed {count} times already</DialogTitle>
          <DialogDescription>“{title}” keeps slipping. Pick what to do with it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <button type="button" className={opt} onClick={() => onChoose({ kind: "shrink" })}>Shrink it<span className="text-xs text-muted-foreground">Cut today’s block in half</span></button>
          <button type="button" className={opt} onClick={() => onChoose({ kind: "split" })}>Split it<span className="text-xs text-muted-foreground">Make two smaller tasks</span></button>
          <button type="button" className={opt} onClick={() => setPicking(true)}>Pick a new time<span className="text-xs text-muted-foreground">Choose exactly when</span></button>
          {picking && (
            <div className="flex items-end gap-2 rounded-lg bg-muted p-2">
              <div className="grid flex-1 gap-1"><Label htmlFor="pp-date">Day</Label><Input id="pp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="grid gap-1"><Label htmlFor="pp-time">Start</Label><Input id="pp-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <Button onClick={() => date && time && onChoose({ kind: "time", start: zonedToUtc(date, time, timezone) })}>Move</Button>
            </div>
          )}
          <button type="button" className={opt} onClick={() => onChoose({ kind: "drop" })}>Drop it<span className="text-xs text-muted-foreground">Remove it from your list</span></button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Add a manual calendar event to the day being viewed. */
export function AddEventDialog({
  open, date, timezone, onOpenChange, onSubmit,
}: {
  open: boolean; date: string; timezone: string; onOpenChange: (o: boolean) => void;
  onSubmit: (v: { title: string; start: Date; end: Date; allDay: boolean }) => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [allDay, setAllDay] = useState(false);
  const bad = !title.trim() || (!allDay && end <= start);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add calendar event</DialogTitle>
          <DialogDescription>Blocks can’t overlap it. Calendar sync comes later.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (bad) return;
          onSubmit(allDay
            ? { title: title.trim(), start: zonedToUtc(date, "00:00", timezone), end: zonedToUtc(date, "23:59", timezone), allDay }
            : { title: title.trim(), start: zonedToUtc(date, start, timezone), end: zonedToUtc(date, end, timezone), allDay });
          setTitle("");
        }}>
          <div className="grid gap-1"><Label htmlFor="ev-title">Title</Label><Input id="ev-title" autoFocus placeholder="CS 143 lecture" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label>
          {!allDay && (
            <div className="flex gap-2">
              <div className="grid flex-1 gap-1"><Label htmlFor="ev-start">Start</Label><Input id="ev-start" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div className="grid flex-1 gap-1"><Label htmlFor="ev-end">End</Label><Input id="ev-end" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
          )}
          <Button type="submit" disabled={bad}>Add event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Pick a task to place in a free slot. */
export function SlotPicker({
  slot, tasks, timezone, onPick, onClose,
}: {
  slot: { start: Date; end: Date } | null; tasks: TaskCard[]; timezone: string;
  onPick: (task: TaskCard, minutes: number) => void; onClose: () => void;
}) {
  const room = slot ? minutesBetween(slot.start, slot.end) : 0;
  return (
    <Dialog open={!!slot} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place a task</DialogTitle>
          <DialogDescription>{slot ? `${fmtTime(slot.start, timezone)}–${fmtTime(slot.end, timezone)} · ${fmtDuration(room)} free` : ""}</DialogDescription>
        </DialogHeader>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks yet. Capture one with ⌘K.</p>
        ) : (
          <ul className="grid max-h-72 gap-1 overflow-y-auto">
            {tasks.map((t) => {
              const want = t.needsFirstStep ? 15 : Math.min(t.estimateMin ?? 60, 90);
              const minutes = Math.max(15, Math.min(want, room));
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => onPick(t, minutes)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.needsFirstStep ? "15 m starter" : fmtDuration(minutes)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
