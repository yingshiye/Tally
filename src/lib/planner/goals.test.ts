import assert from "node:assert/strict";
import test from "node:test";
import { defaultGoals, newGoalKey, planGoalSave, validateGoalDrafts } from "./goals";

const existing = defaultGoals({ goal_applications: 5, goal_connections: 5, goal_followups: 3 });
const keys = new Set(existing.map((g) => g.key));
let n = 0;
const rnd = () => `r${++n}`;

test("defaults keep the three starting goals", () => {
  assert.deepEqual(existing.map((g) => [g.key, g.target]), [["applications", 5], ["connections", 5], ["followups", 3]]);
});

test("accepts a valid list with a new goal", () => {
  const drafts = [{ key: "applications", label: "Applications", target: 5 }, { label: "LeetCode problems", target: 2 }];
  assert.equal(validateGoalDrafts(drafts, keys), null);
});

test("rejects empty, long, duplicate, out-of-range and too many goals", () => {
  const app = { key: "applications", label: "Applications", target: 5 };
  assert.match(validateGoalDrafts([app, { label: "  ", target: 1 }], keys)!, /name/);
  assert.match(validateGoalDrafts([app, { label: "x".repeat(31), target: 1 }], keys)!, /30/);
  assert.match(validateGoalDrafts([app, { label: "applications", target: 1 }], keys)!, /already/);
  assert.match(validateGoalDrafts([app, { label: "A", target: 101 }], keys)!, /0 to 100/);
  assert.match(validateGoalDrafts([app, { label: "A", target: 1.5 }], keys)!, /whole/);
  const many = Array.from({ length: 8 }, (_, i) => ({ label: `g${i}`, target: 1 }));
  assert.match(validateGoalDrafts([app, ...many], keys)!, /up to 8/);
});

test("applications cannot be removed and unknown keys are refused", () => {
  assert.match(validateGoalDrafts([{ key: "connections", label: "Connections", target: 1 }], keys)!, /Applications/);
  assert.match(validateGoalDrafts([{ key: "applications", label: "Applications", target: 1 }, { key: "nope", label: "X", target: 1 }], keys)!, /no longer exists/);
});

test("plan: reorders, retargets, inserts, archives, keeps applications' name", () => {
  const plan = planGoalSave(existing, [
    { label: "Reading", target: 1 },
    { key: "applications", label: "Hacked name", target: 7 },
    { key: "followups", label: "Follow ups", target: 3 },
  ], rnd);
  assert.deepEqual(plan.inserts, [{ key: "reading", label: "Reading", target: 1, sort: 0 }]);
  assert.deepEqual(plan.updates.map((u) => [u.key, u.label, u.target, u.sort]), [["applications", "Applications", 7, 1], ["followups", "Follow ups", 3, 2]]);
  assert.deepEqual(plan.archives, ["connections"]);
});

test("new keys are slugs and never collide", () => {
  assert.equal(newGoalKey("LeetCode problems!", new Set(), rnd), "leetcode_problems");
  assert.notEqual(newGoalKey("Connections", new Set(["connections"]), rnd), "connections");
  assert.equal(newGoalKey("???", new Set(), rnd), "goal");
});
