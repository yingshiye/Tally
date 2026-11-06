// Development-only planner seed. Fictional data. Local Supabase only.
//
//   npm run seed:planner -- --email you@example.com
//   npm run seed:planner -- --email you@example.com --reset   (wipe that user's planner data first)
//
// Guards: refuses in production, on Vercel, or when the database is not on this machine.
// It reads only DATABASE_URL (default: the local Supabase stack), never .env.local,
// so it cannot reach the remote project by accident.
import { Client } from "pg";
import { localDateOf } from "../src/lib/planner/time";
import { assertSafeToSeed, buildSeed } from "../src/lib/planner/seed-data";

const DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const PLANNER_TABLES = [
  "planner_changes", "planner_goal_logs", "planner_blocks", "planner_inbox_items",
  "planner_calendar_events", "planner_tasks", "planner_projects",
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_URL;
  assertSafeToSeed({ NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL, databaseUrl });

  const db = new Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const email = arg("email");
    const users = (await db.query<{ id: string; email: string }>(
      email ? "select id, email from auth.users where email = $1" : "select id, email from auth.users order by created_at limit 2", email ? [email] : [],
    )).rows;
    if (users.length === 0) throw new Error(email ? `No local user with email ${email}. Sign up in the app first.` : "No local users. Sign up in the app first.");
    if (!email && users.length > 1) throw new Error("More than one local user. Pass --email you@example.com.");
    const user = users[0];

    await db.query("begin");
    if (process.argv.includes("--reset")) {
      for (const t of PLANNER_TABLES) await db.query(`delete from public.${t} where user_id = $1`, [user.id]);
      console.log("Cleared existing planner data.");
    } else {
      const { rows } = await db.query("select count(*)::int as n from public.planner_tasks where user_id = $1", [user.id]);
      if (rows[0].n > 0) throw new Error("This user already has planner tasks. Re-run with --reset to replace them.");
    }

    await db.query("insert into public.planner_preferences (user_id) values ($1) on conflict (user_id) do nothing", [user.id]);
    const { timezone } = (await db.query<{ timezone: string }>("select timezone from public.planner_preferences where user_id = $1", [user.id])).rows[0];
    const today = localDateOf(new Date(), timezone);
    const seed = buildSeed(today, timezone);

    const projectId: Record<string, string> = {};
    for (const p of seed.projects) {
      projectId[p.key] = (await db.query("insert into public.planner_projects (user_id, name, kind, color) values ($1,$2,$3,$4) returning id", [user.id, p.name, p.kind, p.color])).rows[0].id;
    }
    const taskId: Record<string, string> = {};
    for (const t of seed.tasks) {
      taskId[t.key] = (await db.query(
        `insert into public.planner_tasks (user_id, project_id, title, importance, estimate_min, due_at, status, first_step, top3_date, source, completed_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'seed',$10) returning id`,
        [user.id, t.project ? projectId[t.project] : null, t.title, t.importance, t.estimateMin, t.dueAt, t.status, t.firstStep, t.top3Date, t.completedAt],
      )).rows[0].id;
    }
    for (const e of seed.events) {
      await db.query("insert into public.planner_calendar_events (user_id, title, start_at, end_at, source) values ($1,$2,$3,$4,'seed')", [user.id, e.title, e.startAt, e.endAt]);
    }
    for (const b of seed.blocks) {
      await db.query("insert into public.planner_blocks (user_id, task_id, title, start_at, end_at, kind, status) values ($1,$2,$3,$4,$5,$6,$7)", [user.id, taskId[b.task], b.title, b.startAt, b.endAt, b.kind, b.status]);
    }
    for (const text of seed.inbox) await db.query("insert into public.planner_inbox_items (user_id, raw_text) values ($1,$2)", [user.id, text]);
    for (const g of seed.goalLogs) await db.query("insert into public.planner_goal_logs (user_id, goal_key, local_date, count) values ($1,$2,$3,$4)", [user.id, g.key, today, g.count]);
    for (const p of seed.postpones) {
      await db.query("insert into public.planner_changes (user_id, entity_type, entity_id, action, reason, created_at) values ($1,'task',$2,'postpone','seed',$3)", [user.id, taskId[p.task], p.at]);
    }
    await db.query("commit");
    console.log(`Seeded ${user.email}: ${seed.projects.length} projects, ${seed.tasks.length} tasks, ${seed.blocks.length} blocks, ${seed.events.length} events, ${seed.inbox.length} inbox items (day ${today}, ${timezone}).`);
  } catch (e) {
    await db.query("rollback").catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
