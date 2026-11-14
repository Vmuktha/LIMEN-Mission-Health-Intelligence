import assert from "node:assert/strict";
import test from "node:test";
import { calculateDirectionalError, calculateTrajectoryDeviation, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { canProcessPointerEvent, hasCompletedPositioning, isWithinStartTolerance, remainingPositioningDwellMs, START_POSITION_DWELL_MS } from "@/lib/assessment/interaction";
import { beginTrialPositioning, createTrialEngineState, presentTargetAfterPositioning, startAssessment } from "@/lib/assessment/trial-engine";
import { createAssessmentProtocol } from "@/lib/assessment/protocol";
import { calculateWashoutAftereffect } from "@/lib/analytics/aftereffects";
import { completedTrial, withPhase } from "./test-fixtures";

const protocol = createAssessmentProtocol({ baselineTrials: 4, adaptationTrials: 4, lateAdaptationTrials: 4, washoutTrials: 4 });

test("positioning uses inclusive tolerance and a deterministic dwell requirement", () => {
  const marker = { x: 100, y: 100 };
  assert.equal(isWithinStartTolerance({ x: 112, y: 100 }, marker), true);
  assert.equal(isWithinStartTolerance({ x: 112.01, y: 100 }, marker), false);
  assert.equal(hasCompletedPositioning(10, 10 + START_POSITION_DWELL_MS - 1), false);
  assert.equal(hasCompletedPositioning(10, 10 + START_POSITION_DWELL_MS), true);
  assert.equal(hasCompletedPositioning(null, 1000), false);
  assert.equal(remainingPositioningDwellMs(10, 10 + START_POSITION_DWELL_MS - 1), 1);
  assert.equal(remainingPositioningDwellMs(10, 10 + START_POSITION_DWELL_MS), 0);
});

test("pointer events are accepted during positioning even before an active target exists", () => {
  assert.equal(canProcessPointerEvent(true, false, true), true);
  assert.equal(canProcessPointerEvent(true, false, false), false);
  assert.equal(canProcessPointerEvent(false, false, true), false);
});

test("a target cannot exist before actual-start capture and uses actual-start geometry after positioning", () => {
  let state = startAssessment(createTrialEngineState("origin-session", protocol, () => 0));
  state = beginTrialPositioning(state, { x: 100, y: 100 });
  assert.equal(state.activeTrial, null);
  assert.deepEqual(state.positioningTrial?.designatedStartPosition, { x: 100, y: 100 });
  state = presentTargetAfterPositioning(state, { x: 108, y: 96 }, 50, "2026-01-01T00:00:01.000Z", "2026-01-01T00:00:01.000Z");
  assert.deepEqual(state.activeTrial?.actualStartPosition, { x: 108, y: 96 });
  assert.deepEqual(state.activeTrial?.designatedStartPosition, { x: 100, y: 100 });
  assert.equal(Math.hypot((state.activeTrial?.target.x ?? 0) - 108, (state.activeTrial?.target.y ?? 0) - 96), 50);
});

test("directional error and trajectory deviation use actual origin, while legacy-origin trials are unavailable", () => {
  const corrected = completedTrial({ startPosition: { x: 0, y: 0 }, designatedStartPosition: { x: 0, y: 0 }, actualStartPosition: { x: 100, y: 100 }, target: { direction: "right", x: 110, y: 100 }, trajectory: [{ x: 110, y: 100, elapsedMs: 10 }] });
  assert.equal(calculateDirectionalError(corrected).value, 0);
  assert.equal(calculateTrajectoryDeviation(corrected).value, 0);
  const legacy = { ...corrected, measurementProtocolVersion: "0.1.0-legacy-origin-unverified" as const, actualStartPosition: undefined };
  assert.equal(calculateDirectionalError(legacy).value, null);
  assert.equal(calculateTrajectoryDeviation(legacy).value, null);
});

test("legacy and corrected records do not pool into phase or aftereffect summaries", () => {
  const correctedBaseline = withPhase(completedTrial(), "baseline", 0);
  const legacyWashout = withPhase({ ...completedTrial(), measurementProtocolVersion: "0.1.0-legacy-origin-unverified" as const, actualStartPosition: undefined }, "de-adaptation", 64);
  const phase = summarizePhaseMetrics([correctedBaseline, legacyWashout], "de-adaptation");
  assert.equal(phase.meanDirectionalErrorDegrees, null);
  const aftereffect = calculateWashoutAftereffect([correctedBaseline, legacyWashout]);
  assert.equal(aftereffect.signedAftereffectDegrees, null);
});
