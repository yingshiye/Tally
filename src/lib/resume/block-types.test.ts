import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ENTRY_FIELD_LABELS,
  blockTypeLabel,
  buildTypeOptions,
  countTypes,
  entryFieldLabels,
  findPreset,
  isAutoSectionTitle,
  normalizeTypeLabel,
  sectionTitleFor,
} from "./block-types";

const blocks = [
  { type_label: "Work experience", layout_kind: "entry" as const },
  { type_label: "work experience", layout_kind: "entry" as const },
  { type_label: "Gallery residency", layout_kind: "entry" as const },
  { type_label: null, layout_kind: "entry" as const },
  { type_label: "Education", layout_kind: "education" as const },
];

test("normalizeTypeLabel trims, collapses spaces, and returns null for blank", () => {
  assert.equal(normalizeTypeLabel("  Clinical   rotation "), "Clinical rotation");
  assert.equal(normalizeTypeLabel("   "), null);
  assert.equal(normalizeTypeLabel(null), null);
});

test("findPreset is case-insensitive and respects the layout", () => {
  assert.equal(findPreset("clinical ROTATION")?.label, "Clinical rotation");
  assert.equal(findPreset("Clinical rotation", "skills"), undefined);
  assert.equal(findPreset("Gallery residency"), undefined);
});

test("blockTypeLabel falls back to the layout's default name", () => {
  assert.equal(blockTypeLabel({ type_label: null, layout_kind: "entry" }), "Work experience");
  assert.equal(blockTypeLabel({ type_label: " ", layout_kind: "skills" }), "Skills");
  assert.equal(blockTypeLabel({ type_label: "Project", layout_kind: "entry" }), "Project");
});

test("field labels and section titles adapt to presets and fall back for custom types", () => {
  assert.equal(entryFieldLabels("Clinical rotation").organization, "Hospital or clinic");
  assert.deepEqual(entryFieldLabels("Gallery residency"), DEFAULT_ENTRY_FIELD_LABELS);
  assert.equal(sectionTitleFor("entry", "Project"), "Projects");
  assert.equal(sectionTitleFor("entry", "Gallery residency"), "Experience");
  assert.equal(sectionTitleFor("education", null), "Education");
});

test("isAutoSectionTitle only matches generated titles", () => {
  assert.equal(isAutoSectionTitle(""), true);
  assert.equal(isAutoSectionTitle("Projects"), true);
  assert.equal(isAutoSectionTitle("Selected work"), false);
});

test("countTypes merges case variants and sorts by count", () => {
  assert.deepEqual(countTypes(blocks), [
    { label: "Work experience", count: 3 },
    { label: "Education", count: 1 },
    { label: "Gallery residency", count: 1 },
  ]);
});

test("buildTypeOptions lists own types first, then unused presets, then create", () => {
  const all = buildTypeOptions({ layoutKind: "entry", query: "", blocks });
  assert.deepEqual(
    all.yours.map((type) => type.label),
    ["Work experience", "Gallery residency"],
  );
  assert.ok(all.presets.some((preset) => preset.label === "Project"));
  assert.ok(!all.presets.some((preset) => preset.label === "Work experience"));
  assert.equal(all.create, null);

  const filtered = buildTypeOptions({ layoutKind: "entry", query: "clin", blocks });
  assert.deepEqual(filtered.yours, []);
  assert.deepEqual(
    filtered.presets.map((preset) => preset.label),
    ["Clinical rotation"],
  );
  assert.equal(filtered.create, "clin");
});

test("buildTypeOptions does not offer to create a label that already exists", () => {
  assert.equal(buildTypeOptions({ layoutKind: "entry", query: "gallery RESIDENCY", blocks }).create, null);
  assert.equal(buildTypeOptions({ layoutKind: "entry", query: "project", blocks }).create, null);
  assert.equal(buildTypeOptions({ layoutKind: "entry", query: "Leadership team", blocks }).create, "Leadership team");
});
