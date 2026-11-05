"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

// Fictional companies and roles — the landing page never shows real applications.
const STAGES = [
  { label: "Applied", fill: "bg-info" },
  { label: "OA", fill: "bg-primary" },
  { label: "Interview", fill: "bg-warning" },
  { label: "Offer", fill: "bg-success" },
] as const;

type Demo = { id: string; company: string; role: string; stage: number };

const INITIAL: Demo[] = [
  { id: "a", company: "Acme Robotics", role: "Software Engineer Intern", stage: 0 },
  { id: "b", company: "Northwind Labs", role: "Backend Intern", stage: 1 },
  { id: "c", company: "Lumen Health", role: "Data Engineering Intern", stage: -1 },
  { id: "d", company: "Parcel Logistics", role: "Platform Intern", stage: 2 },
];

const glass =
  "border border-white/70 bg-card/60 backdrop-blur-xl shadow-[0_8px_32px_oklch(0.3_0.05_260/0.10)] dark:border-white/10";

const btn =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:text-muted-foreground";

export function PipelineDemo() {
  const [apps, setApps] = useState<Demo[]>(INITIAL);

  const counts = STAGES.map((stage, i) => ({
    ...stage,
    count: apps.filter((a) => a.stage === i).length,
  }));
  const moved = apps.some((a, i) => a.stage !== INITIAL[i].stage);

  function advance(id: string) {
    setApps((prev) =>
      prev.map((a) =>
        a.id === id && a.stage < STAGES.length - 1
          ? { ...a, stage: a.stage + 1 }
          : a,
      ),
    );
  }

  return (
    <div className={`mx-auto max-w-3xl rounded-2xl p-2 sm:p-3 ${glass}`}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="p-4 sm:p-5">
          <div
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={counts.map((s) => `${s.count} ${s.label}`).join(", ")}
          >
            {counts.map(
              (stage) =>
                stage.count > 0 && (
                  <div
                    key={stage.label}
                    className={`${stage.fill} transition-[flex-grow] duration-[400ms]`}
                    style={{ flexGrow: stage.count, flexBasis: 0 }}
                  />
                ),
            )}
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2" aria-live="polite">
            {counts.map((stage) => (
              <div key={stage.label}>
                <dd
                  className={`text-xl font-semibold leading-tight tabular-nums tracking-tight ${
                    stage.count === 0 ? "text-muted-foreground" : ""
                  }`}
                >
                  {stage.count}
                </dd>
                <dt className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className={`size-2 rounded-full ${stage.fill}`}
                    aria-hidden="true"
                  />
                  {stage.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <ul className="divide-y divide-border border-t border-border">
          {apps.map((app) => {
            const done = app.stage === STAGES.length - 1;
            const current = app.stage >= 0 ? STAGES[app.stage] : null;
            return (
              <li
                key={app.id}
                className="grid grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_7rem_10rem] sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{app.company}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {app.role}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <div className="flex gap-1" aria-hidden="true">
                    {STAGES.map((stage, i) => (
                      <span
                        key={stage.label}
                        className={`size-2 rounded-full transition-colors duration-[250ms] ${
                          i <= app.stage ? current?.fill : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {current ? current.label : "Wishlist"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {current ? current.label : "Wishlist"}
                  </span>
                  <button
                    type="button"
                    className={`${btn} w-40 whitespace-nowrap`}
                    onClick={() => advance(app.id)}
                    disabled={done}
                  >
                    {done ? (
                      "Offer reached"
                    ) : (
                      <>
                        Move to{" "}
                        {app.stage < 0 ? "Applied" : STAGES[app.stage + 1].label}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 sm:px-5">
          <p className="text-xs text-muted-foreground">
            Sample applications. Nothing here is saved.
          </p>
          <button
            type="button"
            className={`${btn} border-transparent bg-transparent`}
            onClick={() => setApps(INITIAL)}
            disabled={!moved}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
