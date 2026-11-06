import test from "node:test";
import assert from "node:assert/strict";
import { handleCapture, MAX_BODY_BYTES, type CaptureDeps } from "./capture-handler";

const TOKEN = "k3J9xQ2mP0vB7nR4tY8wZ1cD6fG5hLaS+/=abcd";
const USER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-11-05T20:00:00Z");

function deps(over: Partial<CaptureDeps> & { counts?: [number, number] } = {}) {
  const inserted: { userId: string; text: string }[] = [];
  const d: CaptureDeps = {
    env: { token: TOKEN, userId: USER },
    now: () => NOW,
    countSince: async (_u, since) => ((over.counts ?? [0, 0])[Date.parse(since) === NOW.getTime() - 60_000 ? 0 : 1]),
    insert: async (userId, text) => { inserted.push({ userId, text }); },
    ...over,
  };
  return { d, inserted };
}
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://example.test/api/planner/capture", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const status = async (r: Request, d: CaptureDeps) => (await handleCapture(r, d)).status;

test("a valid request is saved for the configured user and returns only {ok:true}", async () => {
  const { d, inserted } = deps();
  const res = await handleCapture(post({ text: "  Email prof @fri 15m !!  " }), d);
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(inserted, [{ userId: USER, text: "Email prof @fri 15m !!" }]);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("not configured, or configured with a weak token or bad user id: the endpoint does not exist", async () => {
  for (const env of [{ token: undefined, userId: USER }, { token: "short", userId: USER }, { token: TOKEN, userId: undefined }, { token: TOKEN, userId: "not-a-uuid" }]) {
    const { d, inserted } = deps({ env });
    assert.equal(await status(post({ text: "x" }), d), 404);
    assert.equal(inserted.length, 0);
  }
});

test("missing, wrong, or malformed credentials all get the same 401 and write nothing", async () => {
  const { d, inserted } = deps();
  const bodies = [];
  for (const authorization of [undefined, "", "Bearer wrong", `Bearer ${TOKEN}x`, `Basic ${TOKEN}`, TOKEN]) {
    const headers: Record<string, string> = authorization === undefined ? { authorization: "" } : { authorization };
    const res = await handleCapture(post({ text: "x" }, headers), d);
    assert.equal(res.status, 401);
    bodies.push(await res.text());
  }
  assert.equal(new Set(bodies).size, 1); // identical responses: nothing to learn from the failure
  assert.equal(inserted.length, 0);
});

test("authentication happens before the body is looked at", async () => {
  const { d } = deps();
  assert.equal(await status(post("not json at all", { authorization: "Bearer nope" }), d), 401);
  assert.equal(await status(post("x".repeat(MAX_BODY_BYTES + 1), { authorization: "Bearer nope" }), d), 401);
});

test("only JSON is accepted", async () => {
  const { d } = deps();
  assert.equal(await status(post("text=hi", { "content-type": "text/plain" }), d), 415);
  assert.equal(await status(post("text=hi", { "content-type": "application/x-www-form-urlencoded" }), d), 415);
});

test("oversized bodies are rejected, whether or not content-length is honest", async () => {
  const { d, inserted } = deps();
  assert.equal(await status(post({ text: "x" }, { "content-length": String(MAX_BODY_BYTES + 1) }), d), 413);
  assert.equal(await status(post(JSON.stringify({ text: "y".repeat(MAX_BODY_BYTES) })), d), 413);
  assert.equal(inserted.length, 0);
});

test("invalid input is a 400: bad JSON, wrong shape, empty, too long, NUL characters", async () => {
  const { d, inserted } = deps();
  for (const body of ["{nope", "null", "[]", { text: 5 }, { text: "" }, { text: "   " }, {}, { text: "a".repeat(2001) }, { text: "bad\u0000text" }]) {
    assert.equal(await status(post(body), d), 400, JSON.stringify(body).slice(0, 40));
  }
  assert.equal(inserted.length, 0);
});

test("the longest allowed text is accepted; unknown fields are ignored", async () => {
  const { d, inserted } = deps();
  assert.equal(await status(post({ text: "a".repeat(2000), userId: "attacker", extra: 1 }), d), 201);
  assert.equal(inserted[0].userId, USER); // a client can never choose the target user
});

test("rate limit: per-minute and per-day caps return 429 with Retry-After and write nothing", async () => {
  const minute = deps({ counts: [20, 20] });
  const r1 = await handleCapture(post({ text: "x" }), minute.d);
  assert.equal(r1.status, 429);
  assert.equal(r1.headers.get("retry-after"), "60");
  const day = deps({ counts: [0, 300] });
  const r2 = await handleCapture(post({ text: "x" }), day.d);
  assert.equal(r2.status, 429);
  assert.equal(r2.headers.get("retry-after"), "3600");
  assert.equal(minute.inserted.length + day.inserted.length, 0);
  assert.equal(await status(post({ text: "x" }), deps({ counts: [19, 299] }).d), 201);
});

test("database failures are a generic 500 that leaks nothing and never logs the token or text", async () => {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...a: unknown[]) => { logged.push(a); };
  try {
    const { d } = deps({ insert: async () => { throw new Error(`boom ${TOKEN} secret text`); } });
    const res = await handleCapture(post({ text: "secret text" }), d);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "server_error" });
    const dump = JSON.stringify(logged);
    assert.equal(dump.includes(TOKEN), false);
    assert.equal(dump.includes("secret text"), false);
  } finally {
    console.error = original;
  }
});
