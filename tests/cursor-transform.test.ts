import assert from "node:assert/strict";
import test from "node:test";
import { applyClockwiseFeedbackRotation, removeClockwiseFeedbackRotation, rotateScreenVectorClockwise } from "@/lib/assessment/cursor-transform";

function close(actual: number, expected: number): void { assert.ok(Math.abs(actual - expected) < 1e-10, `expected ${expected}, received ${actual}`); }

test("zero-degree rotation leaves a screen vector unchanged", () => {
  assert.deepEqual(rotateScreenVectorClockwise({ x: 12, y: -4 }, 0), { x: 12, y: -4 });
});

test("positive 45-degree feedback rotates screen-right toward screen-bottom", () => {
  const transformed = rotateScreenVectorClockwise({ x: 10, y: 0 }, 45);
  close(transformed.x, 5 * Math.sqrt(2));
  close(transformed.y, 5 * Math.sqrt(2));
});

test("feedback rotation is centred on the supplied start position", () => {
  const transformed = applyClockwiseFeedbackRotation({ x: 30, y: 20 }, { x: 20, y: 20 }, 90);
  assert.deepEqual(transformed, { x: 20, y: 30 });
  assert.deepEqual(applyClockwiseFeedbackRotation({ x: 20, y: 20 }, { x: 20, y: 20 }), { x: 20, y: 20 });
});

test("inverse feedback rotation restores original coordinates", () => {
  const origin = { x: 120, y: 80 };
  const actual = { x: 170, y: 45 };
  const restored = removeClockwiseFeedbackRotation(applyClockwiseFeedbackRotation(actual, origin), origin);
  close(restored.x, actual.x);
  close(restored.y, actual.y);
});

test("non-finite coordinates and angles are rejected", () => {
  assert.throws(() => rotateScreenVectorClockwise({ x: Number.NaN, y: 0 }, 45), /finite/);
  assert.throws(() => applyClockwiseFeedbackRotation({ x: 0, y: 0 }, { x: Infinity, y: 0 }), /finite/);
  assert.throws(() => removeClockwiseFeedbackRotation({ x: 0, y: 0 }, { x: 0, y: 0 }, Number.NaN), /finite/);
});
