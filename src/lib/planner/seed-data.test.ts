import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeToSeed, buildSeed } from "./seed-data";
import { countPostponements } from "./deferrals";
import { needsFirstStep } from "./top3";
import { workWindow } from "./time";

const TZ = "America/Los_Angeles";
const seed = buildSeed("2026-11-05", TZ);
const range = (x: { startAt: string; endAt: string }) => [Date.parse(x.startAt), Date.parse(x.endAt)] as const;
const overlap = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[1] && b[0] < a[1];

test("about a dozen tasks across the five projects, with a done one", () => {
  assert.ok(seed.tasks.length >= 12);
  assert.equal(seed.projects.length, 5);
  assert.ok(seed.tasks.some((t) => t.status === "done"));
  const keys = new Set<string>(seed.projects.map((p) => p.key));
  assert.ok(seed.tasks.every((t) => t.project === null || keys.has(t.project)));
});

test("exactly one big vague task (over 120 min, no first step) and it is not pinned", () => {
  const big = seed.tasks.filter((t) => needsFirstStep({ estimate_min: t.estimateMin, first_step: t.firstStep }));
  assert.deepEqual(big.map((t) => t.key), ["sop"]);
  assert.equal(big[0].top3Date, null);
});

test("one task is already postponed twice", () => {
  const changes = seed.postpones.map((p) => ({ entity_type: "task", entity_id: p.task, action: "postpone" }));
  assert.equal(countPostponements("letter", changes), 2);
  assert.equal(countPostponements("apply", changes), 0);
});

test("at most three tasks are pinned for today", () => {
  const pinned = seed.tasks.filter((t) => t.top3Date === "2026-11-05");
  assert.equal(pinned.length, 3);
});

test("blocks never overlap each other or an event, and stay inside the work window", () => {
  const blocks = seed.blocks.map(range);
  const events = seed.events.map(range);
  blocks.forEach((b, i) => {
    blocks.slice(i + 1).forEach((o) => assert.equal(overlap(b, o), false));
    events.forEach((e) => assert.equal(overlap(b, e), false));
  });
  for (const day of ["2026-11-05", "2026-11-06"]) {
    const w = workWindow(day, "09:00", "21:00", TZ);
    seed.blocks.filter((b) => b.startAt.slice(0, 10) >= day.slice(0, 10)).forEach((b) => {
      const [s, e] = range(b);
      if (s >= w.start.getTime() && s < w.end.getTime()) assert.ok(e <= w.end.getTime());
    });
  }
});

test("every block points at a task in the seed", () => {
  const keys = new Set(seed.tasks.map((t) => t.key));
  assert.ok(seed.blocks.every((b) => keys.has(b.task)));
});

test("seed dates follow the given day and zone (DST-safe)", () => {
  const spring = buildSeed("2026-03-08", TZ);
  assert.equal(spring.events[0].startAt, "2026-03-08T16:30:00.000Z"); // 09:30 PDT
});

test("safety guard allows only a local database outside production", () => {
  const local = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  assert.doesNotThrow(() => assertSafeToSeed({ databaseUrl: local }));
  assert.doesNotThrow(() => assertSafeToSeed({ databaseUrl: "postgresql://u:p@localhost:5432/db", NODE_ENV: "development" }));
  assert.throws(() => assertSafeToSeed({ databaseUrl: local, NODE_ENV: "production" }), /production/);
  assert.throws(() => assertSafeToSeed({ databaseUrl: local, VERCEL: "1" }), /Vercel/);
  assert.throws(() => assertSafeToSeed({ databaseUrl: "postgresql://postgres:pw@db.wgxdclyucespiwfwsxzm.supabase.co:5432/postgres" }), /not a local database/);
  assert.throws(() => assertSafeToSeed({ databaseUrl: "not a url" }), /not valid/);
});
