"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Inbox, Plus, Settings, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { brand } from "@/lib/brand";
import type { BlockDto, TaskCard, TodayResponse } from "@/lib/planner/schemas";
import * as A from "@/lib/planner/server/actions";
import { addDays, localDateOf, zonedToUtc } from "@/lib/planner/time";
import { cn } from "@/lib/utils";
import { BlockMenu } from "./BlockMenu";
import { DayList } from "./DayList";
import { InboxDrawer, type ProjectOption } from "./InboxDrawer";
import { Timeline } from "./Timeline";
import { AddEventDialog, PostponeDialog, SlotPicker, type PostponeChoice } from "./dialogs";
import { dueLabel, fmtDateLong, fmtDuration, fmtTime, minutesBetween } from "./format";
import { usePlannerAction } from "./usePlannerAction";

const chip = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] leading-4 whitespace-nowrap";
const tone = { danger: "bg-danger-bg text-danger-text", warning: "bg-warning-bg text-warning-text", muted: "bg-muted text-muted-foreground" } as const;

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-primary transition-[width] duration-[250ms]", className)} style={{ width: `${Math.min(100, Math.round(value * 100))}%` }} />
    </div>
  );
}

function localHM(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

export function TodayView({ data, projects }: { data: TodayResponse; projects: ProjectOption[] }) {
  const { run, toast } = usePlannerAction();
  const tz = data.timezone;
  const todayLocal = localDateOf(new Date(data.generatedAt), tz);
  const [selected, setSelected] = useState<BlockDto | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [postpone, setPostpone] = useState<{ block: BlockDto; start: Date; end: Date; count: number } | null>(null);
  const [firstSteps, setFirstSteps] = useState<Record<string, string>>({});

  const openTasks = [...data.top3.filter((t) => t.status !== "done"), ...data.backlog];
  const needFirst = data.backlog.filter((t) => t.needsFirstStep);
  const pinnable = data.backlog.filter((t) => !t.needsFirstStep);
  const free = data.capacity.freeMin;
  const planned = data.capacity.plannedMin;
  const nav = (d: string) => `/today?date=${d}`;

  // ─── actions ───────────────────────────────────────────────────────────────
  async function moveBlock(block: BlockDto, start: Date, end: Date, confirm = false) {
    const r = await run(A.moveBlock({ blockId: block.id, startAt: start.toISOString(), endAt: end.toISOString(), confirmPostpone: confirm || undefined }));
    if (!r.ok && r.error === "needs_choice") setPostpone({ block, start, end, count: r.data?.postponedCount ?? 2 });
    return r;
  }
  const blockById = (id: string) => data.blocks.find((b) => b.id === id)!;

  async function choose(c: PostponeChoice) {
    if (!postpone) return;
    const { block, start, end } = postpone;
    setPostpone(null);
    const task = openTasks.find((t) => t.id === block.taskId);
    if (c.kind === "drop" && block.taskId) await run(A.dropTask({ taskId: block.taskId }));
    if (c.kind === "time") await moveBlock(block, c.start, new Date(c.start.getTime() + (end.getTime() - start.getTime())), true);
    if (c.kind === "shrink") {
      const half = Math.max(15, Math.floor(minutesBetween(block.startAt, block.endAt) / 2 / 15) * 15);
      await run(A.moveBlock({ blockId: block.id, startAt: block.startAt, endAt: new Date(new Date(block.startAt).getTime() + half * 60_000).toISOString() }));
    }
    if (c.kind === "split" && block.taskId) {
      const total = task?.estimateMin ?? minutesBetween(block.startAt, block.endAt);
      const half = Math.max(15, Math.round(total / 2 / 15) * 15);
      for (const n of [1, 2]) await run(A.createTask({ title: `${task?.title ?? block.title} (part ${n})`, parentId: block.taskId, estimateMin: half, projectId: task?.projectId ?? null }));
    }
  }

  async function tomorrow(b: BlockDto) {
    const next = addDays(data.date, 1);
    const s = zonedToUtc(next, localHM(b.startAt, tz), tz);
    const e = new Date(s.getTime() + (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()));
    setSelected(null);
    await moveBlock(b, s, e);
  }

  async function placeTask(t: TaskCard, minutes: number) {
    if (!slot) return;
    const start = slot.start;
    setSlot(null);
    await run(A.createBlock({
      taskId: t.id, startAt: start.toISOString(), endAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
      kind: t.needsFirstStep ? "starter" : "task", title: t.needsFirstStep ? `Plan the first step: ${t.title}` : undefined,
    }));
  }

  // ─── pieces ────────────────────────────────────────────────────────────────
  const menu = selected && data.blocks.find((b) => b.id === selected.id) ? (
    <BlockMenu
      block={blockById(selected.id)}
      onClose={() => setSelected(null)}
      onDone={() => run(A.setBlockStatus({ blockId: selected.id, status: blockById(selected.id).status === "done" ? "planned" : "done" }))}
      onSkip={() => { setSelected(null); return run(A.setBlockStatus({ blockId: selected.id, status: "skipped" })); }}
      onLock={() => run(A.setBlockLocked({ blockId: selected.id, locked: !blockById(selected.id).locked }))}
      onTomorrow={() => tomorrow(blockById(selected.id))}
      onDelete={() => { setSelected(null); return run(A.deleteBlock({ blockId: selected.id })); }}
    />
  ) : null;

  const taskMeta = (t: TaskCard) => (
    <>
      {t.dueAt && (() => { const d = dueLabel(t.dueAt, data.date, tz); return <span className={cn(chip, tone[d.tone])}>{d.text}</span>; })()}
      {t.postponedCount > 0 && <span className={cn(chip, tone.danger)}>postponed {t.postponedCount}×</span>}
      {t.estimateMin && <span className={cn(chip, tone.muted)}>{fmtDuration(t.estimateMin)}</span>}
    </>
  );

  const iconBtn = "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 p-4 pb-24 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{brand.productName}</p>
            <div className="mt-1 flex items-center gap-1">
              <Tooltip label="Previous day"><Link href={nav(addDays(data.date, -1))} aria-label="Previous day" className={iconBtn}><ChevronLeft className="size-4" /></Link></Tooltip>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{data.date === todayLocal ? brand.modules.today : fmtDateLong(data.date).split(",")[0]}<span className="ml-2 text-base font-normal text-muted-foreground">{fmtDateLong(data.date)}</span></h1>
              <Tooltip label="Next day"><Link href={nav(addDays(data.date, 1))} aria-label="Next day" className={iconBtn}><ChevronRight className="size-4" /></Link></Tooltip>
              {data.date !== todayLocal && <Link href="/today" className="ml-1 text-xs text-primary hover:underline">Back to today</Link>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {data.capacity.overloaded && <span className={cn(chip, tone.danger)} role="status">Overloaded</span>}
            <Tooltip label="Add calendar event"><button type="button" aria-label="Add calendar event" className={iconBtn} onClick={() => setEventOpen(true)}><CalendarPlus className="size-4" /></button></Tooltip>
            <Tooltip label="Open inbox">
              <button type="button" aria-label={`Open inbox, ${data.inboxCount} items`} onClick={() => setInboxOpen(true)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
                <Inbox className="size-3.5" aria-hidden /> <span className="tabular-nums">{data.inboxCount}</span>
              </button>
            </Tooltip>
            <Tooltip label="Quick capture (⌘K)"><span className="hidden rounded-md border border-border px-1.5 py-1 text-[11px] text-muted-foreground md:inline">⌘K</span></Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${fmtDuration(planned)} planned of ${fmtDuration(free)} free`}>
            <div className={cn("h-full rounded-full", data.capacity.overloaded ? "bg-danger" : "bg-primary")} style={{ width: `${free === 0 ? (planned > 0 ? 100 : 0) : Math.min(100, Math.round((planned / free) * 100))}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{fmtDuration(free)} free · {fmtDuration(planned)} planned</span>
        </div>
      </header>

      {/* Now / next */}
      <section aria-label="Now and next" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3 text-primary">
        {data.date === todayLocal ? (
          <>
            {data.now ? (
              <div className="min-w-0">
                <p className="text-xs">Now · until {fmtTime(data.now.endAt, tz)}</p>
                <p className="truncate text-lg font-medium">{data.now.title}</p>
              </div>
            ) : (
              <div><p className="text-xs">Now</p><p className="text-lg font-medium">{data.next ? "Nothing right now" : "Nothing scheduled"}</p></div>
            )}
            {data.next && (
              <div className="text-right text-xs"><p>Next · {fmtTime(data.next.startAt, tz)}</p><p className="text-sm font-medium">{data.next.title}</p></div>
            )}
          </>
        ) : data.next ? (
          <div className="min-w-0">
            <p className="text-xs">First up · {fmtTime(data.next.startAt, tz)}</p>
            <p className="truncate text-lg font-medium">{data.next.title}</p>
          </div>
        ) : (
          <div><p className="text-xs">{data.date > todayLocal ? "Plan" : "Day"}</p><p className="text-lg font-medium">Nothing scheduled</p></div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-8">
        {/* Right column (first in the DOM so it leads on phones) */}
        <div className="flex flex-col gap-5 md:col-start-2 md:row-start-1">
          <section aria-labelledby="top3-h">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="top3-h" className="text-xs font-medium text-muted-foreground">Top {Math.max(3, data.top3.length)}</h2>
              <span className="text-xs tabular-nums text-muted-foreground" aria-label={`${data.progress.done} of ${data.progress.total} done`}>{data.progress.done}/{data.progress.total} done</span>
            </div>
            {data.top3.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Pick up to three priorities from your tasks below.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.top3.map((t) => {
                  const base = t.estimateMin ?? (t.plannedMin + t.doneMin);
                  const value = t.status === "done" ? 1 : base ? t.doneMin / base : 0;
                  return (
                    <li key={t.id}>
                      <div className="flex items-center gap-2">
                        <Tooltip label={t.status === "done" ? "Done" : "Mark done"}>
                          <button type="button" aria-label={t.status === "done" ? `${t.title} is done` : `Mark ${t.title} done`} disabled={t.status === "done"}
                            onClick={() => run(A.completeTask({ taskId: t.id }))}
                            className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border-2 focus-visible:outline-2 focus-visible:outline-ring", t.status === "done" ? "border-success bg-success text-background" : "border-border hover:border-primary")}>
                            {t.status === "done" && <span className="text-[10px] leading-none">✓</span>}
                          </button>
                        </Tooltip>
                        <span className={cn("min-w-0 flex-1 truncate text-sm", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</span>
                        <span className="flex shrink-0 items-center gap-1">{taskMeta(t)}</span>
                        <Tooltip label="Remove from Top 3"><button type="button" aria-label={`Unpin ${t.title}`} className={iconBtn} onClick={() => run(A.unpinTask({ taskId: t.id }))}><StarOff className="size-3.5" /></button></Tooltip>
                      </div>
                      <div className="ml-6 mt-1.5"><Bar value={value} className={t.status === "done" ? "bg-success" : undefined} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {needFirst.length > 0 && (
            <section aria-labelledby="first-h" className="border-t border-border pt-4">
              <h2 id="first-h" className="mb-2 text-xs font-medium text-muted-foreground">Needs a first step</h2>
              <ul className="flex flex-col gap-3">
                {needFirst.map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm">{t.title}</span><span className="flex gap-1">{taskMeta(t)}</span></div>
                    <form className="mt-1.5 flex gap-1.5" onSubmit={async (e) => { e.preventDefault(); const v = (firstSteps[t.id] ?? "").trim(); if (v) { await run(A.setFirstStep({ taskId: t.id, firstStep: v })); setFirstSteps((s) => ({ ...s, [t.id]: "" })); } }}>
                      <input aria-label={`First step for ${t.title}`} value={firstSteps[t.id] ?? ""} onChange={(e) => setFirstSteps((s) => ({ ...s, [t.id]: e.target.value }))}
                        placeholder="What is the very first step?" className="h-8 min-w-0 flex-1 rounded-md border border-border bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring" />
                      <Button type="submit" size="sm" variant="outline">Save</Button>
                      <Tooltip label="Put a 15-minute starter in the next free slot"><Button type="button" size="sm" variant="secondary" onClick={() => run(A.scheduleStarter({ taskId: t.id }))}>15-min starter</Button></Tooltip>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="backlog-h" className="border-t border-border pt-4">
            <h2 id="backlog-h" className="mb-2 text-xs font-medium text-muted-foreground">Tasks</h2>
            {pinnable.length === 0 && needFirst.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks. Press ⌘K to capture one.</p>
            ) : (
              <ul className="flex flex-col">
                {pinnable.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-1.5">
                    <Tooltip label="Mark done"><button type="button" aria-label={`Mark ${t.title} done`} onClick={() => run(A.completeTask({ taskId: t.id }))} className="size-4 shrink-0 rounded-full border-2 border-border hover:border-primary focus-visible:outline-2 focus-visible:outline-ring" /></Tooltip>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <span className="flex shrink-0 items-center gap-1">{taskMeta(t)}</span>
                    <Tooltip label="Add to Top 3"><button type="button" aria-label={`Add ${t.title} to Top 3`} className={iconBtn} onClick={() => run(A.pinTask({ taskId: t.id, date: data.date }))}><Star className="size-3.5" /></button></Tooltip>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="goals-h" className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="goals-h" className="text-xs font-medium text-muted-foreground">Daily goals</h2>
              <Tooltip label="Edit daily goals">
                <Link href="/settings/planner" aria-label="Edit daily goals" className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Settings className="size-3.5" /></Link>
              </Tooltip>
            </div>
            <ul className="flex flex-col gap-2.5">
              {data.goals.map((g) => (
                <li key={g.key} className="grid grid-cols-[30%_1fr_12%_10%] items-center gap-x-3 text-sm">
                  <span className="truncate">{g.key === "applications" ? <Link href="/dashboard" className="hover:underline">{g.label}</Link> : g.label}</span>
                  <div><Bar value={g.target ? g.done / g.target : 0} className={g.target && g.done >= g.target ? "bg-success" : undefined} /></div>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">{g.done}/{g.target}</span>
                  {g.key === "applications" ? <span /> : (
                    <Tooltip label={`Log one ${g.label.toLowerCase().replace(/s$/, "")}`}>
                      <button type="button" aria-label={`Add one to ${g.label}`} className={cn(iconBtn, "border border-border")} onClick={() => run(A.incrementGoal({ goalKey: g.key, date: data.date, delta: 1 }))}><Plus className="size-3.5" /></button>
                    </Tooltip>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Left column: timeline on desktop, list on phones */}
        <div className="md:col-start-1 md:row-start-1">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <h2 className="text-xs font-medium text-muted-foreground">{fmtTime(data.window.startAt, tz)} – {fmtTime(data.window.endAt, tz)}</h2>
            {menu}
          </div>
          {data.events.some((e) => e.allDay) && (
            <div className="mb-2 flex flex-wrap gap-1.5 md:ml-12">{data.events.filter((e) => e.allDay).map((e) => (
              <span key={e.id} className={cn(chip, tone.muted, "gap-1")}>{e.title}<button type="button" aria-label={`Delete ${e.title}`} className="ml-1 opacity-60 hover:opacity-100" onClick={() => run(A.deleteCalendarEvent({ eventId: e.id }))}>×</button></span>
            ))}</div>
          )}
          <div className="hidden md:block">
            <Timeline data={data} selectedId={selected?.id ?? null} onSelect={setSelected}
              onMove={(id, s, e) => moveBlock(blockById(id), s, e)}
              onDeleteEvent={(id) => run(A.deleteCalendarEvent({ eventId: id }))} onFreeSlot={setSlot} />
          </div>
          <div className="md:hidden">
            <DayList data={data} selectedId={selected?.id ?? null} onSelect={setSelected} onFreeSlot={setSlot} />
          </div>
          <div className="ml-0 mt-3 flex items-center gap-3 text-[11px] text-muted-foreground md:ml-12">
            <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-primary/30" /> task</span>
            <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-warning/50" /> starter</span>
            <span className="flex items-center gap-1"><i className="size-2 rounded-sm border border-border bg-muted" /> calendar</span>
          </div>
        </div>
      </div>

      <InboxDrawer open={inboxOpen} onOpenChange={setInboxOpen} projects={projects} timezone={tz} run={run} />
      <AddEventDialog open={eventOpen} onOpenChange={setEventOpen} date={data.date} timezone={tz}
        onSubmit={async (v) => { setEventOpen(false); await run(A.createCalendarEvent({ title: v.title, startAt: v.start.toISOString(), endAt: v.end.toISOString(), allDay: v.allDay })); }} />
      <SlotPicker slot={slot} tasks={openTasks} timezone={tz} onPick={placeTask} onClose={() => setSlot(null)} />
      <PostponeDialog open={!!postpone} title={postpone?.block.title ?? ""} count={postpone?.count ?? 2} timezone={tz} defaultDate={addDays(data.date, 1)} onChoose={choose} onCancel={() => setPostpone(null)} />

      {toast && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-3 py-2 text-sm text-background shadow-md md:bottom-6">{toast}</div>}
    </div>
  );
}
