import test from "node:test";
import assert from "node:assert/strict";
import { buildRows, displayTitle, externalIdFor, generateSyncToken, hashToken, idsToDelete, syncPayloadSchema } from "./calendar-sync";

const payload = (over: Record<string, unknown> = {}) => syncPayloadSchema.parse({
  windowStart: "2026-11-05T00:00:00-08:00", windowEnd: "2026-11-26T00:00:00-08:00",
  events: [{ title: "CS 111", start: "2026-11-05T10:00:00-08:00", end: "2026-11-05T11:15:00-08:00" }], ...over,
});

test("schema: defaults, offsets required, window rules, event cap", () => {
  assert.equal(payload().events[0].allDay, false);
  assert.throws(() => payload({ windowStart: "2026-11-05T00:00:00" }));
  assert.throws(() => payload({ windowEnd: "2026-11-04T00:00:00-08:00" }));
  assert.throws(() => payload({ windowEnd: "2027-03-01T00:00:00-08:00" }));
  assert.throws(() => payload({ events: Array.from({ length: 1001 }, () => ({ start: "2026-11-05T10:00:00-08:00", end: "2026-11-05T11:00:00-08:00" })) }));
  assert.throws(() => syncPayloadSchema.parse({ windowStart: 1, windowEnd: 2, events: [] }));
});

test("externalIdFor is stable across time zone spellings and sensitive to content", () => {
  const a = externalIdFor({ title: "X", start: "2026-11-05T10:00:00-08:00", end: "2026-11-05T11:00:00-08:00", allDay: false });
  const b = externalIdFor({ title: "X", start: "2026-11-05T18:00:00Z", end: "2026-11-05T19:00:00Z", allDay: false });
  assert.equal(a, b);
  assert.notEqual(a, externalIdFor({ title: "Y", start: "2026-11-05T18:00:00Z", end: "2026-11-05T19:00:00Z", allDay: false }));
  assert.equal(a.length, 32);
});

test("buildRows: keeps good events, collapses duplicates, drops bad ones", () => {
  const p = payload({ events: [
    { title: "A", start: "2026-11-05T10:00:00-08:00", end: "2026-11-05T11:00:00-08:00" },
    { title: "A", start: "2026-11-05T10:00:00-08:00", end: "2026-11-05T11:00:00-08:00" },
    { title: "Backwards", start: "2026-11-05T12:00:00-08:00", end: "2026-11-05T11:00:00-08:00" },
    { title: "Zero", start: "2026-11-05T12:00:00-08:00", end: "2026-11-05T12:00:00-08:00" },
    { title: "Nul\u0000", start: "2026-11-05T13:00:00-08:00", end: "2026-11-05T14:00:00-08:00" },
    { title: "Outside", start: "2026-12-30T13:00:00-08:00", end: "2026-12-30T14:00:00-08:00" },
    { title: " Padded ", start: "2026-11-06T13:00:00-08:00", end: "2026-11-06T14:00:00-08:00", allDay: true },
  ] });
  const { rows, skipped } = buildRows(p);
  assert.equal(rows.length, 2);
  assert.equal(skipped, 4);
  assert.equal(rows[1].title, "Padded");
  assert.equal(rows[1].all_day, true);
  assert.equal(rows[0].start_at, "2026-11-05T18:00:00.000Z");
});

test("buildRows: an event that began before the window but overlaps it is kept", () => {
  const { rows } = buildRows(payload({ events: [{ title: "Long", start: "2026-11-04T10:00:00-08:00", end: "2026-11-05T10:00:00-08:00" }] }));
  assert.equal(rows.length, 1);
});

test("idsToDelete: removes vanished events and rows with no external id", () => {
  const rows = buildRows(payload()).rows;
  const existing = [
    { id: "keep", external_id: rows[0].external_id },
    { id: "gone", external_id: "deadbeef" },
    { id: "orphan", external_id: null },
  ];
  assert.deepEqual(idsToDelete(existing, rows), ["gone", "orphan"]);
  assert.deepEqual(idsToDelete(existing, []), ["keep", "gone", "orphan"]);
});

test("tokens: prefixed, long, unique, hash is deterministic and not the token", () => {
  const a = generateSyncToken();
  const b = generateSyncToken();
  assert.ok(a.token.startsWith("dpc_") && a.token.length >= 40);
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashToken(a.token));
  assert.notEqual(a.hash, a.token);
  assert.equal(a.hash.length, 64);
});

test("displayTitle: hides imported titles when asked; manual titles stay; empty becomes Busy", () => {
  assert.equal(displayTitle("CS 111", "apple", true), "CS 111");
  assert.equal(displayTitle("CS 111", "apple", false), "Busy");
  assert.equal(displayTitle("Dentist", "manual", false), "Dentist");
  assert.equal(displayTitle("  ", "apple", true), "Busy");
  assert.equal(displayTitle("CS 111", "apple", undefined), "CS 111");
});
