import test from "node:test";
import assert from "node:assert/strict";
import { formatClock, formatWorkRange, isKnownTimeZone, validatePrefsForm, zoneCity, type PrefsForm } from "./settings";

const good: PrefsForm = {
  timezone: "America/Los_Angeles", workStart: "09:00", workEnd: "21:00",
  bufferMin: 10, starterMin: 15, topN: 3,
};

test("formatClock: am, pm, noon, midnight, minutes, seconds suffix", () => {
  assert.equal(formatClock("09:00"), "9 am");
  assert.equal(formatClock("21:00:00"), "9 pm");
  assert.equal(formatClock("12:00"), "12 pm");
  assert.equal(formatClock("00:00"), "12 am");
  assert.equal(formatClock("21:30"), "9:30 pm");
});

test("formatWorkRange and zoneCity", () => {
  assert.equal(formatWorkRange("09:00:00", "21:00:00"), "9 am to 9 pm");
  assert.equal(zoneCity("America/Los_Angeles"), "Los Angeles");
  assert.equal(zoneCity("UTC"), "UTC");
});

test("isKnownTimeZone", () => {
  assert.equal(isKnownTimeZone("America/New_York"), true);
  assert.equal(isKnownTimeZone("Mars/Olympus"), false);
});

test("validatePrefsForm: accepts good values", () => {
  assert.equal(validatePrefsForm(good, isKnownTimeZone), null);
});

test("validatePrefsForm: rejects bad zone, reversed hours, out-of-range and fractional numbers", () => {
  assert.match(validatePrefsForm({ ...good, timezone: "Nope" }, isKnownTimeZone)!, /time zone/i);
  assert.match(validatePrefsForm({ ...good, workEnd: "09:00" }, isKnownTimeZone)!, /after/);
  assert.match(validatePrefsForm({ ...good, workStart: "" }, isKnownTimeZone)!, /both/);
  assert.match(validatePrefsForm({ ...good, bufferMin: 121 }, isKnownTimeZone)!, /Buffer/);
  assert.match(validatePrefsForm({ ...good, starterMin: 4 }, isKnownTimeZone)!, /Starter/);
  assert.match(validatePrefsForm({ ...good, topN: 0 }, isKnownTimeZone)!, /Top priorities/);
});
