import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Code2,
  LayoutDashboard,
  Eye,
  FileText,
  Sparkles,
  ListChecks,
  Wand2,
} from "lucide-react";

const REPO_URL = "https://github.com/yingshiye/InternshipTracker";

const features = [
  {
    icon: LayoutDashboard,
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
    title: "Know the moment a posting changes",
    description:
      "Add a careers page to your watchlist and a background job checks it on a schedule, flagging changes before the role disappears.",
    image: "/marketing/watchlist.png",
    imageAlt: "Watchlist page tracking a company careers page for changes",
    width: 1440,
    height: 420,
  },
];

const steps = [
  {
    title: "Log the role",
    description:
      "Add a company, role, and status the moment you apply — takes about ten seconds.",
  },
  {
    title: "Build a tailored resume",
    description:
      "Pull bullets from your library, arrange them for the role, and export a clean PDF.",
  },
  {
    title: "Stay ahead of deadlines",
    description:
      "Watchlist alerts and the upcoming-events feed keep next steps from slipping through.",
  },
];

const stack = [
  "Next.js 16",
  "Supabase",
  "PostgreSQL",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui",
];

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]";
// Frosted-glass surface. Marketing page only — the app itself stays flat.
// Keep the fill fairly opaque (/60) so text contrast holds over the blobs.
const glass =
  "border border-white/70 bg-card/60 backdrop-blur-xl shadow-[0_8px_32px_oklch(0.3_0.05_260/0.10)] dark:border-white/10";
const btnOutline =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/70 bg-card/60 px-5 text-sm font-medium text-foreground backdrop-blur-xl transition-[background-color,transform] duration-150 hover:bg-card/80 active:scale-[0.98] dark:border-white/10";

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-background text-foreground antialiased [--muted-foreground:oklch(0.44_0.012_250)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 top-8 size-[460px] rounded-full bg-blue-400/50 blur-3xl" />
        <div className="absolute -right-24 top-1/3 size-[480px] rounded-full bg-violet-400/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 size-[460px] rounded-full bg-teal-300/50 blur-3xl" />
      </div>
      <header
        className={`sticky top-4 z-30 mx-auto mt-4 w-[calc(100%-2rem)] max-w-5xl rounded-full ${glass}`}
      >
        <div className="flex h-12 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5 rounded-md">
            <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
              IT
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Internship Tracker
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              How it works
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Source
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Log in
            </Link>
            <Link href="/signup" className={`${btnPrimary} h-9 px-4`}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 pb-14 text-center">
          <div
            className={`mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground ${glass}`}
          >
            <Sparkles className="size-3.5" aria-hidden="true" />A solo
            full-stack project, live in production
          </div>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl md:text-6xl">
            Every internship application,
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">tracked in one place.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            I built Internship Tracker to run my own internship search — a{" "}
            <Strong>pipeline board</Strong>, a{" "}
            <Strong>resume editor that tailors bullets per role</Strong>, and{" "}
            <Strong>alerts when a careers page changes</Strong>. No more
            spreadsheets and a dozen open tabs.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/signup" className={`group ${btnPrimary}`}>
              Try it live
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className={btnOutline}
            >
              <Code2 className="size-4" aria-hidden="true" />
              View source
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6">
          <div className={`rounded-2xl p-2 sm:p-3 ${glass}`}>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-3">
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
              </div>
              <Image
                src="/marketing/dashboard.png"
                alt="Internship Tracker dashboard"
                width={1440}
                height={760}
                className="w-full"
                priority
              />
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-28">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything the search actually needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three tools that cover the whole loop —{" "}
              <Strong>apply, tailor, and follow up</Strong> — instead of a
              generic to-do list wearing a job-search skin.
            </p>
          </div>

          <div className="space-y-24">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`flex flex-col gap-10 lg:flex-row lg:items-center ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className="lg:w-2/5">
                  <div
                    className={`mb-4 inline-flex size-10 items-center justify-center rounded-lg text-foreground ${glass}`}
                  >
                    <feature.icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <div className="lg:w-3/5">
                  <div className={`rounded-2xl p-2 ${glass}`}>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <Image
                        src={feature.image}
                        alt={feature.imageAlt}
                        width={feature.width}
                        height={feature.height}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three steps, repeated for every role you apply to.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className={`rounded-2xl p-6 ${glass}`}>
                <div className="mb-4 font-mono text-sm font-medium text-primary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <div className={`rounded-2xl px-6 py-10 sm:px-10 ${glass}`}>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wand2 className="size-4" aria-hidden="true" />
                  Built end to end, solo
                </div>
                <p className="mt-2 max-w-lg text-muted-foreground">
                  <Strong>Auth, database schema and RLS policies</Strong>, a
                  scheduled job for watchlist checks,{" "}
                  <Strong>drag-and-drop resume editing</Strong>, and PDF export
                  — all designed and shipped by one person.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-background/70 px-3 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div
            className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground ${glass}`}
          >
            <ListChecks className="size-3.5" aria-hidden="true" />
            Free to use, no credit card
          </div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Stop tracking your search in a spreadsheet.
          </h2>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className={`group ${btnPrimary}`}>
              Create a free account
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            <Link href="/login" className={btnOutline}>
              Sign in
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>Built by Yingshi Ye</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground"
          >
            <Code2 className="size-4" aria-hidden="true" />
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
