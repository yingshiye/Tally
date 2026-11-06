"use client";

import { Plus } from "lucide-react";
import { freeAroundBlocks } from "@/lib/planner/free-slots";
import type { BlockDto, TodayResponse } from "@/lib/planner/schemas";
import { cn } from "@/lib/utils";
import { blockTone } from "./Timeline";
import { fmtDuration, fmtTime, minutesBetween } from "./format";

/** Narrow-screen version of the timeline: the same data as a time-ordered list. */
export function DayList({
  data, selectedId, onSelect, onFreeSlot,
}: {
  data: TodayResponse;
  selectedId: string | null;
  onSelect: (b: BlockDto | null) => void;
  onFreeSlot: (slot: { start: Date; end: Date }) => void;
}) {
  const tz = data.timezone;
  type Row =
    | { kind: "event"; at: string; end: string; id: string; title: string }
    | { kind: "block"; at: string; end: string; id: string; block: BlockDto }
    | { kind: "free"; at: string; end: string; id: string };
  const rows: Row[] = [
    ...data.events.filter((e) => !e.allDay).map((e): Row => ({ kind: "event", at: e.startAt, end: e.endAt, id: e.id, title: e.title })),
    ...data.blocks.map((b): Row => ({ kind: "block", at: b.startAt, end: b.endAt, id: b.id, block: b })),
    ...freeAroundBlocks(
      data.freeSlots.map((s) => ({ start: new Date(s.startAt), end: new Date(s.endAt) })),
      data.blocks.map((b) => ({ start: new Date(b.startAt), end: new Date(b.endAt), status: b.status })), 30,
    ).map((s): Row => ({ kind: "free", at: s.start.toISOString(), end: s.end.toISOString(), id: `free-${s.start.toISOString()}` })),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing planned yet. Capture a task or place one in a free slot.</p>;

  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-2">
          <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(r.at, tz)}</span>
          {r.kind === "event" && (
            <div className="min-w-0 flex-1 rounded-md bg-muted px-2.5 py-1.5 text-sm text-muted-foreground"><span className="block truncate">{r.title}</span></div>
          )}
          {r.kind === "block" && (
            <button type="button" onClick={() => onSelect(selectedId === r.id ? null : r.block)} aria-pressed={selectedId === r.id}
              className={cn("min-h-9 min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring", blockTone(r.block), selectedId === r.id && "ring-2 ring-primary")}>
              <span className="block truncate">{r.block.title}</span>
              <span className="text-[11px] opacity-80">{fmtDuration(minutesBetween(r.at, r.end))}</span>
            </button>
          )}
          {r.kind === "free" && (
            <button type="button" onClick={() => onFreeSlot({ start: new Date(r.at), end: new Date(r.end) })}
              className="flex min-h-9 flex-1 items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              <Plus className="size-3.5" aria-hidden /> Free · {fmtDuration(minutesBetween(r.at, r.end))}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
