import test from "node:test";
import assert from "node:assert/strict";
import { checkPlacement, findStarterSlot, snapToGrid } from "./block-rules";

const t = (hhmm: string) => new Date(`2026-05-04T${hhmm}:00Z`);
const iv = (a: string, b: string) => ({ start: t(a), end: t(b) });
const day = iv("00:00", "23:59");
const blk = (id: string, a: string, b: string, status = "planned") => ({ id, status, ...iv(a, b) });

test("snaps to the nearest 15 minutes", () => {
  assert.equal(snapToGrid(t("10:07")).toISOString(), t("10:00").toISOString());
  assert.equal(snapToGrid(t("10:08")).toISOString(), t("10:15").toISOString());
});

test("valid placement is snapped", () => {
  const r = checkPlacement({ start: t("10:04"), end: t("11:17"), day, events: [], blocks: [] });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual([r.start.toISOString(), r.end.toISOString()], [t("10:00").toISOString(), t("11:15").toISOString()]);
});

test("tiny blocks grow to one grid step", () => {
  const r = checkPlacement({ start: t("10:00"), end: t("10:02"), day, events: [], blocks: [] });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.end.toISOString(), t("10:15").toISOString());
});

test("rejects blocks outside the day", () => {
  const d = iv("09:00", "21:00");
  assert.deepEqual(checkPlacement({ start: t("08:00"), end: t("09:30"), day: d, events: [], blocks: [] }), { ok: false, error: "outside_day" });
  assert.deepEqual(checkPlacement({ start: t("20:30"), end: t("21:30"), day: d, events: [], blocks: [] }), { ok: false, error: "outside_day" });
});

test("rejects overlap with an event; touching is fine", () => {
  const events = [iv("10:00", "11:00")];
  assert.deepEqual(checkPlacement({ start: t("10:30"), end: t("11:30"), day, events, blocks: [] }), { ok: false, error: "overlap_event" });
  assert.ok(checkPlacement({ start: t("11:00"), end: t("12:00"), day, events, blocks: [] }).ok);
  assert.ok(checkPlacement({ start: t("09:00"), end: t("10:00"), day, events, blocks: [] }).ok);
});

test("rejects overlap with another block, ignores itself and skipped blocks", () => {
  const blocks = [blk("a", "10:00", "11:00"), blk("s", "12:00", "13:00", "skipped")];
  assert.deepEqual(checkPlacement({ start: t("10:45"), end: t("11:45"), day, events: [], blocks }), { ok: false, error: "overlap_block" });
  assert.ok(checkPlacement({ start: t("10:15"), end: t("10:45"), day, events: [], blocks, ignoreBlockId: "a" }).ok);
  assert.ok(checkPlacement({ start: t("12:00"), end: t("13:00"), day, events: [], blocks }).ok);
});

test("findStarterSlot: first gap that fits, clear of blocks, on the grid", () => {
  const freeSlots = [iv("09:00", "12:00")];
  const blocks = [blk("a", "09:00", "10:10")];
  const r = findStarterSlot({ freeSlots, blocks, from: t("09:05"), durationMin: 15 });
  assert.equal(r?.start.toISOString(), t("10:15").toISOString());
  assert.equal(r?.end.toISOString(), t("10:30").toISOString());
});

test("findStarterSlot: respects `from` and returns null when nothing fits", () => {
  assert.equal(findStarterSlot({ freeSlots: [iv("09:00", "09:10")], blocks: [], from: t("09:00"), durationMin: 15 }), null);
  assert.equal(findStarterSlot({ freeSlots: [iv("09:00", "10:00")], blocks: [], from: t("09:50"), durationMin: 15 }), null);
});
