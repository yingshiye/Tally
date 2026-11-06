import test from "node:test";
import assert from "node:assert/strict";
import { addDays, dayBounds, localDateOf, weekdayOf, workWindow, zonedToUtc } from "./time";

const LA = "America/Los_Angeles";
const hours = (i: { start: Date; end: Date }) => (i.end.getTime() - i.start.getTime()) / 3_600_000;

test("zonedToUtc: winter is UTC-8, summer is UTC-7", () => {
  assert.equal(zonedToUtc("2026-01-15", "09:00", LA).toISOString(), "2026-01-15T17:00:00.000Z");
  assert.equal(zonedToUtc("2026-07-15", "09:00", LA).toISOString(), "2026-07-15T16:00:00.000Z");
});

test("localDateOf uses the user's zone, not UTC", () => {
  assert.equal(localDateOf(new Date("2026-05-02T03:30:00Z"), LA), "2026-05-01");
  assert.equal(localDateOf(new Date("2026-05-02T08:00:00Z"), LA), "2026-05-02");
});

test("addDays and weekdayOf", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(weekdayOf("2026-11-06"), 5); // Friday
});

test("DST spring forward 2026-03-08: day is 23 hours", () => {
  assert.equal(hours(dayBounds("2026-03-08", LA)), 23);
  assert.equal(hours(dayBounds("2026-03-07", LA)), 24);
});

test("DST fall back 2026-11-01: day is 25 hours", () => {
  assert.equal(hours(dayBounds("2026-11-01", LA)), 25);
});

test("early-morning window loses an hour on spring forward and gains one on fall back", () => {
  assert.equal(hours(workWindow("2026-03-07", "01:00", "04:00", LA)), 3);
  assert.equal(hours(workWindow("2026-03-08", "01:00", "04:00", LA)), 2);
  assert.equal(hours(workWindow("2026-11-01", "01:00", "04:00", LA)), 4);
});

test("normal work window is 12h on DST days too, and local times stay correct", () => {
  const spring = workWindow("2026-03-08", "09:00", "21:00", LA);
  assert.equal(hours(spring), 12);
  assert.equal(spring.start.toISOString(), "2026-03-08T16:00:00.000Z"); // 09:00 PDT
  const fall = workWindow("2026-11-01", "09:00", "21:00", LA);
  assert.equal(fall.start.toISOString(), "2026-11-01T17:00:00.000Z"); // 09:00 PST
});

test("a skipped local time (02:30 on spring-forward day) resolves after the gap", () => {
  assert.equal(zonedToUtc("2026-03-08", "02:30", LA).toISOString(), "2026-03-08T10:30:00.000Z");
});

test("a repeated local time (01:30 on fall-back day) resolves to the first occurrence", () => {
  assert.equal(zonedToUtc("2026-11-01", "01:30", LA).toISOString(), "2026-11-01T08:30:00.000Z");
});

test("other zones work", () => {
  assert.equal(zonedToUtc("2026-07-01", "09:00", "Asia/Tokyo").toISOString(), "2026-07-01T00:00:00.000Z");
});
