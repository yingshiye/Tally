import { test } from "node:test";
import assert from "node:assert/strict";
import { NEETCODE_150, NEETCODE_TOTAL } from "./neetcode150";
import { computeShareStats, shareInitials } from "./share";

test("empty progress yields zero solved and full totals", () => {
  const stats = computeShareStats([]);
  assert.equal(stats.solved, 0);
  assert.equal(stats.total, NEETCODE_TOTAL);
  const sum = Object.values(stats.byDifficulty).reduce((s, d) => s + d.total, 0);
  assert.equal(sum, NEETCODE_TOTAL);
});

test("counts solved problems per difficulty and ignores unknown ids", () => {
  const first = NEETCODE_150[0].problems[0];
  const stats = computeShareStats([first.id, "nc-not-a-real-problem"]);
  assert.equal(stats.solved, 1);
  assert.equal(stats.byDifficulty[first.difficulty].solved, 1);
});

test("initials fall back to NC and cap at two letters", () => {
  assert.equal(shareInitials(null), "NC");
  assert.equal(shareInitials("  "), "NC");
  assert.equal(shareInitials("ada lovelace byron"), "AL");
});
