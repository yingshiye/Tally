import test from "node:test";
import assert from "node:assert/strict";
import { countPostponements, postponeNeedsChoice, type ChangeRecord } from "./deferrals";

const changes: ChangeRecord[] = [
  { entity_type: "task", entity_id: "t1", action: "postpone" },
  { entity_type: "block", entity_id: "b1", action: "postpone", before: { task_id: "t1" }, after: { task_id: "t1" } },
  { entity_type: "block", entity_id: "b2", action: "postpone", after: { task_id: "t2" } },
  { entity_type: "block", entity_id: "b1", action: "move", after: { task_id: "t1" } },
  { entity_type: "task", entity_id: "t1", action: "complete" },
  { entity_type: "block", entity_id: "b3", action: "postpone", before: null, after: null },
];

test("counts task and block postpones for that task only", () => {
  assert.equal(countPostponements("t1", changes), 2);
  assert.equal(countPostponements("t2", changes), 1);
  assert.equal(countPostponements("t3", changes), 0);
});

test("ordinary moves and other actions are not postponements", () => {
  assert.equal(countPostponements("t1", changes.filter((c) => c.action !== "postpone")), 0);
});

test("empty log", () => {
  assert.equal(countPostponements("t1", []), 0);
});

test("the third postpone needs a choice", () => {
  assert.equal(postponeNeedsChoice(0), false);
  assert.equal(postponeNeedsChoice(1), false);
  assert.equal(postponeNeedsChoice(2), true);
  assert.equal(postponeNeedsChoice(5), true);
});
