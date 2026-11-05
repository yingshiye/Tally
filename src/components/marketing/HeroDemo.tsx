import {
  AppWindow,
  ArrowRight,
  MessageCircleWarning,
  Sheet,
  StickyNote,
} from "lucide-react";

// Fictional demo data — the landing page never shows real applications.
const STAGES = [
  { label: "Applied", count: 18, fill: "bg-info" },
  { label: "OA", count: 7, fill: "bg-primary" },
  { label: "Interview", count: 4, fill: "bg-warning" },
  { label: "Offer", count: 2, fill: "bg-success" },
];
const TOTAL = STAGES.reduce((sum, stage) => sum + stage.count, 0);
const WEEKLY = [3, 5, 2, 6, 4, 7, 5, 8];

const CHAOS = [
  { icon: Sheet, label: "Tracker (3).xlsx", pos: "left-0 top-2 -rotate-6" },
  { icon: AppWindow, label: "17 tabs open", pos: "right-0 top-10 rotate-3" },
  { icon: StickyNote, label: "OA due Thurs??", pos: "bottom-9 left-4 rotate-6" },
  {
    icon: MessageCircleWarning,
    label: "did I apply already",
    pos: "-bottom-1 right-0 -rotate-3",
  },
];

const glass =
  "border border-white/70 bg-card/60 backdrop-blur-xl shadow-[0_8px_32px_oklch(0.3_0.05_260/0.10)] dark:border-white/10";

export function HeroDemo() {
  return (
    <figure className={`mx-auto max-w-5xl rounded-2xl p-3 sm:p-5 ${glass}`}>
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
        <div
          aria-hidden="true"
          className="relative h-44 w-full max-w-[240px] shrink-0"
        >
          {CHAOS.map(({ icon: Icon, label, pos }, i) => (
            <div
              key={label}
              style={{ "--row-i": i } as React.CSSProperties}
              className={`row-in absolute flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm ${pos}`}
            >
              <Icon className="size-3.5" />
              {label}
            </div>
          ))}
        </div>

        <ArrowRight
          className="size-6 shrink-0 rotate-90 text-muted-foreground lg:rotate-0"
          aria-hidden="true"
        />

        <div className="w-full min-w-0 flex-1 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-semibold leading-none tabular-nums tracking-tight">
              {TOTAL}
            </p>
            <p className="text-sm text-muted-foreground">applications, one board</p>
          </div>

          <div
            className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={STAGES.map((s) => `${s.count} ${s.label}`).join(", ")}
          >
            {STAGES.map((stage, i) => (
              <div
                key={stage.label}
                className={`grow-x ${stage.fill}`}
                style={
                  {
                    flexGrow: stage.count,
                    flexBasis: 0,
                    "--row-i": i,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <dl className="mt-3 grid grid-cols-4 gap-2">
            {STAGES.map((stage) => (
              <div key={stage.label}>
                <dd className="text-lg font-semibold leading-tight tabular-nums tracking-tight">
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

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Applications per week
            </p>
            <div
              className="flex h-14 items-end gap-1.5"
              role="img"
              aria-label={`Applications per week, last 8 weeks: ${WEEKLY.join(", ")}`}
            >
              {WEEKLY.map((value, i) => (
                <div
                  key={i}
                  className={`grow-y flex-1 rounded-t-sm ${
                    i === WEEKLY.length - 1 ? "bg-primary" : "bg-muted-foreground/25"
                  }`}
                  style={
                    {
                      height: `${(value / Math.max(...WEEKLY)) * 100}%`,
                      "--row-i": i,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
