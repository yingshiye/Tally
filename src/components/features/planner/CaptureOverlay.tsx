"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { captureToInbox } from "@/lib/planner/server/actions";
import { parseCapture } from "@/lib/planner/parse-capture";

/**
 * Global quick capture: ⌘K / Ctrl+K from any page. Enter saves to the inbox and keeps the
 * field focused for the next thought. It never navigates away.
 */
export function CaptureOverlay() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [count, setCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => { if (o) { setStatus("idle"); setCount(0); } return !o; });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Preview only: the real parse happens when the inbox item becomes a task, in the planner's time zone.
  const preview = text.trim()
    ? parseCapture(text, { now: new Date(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    : null;

  async function save() {
    const value = text.trim();
    if (!value || status === "saving") return;
    setStatus("saving");
    const result = await captureToInbox({ text: value });
    if (result.ok) {
      setText("");
      setCount((c) => c + 1);
      setStatus("saved");
      window.setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1400);
    } else {
      setStatus("error");
    }
    inputRef.current?.focus();
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-30 md:hidden">
        <Tooltip label="Quick capture">
          <button type="button" aria-label="Quick capture" onClick={() => setOpen(true)}
            className="flex size-12 items-center justify-center rounded-full bg-foreground text-background shadow-md focus-visible:outline-2 focus-visible:outline-ring">
            <Plus className="size-5" />
          </button>
        </Tooltip>
      </div>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setStatus("idle"); setCount(0); } }}>
        <DialogContent showCloseButton={false} className="top-[20%] translate-y-0 sm:max-w-lg" onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
          <DialogTitle className="sr-only">Quick capture</DialogTitle>
          <DialogDescription className="sr-only">Type a thought and press Enter to save it to your inbox. Press Escape to close.</DialogDescription>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); if (status === "error") setStatus("idle"); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void save(); } }}
            placeholder="Email prof @fri 15m !!"
            aria-label="Capture a task"
            autoComplete="off"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <div className="flex min-h-6 items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-1.5">
              {preview?.estimateMin ? <span className="rounded-full bg-muted px-2 py-0.5">{preview.estimateMin} m</span> : null}
              {preview?.importance ? <span className="rounded-full bg-muted px-2 py-0.5">{"!".repeat(preview.importance)}</span> : null}
              {preview?.projectHint ? <span className="rounded-full bg-muted px-2 py-0.5">#{preview.projectHint}</span> : null}
              {preview?.dueDate ? <span className="rounded-full bg-muted px-2 py-0.5">due {preview.dueDate.slice(5).replace("-", "/")}</span> : null}
              {!preview && <span>Enter to save · Esc to close</span>}
            </div>
            <span role="status" aria-live="polite" className="flex items-center gap-1">
              {status === "saved" && <><Check className="size-3.5 text-success-text" aria-hidden /> Captured{count > 1 ? ` · ${count}` : ""}</>}
              {status === "saving" && "Saving…"}
              {status === "error" && <span className="text-danger-text">Couldn’t save. Try again.</span>}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
