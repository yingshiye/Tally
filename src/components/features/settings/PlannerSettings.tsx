"use client";

import { useMemo, useState } from "react";
import { updatePreferences } from "@/lib/planner/server/actions";
import { isKnownTimeZone, validatePrefsForm, type PrefsForm } from "@/lib/planner/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlannerAction } from "@/components/features/planner/usePlannerAction";
import { SettingsRow } from "./SettingsRow";

type Props = { initial: PrefsForm; zones: string[] };

export function PlannerSettings({ initial, zones }: Props) {
  const [saved, setSaved] = useState<PrefsForm>(initial);
  const [form, setForm] = useState<PrefsForm>(initial);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const { run } = usePlannerAction();

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  function set<K extends keyof PrefsForm>(key: K, value: PrefsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  }
  const num = (key: keyof PrefsForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, (e.target.value === "" ? Number.NaN : Number(e.target.value)) as never);

  async function save() {
    const problem = validatePrefsForm(form, isKnownTimeZone);
    if (problem) {
      setMessage({ kind: "error", text: problem });
      return;
    }
    setPending(true);
    const result = await run(updatePreferences(form));
    setPending(false);
    if (result.ok) {
      setSaved(form);
      setMessage({ kind: "ok", text: "Saved" });
    } else {
      setMessage({ kind: "error", text: result.message ?? "Couldn't save that. Try again." });
    }
  }

  function reset() {
    setForm(saved);
    setMessage(null);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="rounded-lg border border-border bg-card px-4"
    >
      <SettingsRow label="Time zone" hint="Days start and end by this clock." htmlFor="tz">
        <Input id="tz" list="tz-list" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className="w-56" autoComplete="off" />
        <datalist id="tz-list">{zones.map((z) => <option key={z} value={z} />)}</datalist>
      </SettingsRow>
      <SettingsRow label="Work hours" htmlFor="ws">
        <Input id="ws" type="time" value={form.workStart} onChange={(e) => set("workStart", e.target.value)} className="w-36" aria-label="Work start" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="time" value={form.workEnd} onChange={(e) => set("workEnd", e.target.value)} className="w-36" aria-label="Work end" />
      </SettingsRow>
      <SettingsRow label="Buffer between items" hint="Minutes of breathing room around events." htmlFor="buf">
        <Input id="buf" type="number" min={0} max={120} value={Number.isNaN(form.bufferMin) ? "" : form.bufferMin} onChange={num("bufferMin")} className="w-20 tabular-nums" />
      </SettingsRow>
      <SettingsRow label="Starter length" hint="Minutes for a first-step block." htmlFor="st">
        <Input id="st" type="number" min={5} max={60} value={Number.isNaN(form.starterMin) ? "" : form.starterMin} onChange={num("starterMin")} className="w-20 tabular-nums" />
      </SettingsRow>
      <SettingsRow label="Top priorities per day" htmlFor="top">
        <Input id="top" type="number" min={1} max={10} value={Number.isNaN(form.topN) ? "" : form.topN} onChange={num("topN")} className="w-20 tabular-nums" />
      </SettingsRow>
      <div className="flex items-center justify-end gap-3 py-3">
        <span role="status" className={message?.kind === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {message?.text}
        </span>
        <Button type="button" variant="outline" onClick={reset} disabled={!dirty || pending}>Reset</Button>
        <Button type="submit" disabled={!dirty || pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}
