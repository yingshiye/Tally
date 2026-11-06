import test from "node:test";
import assert from "node:assert/strict";
import { parseCapture, parseDuration, resolveDueToken } from "./parse-capture";

const TZ = "America/Los_Angeles";
// Wednesday 2026-11-04, 10:00 in Los Angeles
const now = new Date("2026-11-04T18:00:00Z");
const parse = (s: string) => parseCapture(s, { now, timezone: TZ });

test("the acceptance example: Email prof @fri 15m !!", () => {
  const r = parse("Email prof @fri 15m !!");
  assert.equal(r.title, "Email prof");
  assert.equal(r.estimateMin, 15);
  assert.equal(r.importance, 2);
  assert.equal(r.dueDate, "2026-11-06");
  assert.equal(r.dueAt?.toISOString(), "2026-11-07T07:59:00.000Z"); // 23:59 PST
});

test("plain text is just a title", () => {
  const r = parse("Buy milk");
  assert.deepEqual(
    [r.title, r.estimateMin, r.importance, r.projectHint, r.dueDate],
    ["Buy milk", null, null, null, null],
  );
});

test("durations", () => {
  assert.equal(parseDuration("30m"), 30);
  assert.equal(parseDuration("90m"), 90);
  assert.equal(parseDuration("2h"), 120);
  assert.equal(parseDuration("1.5h"), 90);
  assert.equal(parseDuration("1h30m"), 90);
  assert.equal(parseDuration("0m"), null);
  assert.equal(parseDuration("m"), null);
  assert.equal(parseDuration("30"), null);
  assert.equal(parseDuration("2hours"), null);
});

test("importance from ! marks; only standalone tokens count", () => {
  assert.equal(parse("a !").importance, 1);
  assert.equal(parse("a !!!").importance, 3);
  assert.equal(parse("a !!!!").importance, null);
  assert.equal(parse("Wow!").importance, null);
  assert.equal(parse("Wow!").title, "Wow!");
});

test("project hint", () => {
  const r = parse("Draft SOP #grad-school 2h");
  assert.equal(r.projectHint, "grad-school");
  assert.equal(r.title, "Draft SOP");
  assert.equal(parse("see C# docs").projectHint, null);
});

test("due tokens", () => {
  assert.equal(parse("x @today").dueDate, "2026-11-04");
  assert.equal(parse("x @tomorrow").dueDate, "2026-11-05");
  assert.equal(parse("x @mon").dueDate, "2026-11-09");
  assert.equal(parse("x @Friday").dueDate, "2026-11-06");
});

test("a weekday equal to today means next week", () => {
  assert.equal(resolveDueToken("wed", "2026-11-04"), "2026-11-11");
});

test("@M/D: this year if still ahead, otherwise next year; invalid dates stay in the title", () => {
  assert.equal(parse("x @11/20").dueDate, "2026-11-20");
  assert.equal(parse("x @11/04").dueDate, "2026-11-04");
  assert.equal(parse("x @3/1").dueDate, "2027-03-01");
  const bad = parse("x @13/45");
  assert.equal(bad.dueDate, null);
  assert.equal(bad.title, "x @13/45");
  assert.equal(parse("x @2/30").dueDate, null);
});

test("unknown @words stay in the title", () => {
  const r = parse("ping @alex about it");
  assert.equal(r.title, "ping @alex about it");
  assert.equal(r.dueDate, null);
});

test("due date is resolved in the user's time zone, not UTC", () => {
  // 2026-11-05T03:00Z is still Nov 4 evening in LA
  const r = parseCapture("x @today", { now: new Date("2026-11-05T03:00:00Z"), timezone: TZ });
  assert.equal(r.dueDate, "2026-11-04");
});

test("due date across DST uses the right UTC offset", () => {
  const r = parseCapture("x @3/10", { now: new Date("2026-03-01T20:00:00Z"), timezone: TZ });
  assert.equal(r.dueAt?.toISOString(), "2026-03-11T06:59:00.000Z"); // 23:59 PDT
});

test("only the first token of each kind is used; the rest stay in the title", () => {
  const r = parse("a 30m 45m b");
  assert.equal(r.estimateMin, 30);
  assert.equal(r.title, "a 45m b");
});

test("tokens can appear anywhere; whitespace is normalized", () => {
  const r = parse("  30m   !!  write   essay  #sop ");
  assert.equal(r.title, "write essay");
  assert.equal(r.estimateMin, 30);
  assert.equal(r.importance, 2);
});

test("input with only tokens keeps the raw text as the title; empty input stays empty", () => {
  assert.equal(parse("30m").title, "30m");
  assert.equal(parse("30m").estimateMin, 30);
  assert.equal(parse("   ").title, "");
});

test("non-English text works", () => {
  const r = parse("写 SOP 草稿 2h #grad !!");
  assert.equal(r.title, "写 SOP 草稿");
  assert.equal(r.projectHint, "grad");
});
