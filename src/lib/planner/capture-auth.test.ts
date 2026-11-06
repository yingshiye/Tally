import test from "node:test";
import assert from "node:assert/strict";
import { checkCaptureLimit, isUsableToken, parseBearer, verifyToken } from "./capture-auth";

const TOKEN = "k3J9xQ2mP0vB7nR4tY8wZ1cD6fG5hLaS+/=abcd";

test("tokens must be long, and not padded with whitespace", () => {
  assert.equal(isUsableToken(undefined), false);
  assert.equal(isUsableToken(""), false);
  assert.equal(isUsableToken("short"), false);
  assert.equal(isUsableToken("a".repeat(31)), false);
  assert.equal(isUsableToken("a".repeat(32)), true);
  assert.equal(isUsableToken(` ${"a".repeat(40)}`), false);
  assert.equal(isUsableToken(TOKEN), true);
});

test("parseBearer accepts exactly 'Bearer <token>'", () => {
  assert.equal(parseBearer(`Bearer ${TOKEN}`), TOKEN);
  assert.equal(parseBearer(null), null);
  assert.equal(parseBearer(""), null);
  assert.equal(parseBearer(TOKEN), null);
  assert.equal(parseBearer(`bearer ${TOKEN}`), null);
  assert.equal(parseBearer(`Basic ${TOKEN}`), null);
  assert.equal(parseBearer(`Bearer ${TOKEN} extra`), null);
  assert.equal(parseBearer("Bearer "), null);
});

test("verifyToken: right token passes, anything else fails", () => {
  assert.equal(verifyToken(TOKEN, TOKEN), true);
  assert.equal(verifyToken(null, TOKEN), false);
  assert.equal(verifyToken("", TOKEN), false);
  assert.equal(verifyToken(TOKEN.slice(0, -1), TOKEN), false);
  assert.equal(verifyToken(`${TOKEN}x`, TOKEN), false);
  assert.equal(verifyToken(TOKEN.replace("k", "K"), TOKEN), false);
  assert.equal(verifyToken("x".repeat(10_000), TOKEN), false); // very long input does not throw
});

test("rate limit: per-minute and per-day caps with a retry hint", () => {
  assert.deepEqual(checkCaptureLimit({ lastMinute: 0, lastDay: 0 }), { ok: true });
  assert.deepEqual(checkCaptureLimit({ lastMinute: 19, lastDay: 299 }), { ok: true });
  assert.deepEqual(checkCaptureLimit({ lastMinute: 20, lastDay: 20 }), { ok: false, retryAfterSec: 60 });
  assert.deepEqual(checkCaptureLimit({ lastMinute: 1, lastDay: 300 }), { ok: false, retryAfterSec: 3600 });
  assert.deepEqual(checkCaptureLimit({ lastMinute: 5, lastDay: 5 }, { perMinute: 5, perDay: 10 }), { ok: false, retryAfterSec: 60 });
});
