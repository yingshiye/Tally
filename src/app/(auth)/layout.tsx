import Link from "next/link";
import { Check, Eye, FileText, LayoutDashboard } from "lucide-react";

const STAGES = [
  {
    label: "Wishlist",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-subtle-foreground",
  },
  { label: "Applied", badge: "bg-info-bg text-info-text", dot: "bg-info" },
  { label: "OA", badge: "bg-accent text-accent-foreground", dot: "bg-primary" },
  {
    label: "Interview",
    badge: "bg-warning-bg text-warning-text",
    dot: "bg-warning",
  },
  {
    label: "Offer",
    badge: "bg-success-bg text-success-text",
    dot: "bg-success",
  },
];

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function PipelineVisual() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGES.map((stage) => (
        <span
          key={stage.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${stage.badge}`}
        >
          <span className={`size-1.5 rounded-full ${stage.dot}`} />
          {stage.label}
        </span>
      ))}
    </div>
  );
}

function ResumeVisual() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 shrink-0 rounded-sm border border-border bg-background p-2 shadow-[0_1px_2px_oklch(0.208_0.007_250/0.08)]">
        <div className="mx-auto h-1 w-8 rounded-full bg-foreground/70" />
        <div className="mt-2 space-y-1">
          <div className="h-0.5 rounded-full bg-border" />
          <div className="h-0.5 w-10 rounded-full bg-border" />
          <div className="h-0.5 rounded-full bg-border" />
          <div className="h-0.5 w-9 rounded-full bg-border" />
          <div className="h-0.5 rounded-full bg-border" />
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success-text">
        <Check className="size-3" aria-hidden="true" />
        Fits one page
      </span>
    </div>
  );
}

function WatchVisual() {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2">
      <span className="size-2 shrink-0 rounded-full bg-warning" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        Careers page
      </span>
      <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text">
        Changed
      </span>
    </div>
  );
}

const BENEFITS = [
  {
    icon: LayoutDashboard,
    title: (
      <>
        One pipeline, not <Strong>ten spreadsheets</Strong>
      </>
    ),
    body: "Status, next step and upcoming events for every application.",
    visual: <PipelineVisual />,
  },
  {
    icon: FileText,
    title: (
      <>
        A resume tailored to <Strong>each role</Strong>
      </>
    ),
    body: "Pull bullets from your library and export a clean PDF in minutes.",
    visual: <ResumeVisual />,
  },
  {
    icon: Eye,
    title: (
      <>
        Know <Strong>the moment a posting changes</Strong>
      </>
    ),
    body: "Watch a careers page and get flagged before the role disappears.",
    visual: <WatchVisual />,
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col">
        <header className="flex h-14 items-center px-4 sm:px-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5 rounded-md">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
              IT
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Internship Tracker
            </span>
          </Link>
        </header>
        <div
          className={[
            "flex flex-1 items-center justify-center px-4 pb-16 sm:px-8",
            "[&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:ring-0",
            "[&_[data-slot=card-content]]:px-0",
            "[&_[data-slot=input]]:h-10 [&_[data-slot=button]]:h-10",
          ].join(" ")}
        >
          {children}
        </div>
      </div>

      <aside className="relative hidden lg:order-first lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="absolute inset-x-0 top-0 flex h-14 items-center px-8">
          <Link href="/" className="flex items-center gap-2.5 rounded-md">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
              IT
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Internship Tracker
            </span>
          </Link>
        </div>
        <div className="mx-auto w-full max-w-xl">
          <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight">
            Stop losing track of your{" "}
            <span className="text-primary">internship search.</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            One place for <Strong>every application</Strong>, a resume built for{" "}
            <Strong>each role</Strong>, and an alert when a posting changes.
          </p>
          <ul className="mt-10 flex flex-col gap-4">
            {BENEFITS.map(({ icon: Icon, title, body, visual }, index) => (
              <li
                key={index}
                className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon
                      className="size-4 shrink-0 text-foreground"
                      aria-hidden="true"
                    />
                    <span>{title}</span>
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </div>
                <div aria-hidden="true">{visual}</div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
