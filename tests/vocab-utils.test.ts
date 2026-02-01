import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMonthKey,
  isCorruptedMeaning,
  resolveQuestionCount,
} from "../src/lib/vocab-utils";

test("buildMonthKey returns UTC year-month", () => {
  const date = new Date("2026-02-01T12:00:00Z");
  assert.equal(buildMonthKey(date), "2026-02");
});

test("isCorruptedMeaning flags known corrupted values", () => {
  assert.equal(isCorruptedMeaning("text", 1), true);
  assert.equal(isCorruptedMeaning("abc\uFFFD", 0), true);
  assert.equal(isCorruptedMeaning("normal", 0), false);
});

test("resolveQuestionCount respects requested and available counts", () => {
  assert.equal(resolveQuestionCount(0, 50, 8), 50);
  assert.equal(resolveQuestionCount(5.9, 50, 8), 5);
  assert.equal(resolveQuestionCount(999, 12, 8), 12);
  assert.equal(resolveQuestionCount(Number.NaN, 20, 8), 8);
});
