import test from "node:test";
import assert from "node:assert/strict";
import { computeFreeSlots, freeAroundBlocks } from "./free-slots";
import { computeCapacity, plannedMinutes, totalMinutes } from "./capacity";
import { workWindow } from "./time";

const d = (hhmm: string) => new Date(`2026-05-04T${hhmm}:00Z`);
const iv = (a: string, b: string) => ({ start: d(a), end: d(b) });
const fmt = (slots: { start: Date; end: Date }[]) =>
  slots.map((s) => `${s.start.toISOString().slice(11, 16)}-${s.end.toISOString().slice(11, 16)}`);
const base = { dayStart: d("09:00"), dayEnd: d("17:00"), bufferMin: 0, minSlotMin: 15 };

test("empty day is one big slot", () => {
  assert.deepEqual(fmt(computeFreeSlots({ ...base, busy: [] })), ["09:00-17:00"]);
});

test("an event splits the day", () => {
  assert.deepEqual(fmt(computeFreeSlots({ ...base, busy: [iv("12:00", "13:00")] })), ["09:00-12:00", "13:00-17:00"]);
});

test("overlapping events merge", () => {
  const busy = [iv("10:00", "12:00"), iv("11:00", "13:00"), iv("12:30", "14:00")];
  assert.deepEqual(fmt(computeFreeSlots({ ...base, busy })), ["09:00-10:00", "14:00-17:00"]);
});

test("adjacent events leave no gap", () => {
  const busy = [iv("10:00", "11:00"), iv("11:00", "12:00")];
  assert.deepEqual(fmt(computeFreeSlots({ ...base, busy })), ["09:00-10:00", "12:00-17:00"]);
});

test("buffer pads each event; the day edges get no buffer", () => {
  const slots = computeFreeSlots({ ...base, bufferMin: 10, busy: [iv("12:00", "13:00")] });
  assert.deepEqual(fmt(slots), ["09:00-11:50", "13:10-17:00"]);
});

test("buffers of adjacent events with a small gap close it", () => {
  const slots = computeFreeSlots({ ...base, bufferMin: 10, busy: [iv("10:00", "11:00"), iv("11:15", "12:00")] });
  assert.deepEqual(fmt(slots), ["09:00-09:50", "12:10-17:00"]);
});

test("events outside the window are ignored; events straddling it are clipped", () => {
  const busy = [iv("06:00", "08:00"), iv("08:00", "10:00"), iv("16:00", "19:00")];
  assert.deepEqual(fmt(computeFreeSlots({ ...base, busy })), ["10:00-16:00"]);
});

test("slots shorter than the minimum are dropped", () => {
  const busy = [iv("10:00", "11:00"), iv("11:10", "12:00")];
  assert.deepEqual(fmt(computeFreeSlots({ ...base, minSlotMin: 15, busy })), ["09:00-10:00", "12:00-17:00"]);
});

test("an all-day event leaves nothing", () => {
  const busy = [{ start: d("00:00"), end: new Date("2026-05-05T00:00:00Z") }];
  assert.deepEqual(computeFreeSlots({ ...base, busy }), []);
});

test("input order does not matter and inputs are not mutated", () => {
  const a = [iv("14:00", "15:00"), iv("10:00", "11:00")];
  const copy = a.map((x) => ({ ...x }));
  assert.deepEqual(fmt(computeFreeSlots({ ...base, busy: a })), ["09:00-10:00", "11:00-14:00", "15:00-17:00"]);
  assert.deepEqual(a, copy);
});

test("capacity: free vs planned and the overloaded flag", () => {
  const slots = computeFreeSlots({ ...base, busy: [iv("12:00", "13:00")] }); // 7h free
  assert.equal(totalMinutes(slots), 420);
  assert.deepEqual(computeCapacity(slots, 300), { freeMin: 420, plannedMin: 300, overloaded: false });
  assert.deepEqual(computeCapacity(slots, 420), { freeMin: 420, plannedMin: 420, overloaded: false });
  assert.equal(computeCapacity(slots, 421).overloaded, true);
});

test("plannedMinutes clips to the window and ignores skipped blocks and breaks", () => {
  const w = iv("09:00", "17:00");
  const blocks = [
    { ...iv("08:00", "10:00"), kind: "task", status: "planned" }, // 60 inside
    { ...iv("10:00", "11:00"), kind: "starter", status: "done" }, // 60
    { ...iv("11:00", "12:00"), kind: "task", status: "skipped" }, // ignored
    { ...iv("12:00", "12:30"), kind: "break", status: "planned" }, // ignored
  ];
  assert.equal(plannedMinutes(blocks, w), 120);
});

test("capacity on DST days: an overnight-ish window has 1h less / more", () => {
  const LA = "America/Los_Angeles";
  const free = (date: string) => totalMinutes(computeFreeSlots({
    dayStart: workWindow(date, "01:00", "04:00", LA).start,
    dayEnd: workWindow(date, "01:00", "04:00", LA).end,
    busy: [], bufferMin: 0, minSlotMin: 15,
  }));
  assert.equal(free("2026-03-07"), 180);
  assert.equal(free("2026-03-08"), 120);
  assert.equal(free("2026-11-01"), 240);
});

test("freeAroundBlocks cuts blocks out of free slots and ignores skipped ones", () => {
  const slots = [iv("09:00", "17:00")];
  const blocks = [{ ...iv("10:00", "11:00"), status: "planned" }, { ...iv("13:00", "14:00"), status: "skipped" }];
  assert.deepEqual(fmt(freeAroundBlocks(slots, blocks, 30)), ["09:00-10:00", "11:00-17:00"]);
  assert.deepEqual(fmt(freeAroundBlocks(slots, [{ ...iv("09:20", "16:40"), status: "planned" }], 30)), []);
});
