import assert from "node:assert/strict";
import test from "node:test";
import { NEETCODE_150, NEETCODE_TOTAL, problemUrl } from "./neetcode150";

test("neetcode 150 has exactly 150 problems", () => {
  const count = NEETCODE_150.reduce((sum, category) => sum + category.problems.length, 0);
  assert.equal(count, 150);
  assert.equal(NEETCODE_TOTAL, count);
});

test("problem ids are stable and unique", () => {
  const problems = NEETCODE_150.flatMap((category) => category.problems);
  const ids = new Set(problems.map((problem) => problem.id));
  assert.equal(ids.size, problems.length);
});

test("every problem resolves to an https LeetCode url", () => {
  for (const category of NEETCODE_150) {
    for (const problem of category.problems) {
      assert.match(problemUrl(problem.slug), /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/$/);
    }
  }
});
