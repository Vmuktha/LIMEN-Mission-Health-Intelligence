import assert from "node:assert/strict";
import test from "node:test";
import { applyClockwiseFeedbackRotation } from "@/lib/assessment/cursor-transform";
import { clientPointToTaskCoordinate, displayedCursorCoordinate, hasMovementOnset, isDisplayedCursorInTarget } from "@/lib/assessment/interaction";
import { appendDisplayedCursorTrajectoryPoint, appendTrajectoryPoint, beginNextTrial, completeActiveTrial, createTrialEngineState, invalidateActiveTrial, markMovementOnset, startAssessment } from "@/lib/assessment/trial-engine";
import { createAssessmentProtocol } from "@/lib/assessment/protocol";

const bounds = { left: 40, top: 80, width: 600, height: 420 };
const time = "2026-01-01T00:00:00.000Z";
const protocol = createAssessmentProtocol({ baselineTrials: 4, adaptationTrials: 4, lateAdaptationTrials: 4, washoutTrials: 4 });

test("client pointer coordinates are converted to task-local CSS pixels without invented values", () => {
  assert.deepEqual(clientPointToTaskCoordinate(140, 130, bounds), { x: 100, y: 50 });
  assert.equal(clientPointToTaskCoordinate(Number.NaN, 130, bounds), null);
  assert.equal(clientPointToTaskCoordinate(140, 130, { ...bounds, width: 0 }), null);
});

test("displayed cursor uses the existing clockwise screen-space transform", () => {
  const start = { x: 100, y: 100 };
  const actual = { x: 140, y: 100 };
  assert.deepEqual(displayedCursorCoordinate(actual, start, "none"), actual);
  const expected = applyClockwiseFeedbackRotation(actual, start);
  assert.deepEqual(displayedCursorCoordinate(actual, start, "clockwise-45-degrees"), expected);
  assert.ok(expected.y > start.y, "a rightward actual movement rotates toward screen-bottom");
});

test("movement onset and target acquisition use their distinct coordinate paths", () => {
  const start = { x: 100, y: 100 };
  assert.equal(hasMovementOnset(start, { x: 102.9, y: 100 }), false);
  assert.equal(hasMovementOnset(start, { x: 103, y: 100 }), true);
  const target = { direction: "right" as const, x: 150, y: 100 };
  assert.equal(isDisplayedCursorInTarget({ x: 150, y: 100 }, target, 22), true);
  assert.equal(isDisplayedCursorInTarget({ x: 125, y: 100 }, target, 22), false);
});

test("cancelled interactions remain invalid and duplicate completion is rejected", () => {
  let state = startAssessment(createTrialEngineState("interaction-session", protocol, () => 0));
  state = beginNextTrial(state, { x: 100, y: 100 }, 50, time);
  state = invalidateActiveTrial(state, "pointer cancelled");
  assert.equal(state.records[0].outcome, "invalid");
  assert.match(state.records[0].invalidReason ?? "", /cancelled/);

  state = beginNextTrial(state, { x: 100, y: 100 }, 50, time);
  state = appendTrajectoryPoint(state, { x: 100, y: 50, elapsedMs: 10 });
  state = appendDisplayedCursorTrajectoryPoint(state, { x: 100, y: 50, elapsedMs: 10 });
  state = markMovementOnset(state, "2026-01-01T00:00:00.010Z");
  state = completeActiveTrial(state, "2026-01-01T00:00:00.020Z");
  assert.equal(state.records[1].displayedCursorTrajectory?.length, 1);
  assert.throws(() => completeActiveTrial(state, "2026-01-01T00:00:00.030Z"), /active trial/);
});
