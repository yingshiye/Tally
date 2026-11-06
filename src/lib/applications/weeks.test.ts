import { test } from "node:test";
import assert from "node:assert/strict";
import { addWeeks, weekKey, weekKeyOfDateString, weekStart } from "./weeks";

test("weeks start on Monday", () => {
  // 2026-11-08 is a Sunday, 2026-11-09 a Monday.
  assert.equal(weekKeyOfDateString("2026-11-08"), "2026-11-02");
  assert.equal(weekKeyOfDateString("2026-11-09"), "2026-11-09");
  assert.equal(weekKeyOfDateString("2026-11-02"), "2026-11-02");
});

test("handles timestamps and bad input", () => {
  assert.equal(weekKeyOfDateString("2026-11-04T15:00:00Z"), "2026-11-02");
  assert.equal(weekKeyOfDateString(null), null);
  assert.equal(weekKeyOfDateString("nope"), null);
});

test("addWeeks moves by whole weeks across month ends", () => {
  const start = weekStart(new Date(2026, 9, 26)); // Mon Oct 26
  assert.equal(weekKey(addWeeks(start, 1)), "2026-11-02");
  assert.equal(weekKey(addWeeks(start, -4)), "2026-09-28");
});
