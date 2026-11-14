import assert from "node:assert/strict";
import test from "node:test";
import { calculateCorrectionBehaviour, calculateDirectionalError, calculateMovementTime, calculateReactionTime, calculateTrialMeasurements, calculateTrajectoryDeviation, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { completedTrial, legacyTrial } from "./test-fixtures";

function close(actual: number | null, expected: number): void {
  if (actual === null) assert.fail("Expected a numeric value, received null.");
  assert.ok(Math.abs(actual - expected) < 1e-10, `expected ${expected}, received ${actual}`);
}

test("reaction and movement time use milliseconds and reject invalid timing", () => {
  const trial = completedTrial();
  assert.deepEqual(calculateReactionTime(trial), { metric: "reaction-time", value: 100, unit: "milliseconds", valid: true });
  assert.deepEqual(calculateMovementTime(trial), { metric: "movement-time", value: 200, unit: "milliseconds", valid: true });
  assert.equal(calculateMovementTime(completedTrial({ movementCompletedAt: "2026-01-01T00:00:00.100Z" })).value, null);
  assert.equal(calculateReactionTime(completedTrial({ movementOnsetAt: null })).value, null);
  assert.equal(calculateMovementTime(completedTrial({ movementCompletedAt: "2025-12-31T23:59:59.000Z" })).value, null);
});

test("trial measurements expose directional error under its corrected name", () => {
  const measurements = calculateTrialMeasurements(completedTrial());
  assert.equal(measurements.directionalError.metric, "directional-error");
  assert.equal("directionalErrorAtPeakVelocity" in measurements, false);
});

test("directional error uses signed clockwise screen-space degrees", () => {
  const clockwise = completedTrial({ trajectory: [{ x: 10, y: 0, elapsedMs: 100 }] });
  const counterclockwise = completedTrial({ trajectory: [{ x: -10, y: 0, elapsedMs: 100 }] });
  const straight = completedTrial();
  close(calculateDirectionalError(clockwise).value, 90);
  close(calculateDirectionalError(counterclockwise).value, -90);
  close(calculateDirectionalError(straight).value, 0);
  assert.equal(calculateDirectionalError(completedTrial({ outcome: "invalid" })).value, null);
  assert.equal(calculateDirectionalError(straight).signConvention, "positive-clockwise");
});

test("trajectory deviation is RMS perpendicular distance in CSS pixels", () => {
  const straight = completedTrial({ target: { direction: "right", x: 10, y: 0 }, trajectory: [{ x: 5, y: 0, elapsedMs: 100 }, { x: 10, y: 0, elapsedMs: 200 }] });
  const deviating = completedTrial({ target: { direction: "right", x: 10, y: 0 }, trajectory: [{ x: 5, y: 3, elapsedMs: 100 }, { x: 10, y: 0, elapsedMs: 200 }] });
  close(calculateTrajectoryDeviation(straight).value, 0);
  close(calculateTrajectoryDeviation(deviating).value, 3 / Math.sqrt(2));
  assert.equal(calculateTrajectoryDeviation(completedTrial({ trajectory: [] })).value, null);
});

test("correction behaviour counts heading turns and finds peak segment velocity time", () => {
  const trial = completedTrial({ target: { direction: "right", x: 12, y: 3 }, trajectory: [{ x: 6, y: 0, elapsedMs: 100 }, { x: 6, y: 3, elapsedMs: 200 }, { x: 12, y: 3, elapsedMs: 250 }] });
  assert.deepEqual(calculateCorrectionBehaviour(trial), { metric: "correction-behaviour", correctionCount: 2, peakVelocityElapsedMs: 250, valid: true });
});

test("phase summaries preserve empty, invalid, and mixed collections without zero imputation", () => {
  const empty = summarizePhaseMetrics([], "baseline");
  assert.deepEqual(empty, { phase: "baseline", totalTrialCount: 0, validTrialCount: 0, meanDirectionalErrorDegrees: null, meanReactionTimeMs: null, meanMovementTimeMs: null });
  const valid = completedTrial({ phase: "baseline" });
  const invalid = completedTrial({ id: "invalid", phase: "baseline", outcome: "timed-out", movementOnsetAt: null, movementCompletedAt: null, trajectory: [] });
  const summary = summarizePhaseMetrics([valid, invalid], "baseline");
  assert.equal(summary.totalTrialCount, 2);
  assert.equal(summary.validTrialCount, 1);
  close(summary.meanDirectionalErrorDegrees, 0);
  close(summary.meanReactionTimeMs, 100);
  close(summary.meanMovementTimeMs, 200);
});

test("homogeneous legacy phases keep timing, while mixed protocols pool nothing", () => {
  const legacyOnly = summarizePhaseMetrics([legacyTrial({ phase: "baseline" })], "baseline");
  assert.equal(legacyOnly.validTrialCount, 0);
  assert.equal(legacyOnly.meanDirectionalErrorDegrees, null);
  close(legacyOnly.meanReactionTimeMs, 100);
  close(legacyOnly.meanMovementTimeMs, 200);

  const v2 = completedTrial({ phase: "baseline" });
  const v3 = completedTrial({ id: "v3", phase: "baseline", measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor" });
  const mixedProtocols = summarizePhaseMetrics([v2, v3], "baseline");
  assert.equal(mixedProtocols.validTrialCount, 0);
  assert.equal(mixedProtocols.meanDirectionalErrorDegrees, null);
  assert.equal(mixedProtocols.meanReactionTimeMs, null);
  assert.equal(mixedProtocols.meanMovementTimeMs, null);

  const mixedOrigin = summarizePhaseMetrics([v2, legacyTrial({ id: "legacy", phase: "baseline" })], "baseline");
  assert.equal(mixedOrigin.validTrialCount, 0);
  assert.equal(mixedOrigin.meanDirectionalErrorDegrees, null);
  assert.equal(mixedOrigin.meanReactionTimeMs, null);
  assert.equal(mixedOrigin.meanMovementTimeMs, null);
});

test("inconsistent origin provenance keeps timing but withholds origin-sensitive means", () => {
  const valid = completedTrial({ phase: "baseline" });
  const unpositioned = completedTrial({ id: "unpositioned", phase: "baseline", positioningCompletedAt: undefined });
  const summary = summarizePhaseMetrics([valid, unpositioned], "baseline");
  assert.equal(summary.validTrialCount, 0);
  assert.equal(summary.meanDirectionalErrorDegrees, null);
  close(summary.meanReactionTimeMs, 100);
  close(summary.meanMovementTimeMs, 200);
});

test("unknown or missing measurement versions withhold all pooled phase metrics", () => {
  const noVersion = { ...completedTrial({ phase: "baseline" }), measurementProtocolVersion: undefined };
  const summary = summarizePhaseMetrics([noVersion], "baseline");
  assert.equal(summary.validTrialCount, 0);
  assert.equal(summary.meanDirectionalErrorDegrees, null);
  assert.equal(summary.meanReactionTimeMs, null);
  assert.equal(summary.meanMovementTimeMs, null);
});
