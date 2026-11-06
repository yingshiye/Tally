import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findDuplicates,
  isSameCompany,
  normalizeCompany,
  roleSimilarity,
} from "./duplicates";

const app = (id: string, company: string, role: string) => ({
  id,
  company,
  role,
  status: "applied",
});

test("normalizes case, punctuation, and legal suffixes", () => {
  assert.equal(normalizeCompany("  Twitch, Inc. "), "twitch");
  assert.equal(normalizeCompany("Acme Corp"), "acme");
  assert.equal(normalizeCompany("Inc"), "inc");
});

test("matches the same company across spellings", () => {
  assert.ok(isSameCompany("Roblox", "roblox corporation"));
  assert.ok(isSameCompany("Twitch", "Twitch Interactive"));
  assert.ok(!isSameCompany("Meta", "Metabase"));
  assert.ok(!isSameCompany("", "Roblox"));
});

test("role similarity ignores intern and season words", () => {
  assert.equal(
    roleSimilarity("Software Engineer Intern", "Software Engineer Internship, Summer 2027"),
    1,
  );
  assert.ok(roleSimilarity("Community Growth Intern", "On-Demand Intern") < 0.5);
});

test("returns same-company roles, most similar first", () => {
  const existing = [
    app("1", "Twitch", "Community Growth Intern"),
    app("2", "Twitch", "On-Demand Intern"),
    app("3", "Roblox", "On-Demand Intern"),
  ];
  const matches = findDuplicates(existing, {
    company: "twitch inc",
    role: "On-Demand Intern",
  });
  assert.deepEqual(
    matches.map((m) => [m.application.id, m.similarRole]),
    [
      ["2", true],
      ["1", false],
    ],
  );
});

test("returns nothing for a new company and honors excludeId", () => {
  const existing = [app("1", "Twitch", "Community Growth Intern")];
  assert.deepEqual(findDuplicates(existing, { company: "Stripe", role: "SWE Intern" }), []);
  assert.deepEqual(
    findDuplicates(existing, { company: "Twitch", role: "Community Growth Intern" }, "1"),
    [],
  );
});
