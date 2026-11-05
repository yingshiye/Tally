"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Eye, FileText, LayoutDashboard } from "lucide-react";

const FEATURES = [
  {
    icon: LayoutDashboard,
    tab: "Pipeline",
    title: "One pipeline, not ten spreadsheets",
    description:
      "Every application lives in one board — status, next step, and upcoming events at a glance, filterable by stage from wishlist to offer.",
    image: "/marketing/dashboard.png",
    imageAlt:
      "Internship Tracker dashboard showing a list of applications and pipeline stats",
    width: 1440,
    height: 760,
  },
  {
    icon: FileText,
    tab: "Resume editor",
    title: "A resume editor built for tailoring",
    description:
      "Keep a library of bullets and entries, then assemble a fitted, one-page resume per role in minutes — with live fit checks and instant PDF export.",
    image: "/marketing/resume-editor.png",
    imageAlt:
      "Resume editor with a module library, live preview, and formatting settings",
    width: 1440,
    height: 900,
  },
  {
    icon: Eye,
    tab: "Watchlist",
    title: "Know the moment a posting changes",
    description:
      "Add a careers page to your watchlist and a background job checks it on a schedule, flagging changes before the role disappears.",
    image: "/marketing/watchlist.png",
    imageAlt: "Watchlist page tracking a company careers page for changes",
    width: 1440,
    height: 420,
  },
];

const ROTATE_MS = 6000;

const glass =
  "border border-white/70 bg-card/60 backdrop-blur-xl shadow-[0_8px_32px_oklch(0.3_0.05_260/0.10)] dark:border-white/10";

export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % FEATURES.length),
      ROTATE_MS,
    );
    return () => window.clearTimeout(id);
  }, [active, auto]);

  function select(index: number, focus = false) {
    setAuto(false);
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const last = FEATURES.length - 1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      select(index === last ? 0 : index + 1, true);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      select(index === 0 ? last : index - 1, true);
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div
        role="tablist"
        aria-label="Features"
        aria-orientation="vertical"
        className="flex flex-col gap-2 lg:w-2/5"
      >
        {FEATURES.map((feature, i) => {
          const selected = i === active;
          return (
            <button
              key={feature.tab}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`feature-tab-${i}`}
              aria-selected={selected}
              aria-controls={`feature-panel-${i}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative overflow-hidden rounded-xl p-4 text-left transition-[background-color,box-shadow] duration-[250ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected ? glass : "hover:bg-card/40"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <feature.icon
                  className={`size-4 ${selected ? "text-primary" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <span className="text-base font-semibold tracking-tight">
                  {feature.title}
                </span>
              </span>
              <span
                className={`grid transition-[grid-template-rows,opacity] duration-[250ms] ${
                  selected
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <span className="overflow-hidden">
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {feature.description}
                  </span>
                </span>
              </span>
              {selected && auto && (
                <span
                  key={active}
                  aria-hidden="true"
                  className="grow-x absolute inset-x-0 bottom-0 h-0.5 bg-primary motion-reduce:hidden"
                  style={{ animationDuration: `${ROTATE_MS}ms`, animationTimingFunction: "linear", animationDelay: "0ms" }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className={`rounded-2xl p-2 lg:w-3/5 ${glass}`}>
        <div className="grid overflow-hidden rounded-xl border border-border bg-card">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.tab}
              role="tabpanel"
              id={`feature-panel-${i}`}
              aria-labelledby={`feature-tab-${i}`}
              hidden={false}
              aria-hidden={i !== active}
              className={`col-start-1 row-start-1 transition-opacity duration-[400ms] ${
                i === active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Image
                src={feature.image}
                alt={feature.imageAlt}
                width={feature.width}
                height={feature.height}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
