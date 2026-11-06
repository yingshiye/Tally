"use client";

import { Check, Lock, LockOpen, SkipForward, Sunrise, Trash2, X } from "lucide-react";
import type { BlockDto } from "@/lib/planner/schemas";
import { Tooltip } from "@/components/ui/tooltip";

/** Actions for the selected block. Shown under the timeline so it works for touch and keyboard alike. */
export function BlockMenu({
  block, onDone, onSkip, onLock, onTomorrow, onDelete, onClose,
}: {
  block: BlockDto;
  onDone: () => void; onSkip: () => void; onLock: () => void; onTomorrow: () => void; onDelete: () => void; onClose: () => void;
}) {
  const btn = "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <div role="toolbar" aria-label={`Actions for ${block.title}`} className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 shadow-sm"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <span className="mr-1 min-w-0 max-w-40 truncate text-xs font-medium">{block.title}</span>
      <Tooltip label={block.status === "done" ? "Mark as planned" : "Mark done"}><button type="button" className={btn} aria-label="Mark done" onClick={onDone}><Check className="size-4" /></button></Tooltip>
      <Tooltip label="Skip this block"><button type="button" className={btn} aria-label="Skip this block" onClick={onSkip}><SkipForward className="size-4" /></button></Tooltip>
      <Tooltip label={block.locked ? "Unlock" : "Lock in place"}><button type="button" className={btn} aria-label={block.locked ? "Unlock" : "Lock in place"} onClick={onLock}>{block.locked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}</button></Tooltip>
      <Tooltip label="Move to tomorrow"><button type="button" className={btn} aria-label="Move to tomorrow" onClick={onTomorrow}><Sunrise className="size-4" /></button></Tooltip>
      <Tooltip label="Delete block"><button type="button" className={btn} aria-label="Delete block" onClick={onDelete}><Trash2 className="size-4" /></button></Tooltip>
      <Tooltip label="Close"><button type="button" className={btn} aria-label="Close actions" onClick={onClose}><X className="size-4" /></button></Tooltip>
    </div>
  );
}
