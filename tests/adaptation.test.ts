import assert from "node:assert/strict";
import test from "node:test";
import { calculateAdaptationDirectionalErrorTrend, calculateAdaptationSummary } from "@/lib/analytics/adaptation";
import { completedTrial, legacyTrial, withPhase } from "./test-fixtures";

test("adaptation trend preserves supplied trial order and nulls invalid measurements", () => {
  const trials = [
    withPhase(completedTrial({ trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] }), "early-adaptation", 4),
    withPhase(completedTrial({ trajectory: [{ x: 0, y: -10, elapsedMs: 100 }] }), "late-adaptation", 7),
    withPhase(completedTrial({ outcome: "timed-out", trajectory: [] }), "early-adaptation", 8),
  ];
  assert.deepEqual(calculateAdaptationDirectionalErrorTrend(trials), [
    { trialId: "early-adaptation-4", index: 4, phase: "early-adaptation", directionErrorDegrees: 90, eligible: true },
    { trialId: "late-adaptation-7", index: 7, phase: "late-adaptation", directionErrorDegrees: 0, eligible: true },
    { trialId: "early-adaptation-8", index: 8, phase: "early-adaptation", directionErrorDegrees: null, eligible: false },
  ]);
});

test("adaptation summary compares early and late phases without crossing phase boundaries", () => {
  const early = withPhase(completedTrial({ trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] }), "early-adaptation", 1);
  const late = withPhase(completedTrial({ trajectory: [{ x: 0, y: -10, elapsedMs: 100 }] }), "late-adaptation", 2);
  const washout = withPhase(completedTrial({ trajectory: [{ x: -10, y: 0, elapsedMs: 100 }] }), "de-adaptation", 3);
  const summary = calculateAdaptationSummary([early, late, washout]);
  assert.equal(summary.earlyAdaptation.meanDirectionalErrorDegrees, 90);
  assert.equal(summary.lateAdaptation.meanDirectionalErrorDegrees, 0);
  assert.equal(summary.directionalErrorChangeDegrees, -90);
});

test("adaptation summary is null when an adaptation phase has no eligible samples", () => {
  const earlyOnly = withPhase(completedTrial(), "early-adaptation", 1);
  const summary = calculateAdaptationSummary([earlyOnly]);
  assert.equal(summary.lateAdaptation.meanDirectionalErrorDegrees, null);
  assert.equal(summary.directionalErrorChangeDegrees, null);
});

test("mixed measurement protocols withhold all pooled adaptation metrics", () => {
  const early = withPhase(completedTrial(), "early-adaptation", 1);
  const legacyLate = withPhase(legacyTrial(), "late-adaptation", 2);
  const summary = calculateAdaptationSummary([early, legacyLate]);
  // The whole collection is mixed, so no phase is presented as a comparable group.
  assert.equal(summary.earlyAdaptation.meanDirectionalErrorDegrees, null);
  assert.equal(summary.lateAdaptation.meanDirectionalErrorDegrees, null);
  assert.equal(summary.directionalErrorChangeDegrees, null);
  assert.equal(summary.earlyAdaptation.meanReactionTimeMs, null);
  assert.equal(summary.earlyAdaptation.meanMovementTimeMs, null);
  assert.equal(summary.lateAdaptation.meanReactionTimeMs, null);
  assert.equal(summary.lateAdaptation.meanMovementTimeMs, null);
});

test("v0.2.0 and v0.3.0 adaptation trials are never pooled", () => {
  const v2Early = withPhase(completedTrial({ trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] }), "early-adaptation", 1);
  const v3Late = withPhase(completedTrial({ measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor", trajectory: [{ x: 0, y: -10, elapsedMs: 100 }] }), "late-adaptation", 2);
  const summary = calculateAdaptationSummary([v2Early, v3Late]);
  assert.equal(summary.earlyAdaptation.meanDirectionalErrorDegrees, null);
  assert.equal(summary.lateAdaptation.meanDirectionalErrorDegrees, null);
  assert.equal(summary.directionalErrorChangeDegrees, null);
  assert.equal(summary.earlyAdaptation.meanReactionTimeMs, null);
  assert.equal(summary.lateAdaptation.meanMovementTimeMs, null);
});

test("adaptation trend marks every point ineligible when the collection mixes protocols", () => {
  const v2 = withPhase(completedTrial({ trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] }), "early-adaptation", 1);
  const v3 = withPhase(completedTrial({ measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor", trajectory: [{ x: 0, y: -10, elapsedMs: 100 }] }), "late-adaptation", 2);
  const trend = calculateAdaptationDirectionalErrorTrend([v2, v3]);
  assert.deepEqual(trend.map((point) => point.eligible), [false, false]);
  assert.deepEqual(trend.map((point) => point.directionErrorDegrees), [null, null]);
});
