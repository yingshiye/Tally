"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlannerAction } from "@/components/features/planner/usePlannerAction";
import { updatePreferences } from "@/lib/planner/server/actions";
import { createCalendarSyncToken, revokeCalendarSync } from "@/lib/planner/server/integration-actions";
import { SettingsRow } from "./SettingsRow";

type Props = {
  connected: boolean;
  /** Already formatted on the server in the user's time zone, e.g. "Nov 5, 7:00 AM". */
  lastSyncLabel: string | null;
  upcomingEvents: number;
  showTitles: boolean;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? <Check /> : <Copy />}
      {done ? "Copied" : "Copy"}
    </Button>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1.5 text-xs">{value}</code>
      <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
    </div>
  );
}

type Step = { done: boolean; title: string; body: React.ReactNode };

/** Numbered checklist: done steps collapse to a check, the first unfinished step is open, later ones are dimmed. */
function Stepper({ steps }: { steps: Step[] }) {
  const current = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <section aria-label="Setup steps" className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between pb-2">
        <h3 className="text-sm font-semibold">Connect Apple Calendar</h3>
        <span className="text-xs text-muted-foreground">{doneCount} of {steps.length} done</span>
      </div>
      <ol>
        {steps.map((step, i) => {
          const open = i === current || (step.title === "Copy these two values" && !step.done);
          return (
            <li key={step.title} className="flex gap-3 border-t border-border py-3">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  step.done ? "bg-success/15 text-success" : open ? "border border-primary text-primary" : "border border-border text-muted-foreground",
                )}
              >
                {step.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className={cn("text-sm font-medium", !step.done && !open && "text-muted-foreground")}>
                  {i + 1}. {step.title}
                  {step.done && <span className="sr-only"> (done)</span>}
                </p>
                {(open || !step.done) && step.body}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function CalendarSettings({ connected, lastSyncLabel, upcomingEvents, showTitles }: Props) {
  const { run } = usePlannerAction();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState(showTitles);

  async function connect() {
    setBusy(true);
    setError(null);
    const result = await run(createCalendarSyncToken());
    setBusy(false);
    if (result.ok) setToken(result.data.token);
    else setError("Couldn't create the token. Try again.");
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    const result = await run(revokeCalendarSync());
    setBusy(false);
    if (result.ok) setToken(null);
    else setError("Couldn't revoke the token. Try again.");
  }

  async function toggleTitles(next: boolean) {
    setTitles(next);
    const result = await run(updatePreferences({ showEventTitles: next }));
    if (!result.ok) {
      setTitles(!next);
      setError("Couldn't save that. Try again.");
    }
  }

  const synced = lastSyncLabel !== null;
  const endpoint = typeof window === "undefined" ? "/api/planner/calendar-sync" : `${window.location.origin}/api/planner/calendar-sync`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card px-4">
        <SettingsRow
          label="Import from Apple Calendar"
          hint={connected ? `${lastSyncLabel ? `Last sync ${lastSyncLabel}` : "Waiting for the first sync"} · ${upcomingEvents} upcoming` : "Your iPhone sends the next 21 days of events once a day."}
        >
          {connected ? (
            <>
              <Button type="button" variant="outline" onClick={connect} disabled={busy}>Replace token</Button>
              <Button type="button" variant="destructive" onClick={revoke} disabled={busy}>Revoke</Button>
            </>
          ) : (
            <Button type="button" onClick={connect} disabled={busy}>{busy ? "Creating…" : "Connect"}</Button>
          )}
        </SettingsRow>
        <SettingsRow label="Show event titles" hint="Off shows imported events as Busy.">
          <input
            type="checkbox"
            role="switch"
            aria-label="Show event titles"
            checked={titles}
            onChange={(e) => void toggleTitles(e.target.checked)}
            className="size-4 accent-primary"
          />
        </SettingsRow>
        <SettingsRow label="Send blocks to Apple Calendar" hint="A subscription link, so your tasks show up in Calendar.">
          <span className="text-xs text-muted-foreground">Coming soon</span>
        </SettingsRow>
        <SettingsRow label="Google Calendar">
          <span className="text-xs text-muted-foreground">Later</span>
        </SettingsRow>
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      {(connected || token) && (
        <Stepper
          steps={[
            { done: true, title: "Create your token", body: <p className="text-sm text-muted-foreground">Done. Use Replace token above if you lose it.</p> },
            {
              done: !token,
              title: "Copy these two values",
              body: token ? (
                <div className="space-y-2">
                  <ValueRow label="Token" value={token} />
                  <ValueRow label="URL" value={endpoint} />
                  <p className="text-xs text-muted-foreground">The token is shown once. Anyone with it can send events to your calendar data.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">The token was shown once. Use Replace token above for a new one.</p>
              ),
            },
            {
              done: synced,
              title: "Build the shortcut on your iPhone",
              body: (
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">Open Shortcuts, tap +, then add these actions in order:</p>
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    <li>Find Calendar Events: start is today, next 21 days.</li>
                    <li>Repeat with each event and build a dictionary: title, start, end (ISO 8601), all day.</li>
                    <li>Get Contents of URL: method POST, JSON body with windowStart, windowEnd and events.</li>
                    <li>Add the header Authorization with the word Bearer, a space, then your token.</li>
                  </ol>
                  <p className="text-xs text-muted-foreground">Don&apos;t share the shortcut, because it contains the token.</p>
                </div>
              ),
            },
            { done: synced, title: "Run it once to test", body: <p className="text-sm text-muted-foreground">This page switches to &quot;Last sync&quot; when the first sync arrives.</p> },
            { done: false, title: "Run it every morning", body: <p className="text-sm text-muted-foreground">In Shortcuts, open Automation, choose Time of Day, and pick this shortcut. Turn off Ask Before Running.</p> },
          ]}
        />
      )}
    </div>
  );
}
