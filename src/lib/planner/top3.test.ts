import test from "node:test";
import assert from "node:assert/strict";
import { needsFirstStep, validatePin } from "./top3";

const task = (over: Partial<Parameters<typeof validatePin>[0]["task"]> = {}) => ({
  id: "t1", status: "todo", estimate_min: 60, first_step: null, ...over,
});

test("needsFirstStep: over 120 min with no first step", () => {
  assert.equal(needsFirstStep({ estimate_min: 240, first_step: null }), true);
  assert.equal(needsFirstStep({ estimate_min: 240, first_step: "  " }), true);
  assert.equal(needsFirstStep({ estimate_min: 240, first_step: "Outline 3 paragraphs" }), false);
  assert.equal(needsFirstStep({ estimate_min: 120, first_step: null }), false);
  assert.equal(needsFirstStep({ estimate_min: null, first_step: null }), false);
});

test("a normal task can be pinned", () => {
  assert.deepEqual(validatePin({ task: task(), pinnedTaskIds: [], topN: 3 }), { ok: true });
});

test("a big task without a first step cannot be pinned; with one it can", () => {
  const big = task({ estimate_min: 240 });
  assert.deepEqual(validatePin({ task: big, pinnedTaskIds: [], topN: 3 }), { ok: false, reason: "needs_first_step" });
  const ready = task({ estimate_min: 240, first_step: "Write the opening sentence" });
  assert.deepEqual(validatePin({ task: ready, pinnedTaskIds: [], topN: 3 }), { ok: true });
});

test("at most topN per day", () => {
  assert.deepEqual(validatePin({ task: task(), pinnedTaskIds: ["a", "b", "c"], topN: 3 }), { ok: false, reason: "limit_reached" });
  assert.deepEqual(validatePin({ task: task(), pinnedTaskIds: ["a", "b"], topN: 3 }), { ok: true });
});

test("already pinned and closed tasks are rejected", () => {
  assert.deepEqual(validatePin({ task: task(), pinnedTaskIds: ["t1"], topN: 3 }), { ok: false, reason: "already_pinned" });
  assert.deepEqual(validatePin({ task: task({ status: "done" }), pinnedTaskIds: [], topN: 3 }), { ok: false, reason: "task_closed" });
});
