"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Lock, Plus, X } from "lucide-react";
import { checkPlacement, GRID_MIN } from "@/lib/planner/block-rules";
import { freeAroundBlocks } from "@/lib/planner/free-slots";
import type { BlockDto, TodayResponse } from "@/lib/planner/schemas";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtTime, minutesBetween } from "./format";

const PX_PER_MIN = 0.8;
const MIN_MS = 60_000;

export const blockTone = (b: Pick<BlockDto, "kind" | "status">) =>
  b.status === "done" ? "bg-success-bg text-success-text"
  : b.status === "skipped" ? "bg-muted text-muted-foreground line-through"
  : b.kind === "starter" ? "bg-warning-bg text-warning-text"
  : "bg-primary/10 text-primary";

type Range = { start: Date; end: Date };
type Drag = { id: string; mode: "move" | "resize"; startY: number; orig: Range; deltaMin: number; moved: boolean };

/** Side-by-side columns for overlapping calendar events. */
function layoutColumns<T extends Range>(items: T[]): { item: T; col: number; cols: number }[] {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());
  const out: { item: T; col: number; cols: number }[] = [];
  let cluster: { item: T; col: number; cols: number }[] = [];
  let clusterEnd = 0;
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.col + 1)); cluster.forEach((c) => (c.cols = n)); out.push(...cluster); cluster = []; };
  for (const item of sorted) {
    if (cluster.length && item.start.getTime() >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.item.end > item.start).map((c) => c.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ item, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, item.end.getTime());
  }
  flush();
  return out;
}

export function Timeline({
  data, selectedId, onSelect, onMove, onDeleteEvent, onFreeSlot,
}: {
  data: TodayResponse;
  selectedId: string | null;
  onSelect: (block: BlockDto | null) => void;
  onMove: (blockId: string, start: Date, end: Date) => void;
  onDeleteEvent: (eventId: string) => void;
  onFreeSlot: (slot: Range) => void;
}) {
  const tz = data.timezone;
  const winStart = useMemo(() => new Date(data.window.startAt), [data.window.startAt]);
  const winEnd = useMemo(() => new Date(data.window.endAt), [data.window.endAt]);
  const totalMin = minutesBetween(winStart, winEnd);
  const yOf = (d: Date) => ((Math.min(Math.max(d.getTime(), winStart.getTime()), winEnd.getTime()) - winStart.getTime()) / MIN_MS) * PX_PER_MIN;

  const [drag, setDrag] = useState<Drag | null>(null);
  // Optimistic positions are tied to the data version they were made against; fresh server data replaces them.
  const [ov, setOv] = useState<{ stamp: string; map: Record<string, Range> }>({ stamp: "", map: {} });
  const overrides = ov.stamp === data.generatedAt ? ov.map : {};
  const setOverrides = (fn: (o: Record<string, Range>) => Record<string, Range>) =>
    setOv((cur) => ({ stamp: data.generatedAt, map: fn(cur.stamp === data.generatedAt ? cur.map : {}) }));
  const timers = useRef<Record<string, number>>({});
  const dragRef = useRef<Drag | null>(null);

  const events = useMemo(
    () => data.events.filter((e) => !e.allDay).map((e) => ({ ...e, start: new Date(e.startAt), end: new Date(e.endAt) })),
    [data.events],
  );
  const placed = useMemo(() => data.blocks.map((b) => ({ ...b, start: new Date(b.startAt), end: new Date(b.endAt) })), [data.blocks]);

  const valid = (id: string, r: Range) =>
    checkPlacement({
      start: r.start, end: r.end, day: { start: winStart, end: winEnd },
      events, blocks: placed.map((b) => ({ id: b.id, status: b.status, start: b.start, end: b.end })), ignoreBlockId: id,
    });

  function candidate(orig: Range, mode: "move" | "resize", deltaMin: number): Range {
    const d = deltaMin * MIN_MS;
    return mode === "move"
      ? { start: new Date(orig.start.getTime() + d), end: new Date(orig.end.getTime() + d) }
      : { start: orig.start, end: new Date(orig.end.getTime() + d) };
  }

  function commit(id: string, r: Range, mode: "move" | "resize") {
    const check = valid(id, r);
    if (!check.ok) return false;
    setOverrides((o) => ({ ...o, [id]: { start: check.start, end: check.end } }));
    onMove(id, check.start, check.end);
    void mode;
    return true;
  }

  function onPointerDown(e: React.PointerEvent, b: (typeof placed)[number], mode: "move" | "resize") {
    if (b.locked || e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const d: Drag = { id: b.id, mode, startY: e.clientY, orig: { start: b.start, end: b.end }, deltaMin: 0, moved: false };
    dragRef.current = d;
    setDrag(d);
    e.stopPropagation();
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const raw = (e.clientY - d.startY) / PX_PER_MIN;
    const next = { ...d, deltaMin: Math.round(raw / GRID_MIN) * GRID_MIN, moved: d.moved || Math.abs(e.clientY - d.startY) > 4 };
    dragRef.current = next;
    setDrag(next);
  }
  function onPointerUp(b: (typeof placed)[number]) {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    if (!d.moved) { onSelect(selectedId === b.id ? null : b); return; }
    if (d.deltaMin !== 0) commit(b.id, candidate(d.orig, d.mode, d.deltaMin), d.mode);
  }

  function onKeyDown(e: React.KeyboardEvent, b: (typeof placed)[number]) {
    if (e.key === "Escape") { onSelect(null); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(selectedId === b.id ? null : b); return; }
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || b.locked) return;
    e.preventDefault();
    const step = (e.key === "ArrowDown" ? 1 : -1) * GRID_MIN;
    const cur = overrides[b.id] ?? { start: b.start, end: b.end };
    const next = candidate(cur, e.shiftKey ? "resize" : "move", step);
    const check = valid(b.id, next);
    if (!check.ok) return;
    setOverrides((o) => ({ ...o, [b.id]: { start: check.start, end: check.end } }));
    window.clearTimeout(timers.current[b.id]);
    timers.current[b.id] = window.setTimeout(() => onMove(b.id, check.start, check.end), 450);
  }

  const displayFree = freeAroundBlocks(
    data.freeSlots.map((s) => ({ start: new Date(s.startAt), end: new Date(s.endAt) })), placed, 30,
  );
  const hourMarks = Array.from({ length: Math.floor(totalMin / 60) + 1 }, (_, i) => new Date(winStart.getTime() + i * 60 * MIN_MS));
  const nowD = new Date(data.generatedAt);
  const showNow = data.now !== null || (nowD >= winStart && nowD <= winEnd && data.blocks.length >= 0 && isSameDay(data));
  const height = totalMin * PX_PER_MIN;

  return (
    <div className="relative ml-12" style={{ height }} role="group" aria-label="Day timeline">
      {hourMarks.map((h, i) => (
        <div key={i} className="absolute inset-x-0 border-t border-border" style={{ top: yOf(h) }}>
          <span className="absolute -left-12 w-10 -translate-y-1/2 pr-2 text-right text-[11px] tabular-nums text-muted-foreground">{fmtTime(h, tz)}</span>
        </div>
      ))}

      {displayFree.map((r) => {
        return (
          <Tooltip key={r.start.toISOString()} label="Place a task here">
            <button
              type="button"
              onClick={() => onFreeSlot(r)}
              className="absolute inset-x-1 flex items-center justify-center gap-1 rounded-md border border-dashed border-border text-[11px] text-muted-foreground opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
              style={{ top: yOf(r.start) + 1, height: Math.max(0, yOf(r.end) - yOf(r.start) - 2) }}
              aria-label={`Free ${fmtDuration(minutesBetween(r.start, r.end))}. Place a task`}
            >
              <Plus className="size-3" aria-hidden /> {fmtDuration(minutesBetween(r.start, r.end))}
            </button>
          </Tooltip>
        );
      })}

      {layoutColumns(events).map(({ item: e, col, cols }) => (
        <div
          key={e.id}
          className="group absolute overflow-hidden rounded-md border border-border bg-muted px-2 py-1 text-xs leading-tight text-muted-foreground"
          style={{ top: yOf(e.start), height: Math.max(18, yOf(e.end) - yOf(e.start)), left: `calc(${(col / cols) * 100}% + 4px)`, width: `calc(${100 / cols}% - 8px)` }}
        >
          <span className="line-clamp-2 pr-4">{e.title}</span>
          <span className="block text-[11px] tabular-nums opacity-80">{fmtTime(e.start, tz)}–{fmtTime(e.end, tz)}</span>
          <Tooltip label="Delete event">
            <button type="button" aria-label={`Delete ${e.title}`} onClick={() => onDeleteEvent(e.id)}
              className="absolute right-1 top-1 rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100 focus-visible:opacity-100">
              <X className="size-3" />
            </button>
          </Tooltip>
        </div>
      ))}

      {placed.map((b) => {
        const live = drag?.id === b.id ? candidate(drag.orig, drag.mode, drag.deltaMin) : overrides[b.id] ?? { start: b.start, end: b.end };
        const ok = drag?.id === b.id ? valid(b.id, live).ok : true;
        const top = yOf(live.start);
        const h = Math.max(20, yOf(live.end) - top);
        const compact = h < 38;
        return (
          <div
            key={b.id}
            role="button"
            tabIndex={0}
            aria-label={`${b.title}, ${fmtTime(live.start, tz)} to ${fmtTime(live.end, tz)}${b.locked ? ", locked" : ""}. Arrow keys move, Shift plus arrows resize`}
            aria-pressed={selectedId === b.id}
            onKeyDown={(e) => onKeyDown(e, b)}
            onPointerDown={(e) => onPointerDown(e, b, "move")}
            onPointerMove={onPointerMove}
            onPointerUp={() => onPointerUp(b)}
            onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
            className={cn(
              "absolute inset-x-1 select-none overflow-hidden rounded-md px-2 py-1 text-xs leading-tight outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
              blockTone(b), b.locked ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing",
              selectedId === b.id && "ring-2 ring-primary", !ok && "ring-2 ring-danger",
            )}
            style={{ top, height: h }}
          >
            <div className="flex items-center gap-1">
              {b.status === "done" && <Check className="size-3 shrink-0" aria-hidden />}
              {b.locked && <Lock className="size-3 shrink-0" aria-hidden />}
              <span className="truncate font-medium">{b.title}</span>
            </div>
            {!compact && <span className="block text-[11px] tabular-nums opacity-80">{fmtTime(live.start, tz)}–{fmtTime(live.end, tz)}</span>}
            {!b.locked && h >= 30 && (
              <span
                onPointerDown={(e) => onPointerDown(e, b, "resize")}
                onPointerMove={onPointerMove}
                onPointerUp={() => onPointerUp(b)}
                className="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize touch-none items-end justify-center"
                aria-hidden
              >
                <span className="mb-0.5 h-0.5 w-6 rounded-full bg-current opacity-30" />
              </span>
            )}
          </div>
        );
      })}

      {showNow && nowD >= winStart && nowD <= winEnd && (
        <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger" style={{ top: yOf(nowD) }} aria-label="Current time">
          <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-danger" />
        </div>
      )}
    </div>
  );
}

function isSameDay(data: TodayResponse) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: data.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(data.generatedAt)) === data.date;
}
