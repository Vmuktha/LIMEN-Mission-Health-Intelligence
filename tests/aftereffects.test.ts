import assert from "node:assert/strict";
import test from "node:test";
import { calculateWashoutAftereffect } from "@/lib/analytics/aftereffects";
import { completedTrial, withPhase } from "./test-fixtures";

test("washout aftereffect uses baseline and the first ordered washout trial window", () => {
  const baseline = withPhase(completedTrial(), "baseline", 1);
  const laterWashout = withPhase(completedTrial({ trajectory: [{ x: -10, y: 0, elapsedMs: 100 }] }), "de-adaptation", 12);
  const initialWashout = withPhase(completedTrial({ trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] }), "de-adaptation", 10);
  const result = calculateWashoutAftereffect([laterWashout, baseline, initialWashout], 1);
  assert.equal(result.baselineMeanDirectionalErrorDegrees, 0);
  assert.equal(result.initialWashoutMeanDirectionalErrorDegrees, 90);
  assert.equal(result.signedAftereffectDegrees, 90);
  assert.equal(result.magnitudeDegrees, 90);
  assert.equal(result.validWashoutTrialCount, 1);
});

test("washout aftereffect never pools v0.2.0 and v0.3.0 trials", () => {
  const baseline = withPhase(completedTrial(), "baseline", 1);
  const v3Washout = withPhase(completedTrial({ measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor", trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] }), "de-adaptation", 2);
  const result = calculateWashoutAftereffect([baseline, v3Washout], 4);
  assert.equal(result.baselineMeanDirectionalErrorDegrees, null);
  assert.equal(result.initialWashoutMeanDirectionalErrorDegrees, null);
  assert.equal(result.signedAftereffectDegrees, null);
  assert.equal(result.magnitudeDegrees, null);
  assert.equal(result.validBaselineTrialCount, 0);
  assert.equal(result.validWashoutTrialCount, 0);
});

test("aftereffect reports null for empty, missing, or insufficient eligible samples", () => {
  const empty = calculateWashoutAftereffect([], 4);
  assert.equal(empty.magnitudeDegrees, null);
  const baseline = withPhase(completedTrial(), "baseline", 1);
  const invalidWashout = withPhase(completedTrial({ outcome: "timed-out", trajectory: [] }), "de-adaptation", 2);
  const result = calculateWashoutAftereffect([baseline, invalidWashout], 1);
  assert.equal(result.initialWashoutMeanDirectionalErrorDegrees, null);
  assert.equal(result.signedAftereffectDegrees, null);
  assert.throws(() => calculateWashoutAftereffect([baseline], 0), /positive integer/);
});
