import test from "node:test";
import assert from "node:assert/strict";
import { generateSyncToken, hashToken } from "../calendar-sync";
import { handleCalendarSync, MAX_SYNC_BODY_BYTES, type SyncDeps } from "./calendar-sync-handler";

const NOW = new Date("2026-11-05T15:00:00Z");
const good = {
  windowStart: "2026-11-05T00:00:00-08:00", windowEnd: "2026-11-26T00:00:00-08:00",
  events: [{ title: "CS 111", start: "2026-11-05T10:00:00-08:00", end: "2026-11-05T11:00:00-08:00" }],
};

function setup(over: { lastUsedAt?: string | null; active?: boolean } = {}) {
  const { token, hash } = generateSyncToken();
  const calls = { applied: 0, touched: 0, lastRows: 0, lookups: [] as string[] };
  const deps: SyncDeps = {
    now: () => NOW,
    findIntegration: async (h) => { calls.lookups.push(h); return over.active === false || h !== hash ? null : { id: "i1", userId: "u1", lastUsedAt: over.lastUsedAt ?? null }; },
    touch: async () => { calls.touched++; },
    apply: async (_u, rows) => { calls.applied++; calls.lastRows = rows.length; return { upserted: rows.length, deleted: 2 }; },
  };
  const req = (body: unknown, headers: Record<string, string> = {}, raw?: string) =>
    new Request("http://x/api/planner/calendar-sync", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
      body: raw ?? JSON.stringify(body),
    });
  return { token, deps, calls, req };
}

test("accepts a valid sync and returns counts only", async () => {
  const s = setup();
  const res = await handleCalendarSync(s.req(good), s.deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, upserted: 1, deleted: 2, skipped: 0 });
  assert.equal(s.calls.applied, 1);
});

test("missing, malformed, wrong and revoked tokens all get the same 401 and never reach the body or the database writes", async () => {
  const s = setup();
  const bad = [
    new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(good) }),
    s.req(good, { authorization: "Basic abc" }),
    s.req(good, { authorization: "Bearer" }),
    s.req(good, { authorization: "Bearer dpc_wrong" }),
    s.req(good, { authorization: `Bearer ${s.token} extra` }),
  ];
  const bodies = new Set<string>();
  for (const r of bad) {
    const res = await handleCalendarSync(r, s.deps);
    assert.equal(res.status, 401);
    bodies.add(await res.text());
  }
  assert.equal(bodies.size, 1);
  const revoked = setup({ active: false });
  assert.equal((await handleCalendarSync(revoked.req(good), revoked.deps)).status, 401);
  assert.equal(s.calls.applied, 0);
});

test("auth is checked before the body: a bad token with junk body is 401, not 400/415/413", async () => {
  const s = setup();
  const r = s.req(null, { authorization: "Bearer nope", "content-type": "text/plain", "content-length": String(MAX_SYNC_BODY_BYTES + 1) }, "not json");
  assert.equal((await handleCalendarSync(r, s.deps)).status, 401);
});

test("the token is only ever looked up by its hash", async () => {
  const s = setup();
  await handleCalendarSync(s.req(good), s.deps);
  assert.deepEqual(s.calls.lookups, [hashToken(s.token)]);
  assert.ok(!s.calls.lookups.includes(s.token));
});

test("rejects wrong content type, oversize, bad JSON, and invalid shapes", async () => {
  const s = setup();
  assert.equal((await handleCalendarSync(s.req(good, { "content-type": "text/plain" }), s.deps)).status, 415);
  assert.equal((await handleCalendarSync(s.req(good, { "content-length": String(MAX_SYNC_BODY_BYTES + 1) }), s.deps)).status, 413);
  assert.equal((await handleCalendarSync(s.req(null, {}, "x".repeat(MAX_SYNC_BODY_BYTES + 1)), s.deps)).status, 413);
  assert.equal((await handleCalendarSync(s.req(null, {}, "{nope"), s.deps)).status, 400);
  assert.equal((await handleCalendarSync(s.req({ ...good, events: "x" }), s.deps)).status, 400);
  assert.equal((await handleCalendarSync(s.req({ ...good, windowStart: "2026-11-05T00:00:00" }), s.deps)).status, 400);
  assert.equal(s.calls.applied, 0);
});

test("a second sync within the minimum gap is rate limited; after the gap it is allowed", async () => {
  const soon = setup({ lastUsedAt: new Date(NOW.getTime() - 1000).toISOString() });
  const res = await handleCalendarSync(soon.req(good), soon.deps);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "5");
  assert.equal(soon.calls.applied, 0);
  const later = setup({ lastUsedAt: new Date(NOW.getTime() - 60_000).toISOString() });
  assert.equal((await handleCalendarSync(later.req(good), later.deps)).status, 200);
});

test("database failures return a generic 500 without details", async () => {
  const s = setup();
  s.deps.apply = async () => { throw new Error("relation planner_calendar_events secret detail"); };
  const res = await handleCalendarSync(s.req(good), s.deps);
  assert.equal(res.status, 500);
  assert.deepEqual(await res.json(), { error: "server_error" });
});

test("bad events are skipped and reported, not fatal; counts reflect valid rows only", async () => {
  const s = setup();
  const body = { ...good, events: [...good.events, { title: "Back", start: "2026-11-05T12:00:00-08:00", end: "2026-11-05T11:00:00-08:00" }] };
  const res = await handleCalendarSync(s.req(body), s.deps);
  assert.deepEqual(await res.json(), { ok: true, upserted: 1, deleted: 2, skipped: 1 });
});
