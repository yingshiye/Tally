// Development seed data for the planner. Pure: the date and time zone are passed in.
// Everything here is fictional.
import { addDays, zonedToUtc } from "./time";

export type SeedTask = {
  key: string; title: string; project: string | null; importance: 1 | 2 | 3; estimateMin: number | null;
  dueInDays: number | null; firstStep: string | null; pinToday: boolean; done?: boolean;
};

export const SEED_PROJECTS = [
  { key: "job", name: "Job search", kind: "job_search", color: "blue" },
  { key: "grad", name: "Grad school", kind: "grad_school", color: "purple" },
  { key: "course", name: "Coursework", kind: "coursework", color: "green" },
  { key: "intern", name: "Internship", kind: "internship", color: "orange" },
  { key: "teach", name: "Teaching prep", kind: "teaching", color: "teal" },
] as const;

export const SEED_TASKS: SeedTask[] = [
  { key: "apply", title: "Apply to 3 roles", project: "job", importance: 3, estimateMin: 90, dueInDays: 0, firstStep: null, pinToday: true },
  { key: "pset", title: "CS 143 problem set 4", project: "course", importance: 2, estimateMin: 120, dueInDays: 1, firstStep: null, pinToday: true },
  { key: "letter", title: "Email prof about recommendation letter", project: "grad", importance: 3, estimateMin: 15, dueInDays: 2, firstStep: null, pinToday: true },
  // The big, vague task: no first step yet, so it can't be pinned.
  { key: "sop", title: "Draft grad school SOP", project: "grad", importance: 3, estimateMin: 240, dueInDays: 10, firstStep: null, pinToday: false },
  { key: "resume", title: "Update resume bullets", project: "job", importance: 2, estimateMin: 45, dueInDays: null, firstStep: null, pinToday: false },
  { key: "recruiter", title: "Reply to recruiter", project: "job", importance: 2, estimateMin: 15, dueInDays: 4, firstStep: null, pinToday: false },
  { key: "worksheet", title: "Prep section worksheet", project: "teach", importance: 2, estimateMin: 60, dueInDays: 1, firstStep: null, pinToday: false },
  { key: "grade", title: "Grade quiz 3", project: "teach", importance: 2, estimateMin: 90, dueInDays: 3, firstStep: null, pinToday: false },
  { key: "outreach", title: "LinkedIn outreach: 5 alumni", project: "job", importance: 2, estimateMin: 30, dueInDays: null, firstStep: null, pinToday: false },
  { key: "onboard", title: "Finish internship onboarding docs", project: "intern", importance: 2, estimateMin: 30, dueInDays: 2, firstStep: null, pinToday: false },
  { key: "paper", title: "Read paper for reading group", project: "course", importance: 1, estimateMin: 60, dueInDays: 6, firstStep: null, pinToday: false },
  { key: "dentist", title: "Book dentist appointment", project: null, importance: 1, estimateMin: 15, dueInDays: null, firstStep: null, pinToday: false },
  { key: "oa", title: "Submit online assessment", project: "job", importance: 2, estimateMin: 60, dueInDays: -1, firstStep: null, pinToday: false, done: true },
];

/** Tasks that were postponed before: the letter twice (so the next postpone opens the choice dialog). */
export const SEED_POSTPONES = [{ task: "letter", daysAgo: 3 }, { task: "letter", daysAgo: 1 }];

const EVENTS = [
  { day: 0, title: "CS 143 lecture", start: "09:30", end: "10:45" },
  { day: 0, title: "TA office hours", start: "15:00", end: "16:00" },
  { day: 0, title: "Study group", start: "15:30", end: "16:15" },
  { day: 1, title: "CS 143 lecture", start: "09:30", end: "10:45" },
  { day: 1, title: "Advising appointment", start: "14:00", end: "14:30" },
];

const BLOCKS = [
  { day: 0, task: "letter", title: "Email prof about recommendation letter", start: "11:00", end: "11:15", kind: "task", status: "done" },
  { day: 0, task: "sop", title: "Plan the first step: Draft grad school SOP", start: "11:30", end: "11:45", kind: "starter", status: "planned" },
  { day: 0, task: "apply", title: "Apply to 3 roles", start: "13:00", end: "14:30", kind: "task", status: "planned" },
  { day: 0, task: "pset", title: "CS 143 problem set 4", start: "16:30", end: "18:00", kind: "task", status: "planned" },
  { day: 0, task: "worksheet", title: "Prep section worksheet", start: "19:30", end: "20:30", kind: "task", status: "planned" },
  { day: 1, task: "pset", title: "CS 143 problem set 4", start: "11:00", end: "12:30", kind: "task", status: "planned" },
] as const;

export const SEED_INBOX = ["Email prof @fri 15m !!", "Draft SOP intro #grad-school 2h", "Pay parking permit"];

export function buildSeed(today: string, timezone: string) {
  const at = (day: number, hhmm: string) => zonedToUtc(addDays(today, day), hhmm, timezone).toISOString();
  return {
    projects: SEED_PROJECTS,
    tasks: SEED_TASKS.map((t) => ({
      ...t,
      dueAt: t.dueInDays === null ? null : at(t.dueInDays, "23:59"),
      top3Date: t.pinToday ? today : null,
      status: t.done ? "done" : "todo",
      completedAt: t.done ? at(-1, "18:00") : null,
    })),
    events: EVENTS.map((e) => ({ title: e.title, startAt: at(e.day, e.start), endAt: at(e.day, e.end) })),
    blocks: BLOCKS.map((b) => ({ task: b.task, title: b.title, startAt: at(b.day, b.start), endAt: at(b.day, b.end), kind: b.kind, status: b.status })),
    inbox: SEED_INBOX,
    goalLogs: [{ key: "connections", count: 2 }, { key: "followups", count: 1 }],
    postpones: SEED_POSTPONES.map((p) => ({ task: p.task, at: at(-p.daysAgo, "10:00") })),
  };
}

/** Refuse to seed anywhere that could be production. Seeding is local-only. */
export function assertSafeToSeed(env: { NODE_ENV?: string; VERCEL?: string; databaseUrl: string }): void {
  if (env.NODE_ENV === "production") throw new Error("Refusing to seed: NODE_ENV is production.");
  if (env.VERCEL) throw new Error("Refusing to seed: running on Vercel.");
  let host: string;
  try {
    host = new URL(env.databaseUrl).hostname;
  } catch {
    throw new Error("Refusing to seed: the database URL is not valid.");
  }
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(host)) {
    throw new Error(`Refusing to seed: ${host} is not a local database. Seeding only runs against the local Supabase stack.`);
  }
}
