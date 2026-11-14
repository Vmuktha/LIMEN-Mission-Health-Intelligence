import assert from "node:assert/strict";
import test from "node:test";
import { createAssessmentProtocol } from "@/lib/assessment/protocol";
import { abortAssessment, appendTrajectoryPoint, beginNextTrial, beginTrialPositioning, completeActiveTrial, createTrialEngineState, markActiveTrialMissed, markMovementOnset, pauseAssessment, presentTargetAfterPositioning, resumeAssessment, startAssessment } from "@/lib/assessment/trial-engine";
import { calculateDirectionalError, calculateTrialMeasurements, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { isCorrectedOriginTrial, measurementValidityForSession } from "@/lib/assessment/measurement-validity";
import { CURRENT_MEASUREMENT_PROTOCOL_VERSION } from "@/lib/assessment/protocol";
import { buildCompletedAssessmentSession, canPersistCompletedSession } from "@/lib/assessment/session-record";

const protocol = createAssessmentProtocol({ baselineTrials: 4, adaptationTrials: 4, lateAdaptationTrials: 4, washoutTrials: 4 });
const random = () => 0.5;
const center = { x: 100, y: 100 };
const presentedAt = "2026-01-01T00:00:00.000Z";

test("initialization preserves session identity, balanced plan, and deterministic ordering", () => {
  const state = createTrialEngineState("session-a", protocol, random);
  assert.equal(state.status, "ready");
  assert.equal(state.sessionId, "session-a");
  assert.equal(state.plannedTrials.length, 16);
  assert.deepEqual(state.plannedTrials.map((trial) => trial.id), createTrialEngineState("session-a", protocol, random).plannedTrials.map((trial) => trial.id));
});

test("start, pause between trials, resume, and completion retain trial metadata", () => {
  let state = startAssessment(createTrialEngineState("session-b", protocol, random));
  state = beginNextTrial(state, center, 25, presentedAt);
  assert.equal(state.activeTrial?.plan.phase, "baseline");
  assert.equal(state.activeTrial?.plan.index, 0);
  state = appendTrajectoryPoint(state, { x: 100, y: 80, elapsedMs: 100 });
  state = markMovementOnset(state, "2026-01-01T00:00:00.100Z");
  state = completeActiveTrial(state, "2026-01-01T00:00:00.300Z");
  state = pauseAssessment(state);
  assert.equal(state.status, "paused");
  assert.throws(() => appendTrajectoryPoint(state, { x: 100, y: 80, elapsedMs: 10 }), /active trial/);
  state = resumeAssessment(state);
  assert.equal(state.status, "running");
  state = beginNextTrial(state, center, 25, presentedAt);
  state = appendTrajectoryPoint(state, { x: 100, y: 80, elapsedMs: 100 });
  state = markMovementOnset(state, "2026-01-01T00:00:01.100Z");
  state = completeActiveTrial(state, "2026-01-01T00:00:01.300Z");
  assert.equal(state.records.length, 2);
  assert.equal(state.records[0].sessionId, "session-b");
  assert.equal(state.records[0].index, 0);
  assert.equal(state.records[0].outcome, "completed");
  assert.equal(state.nextTrialIndex, 2);
});

test("pausing during an active trial invalidates it so paused time cannot enter timing", () => {
  let state = startAssessment(createTrialEngineState("pause-session", protocol, random));
  state = beginNextTrial(state, center, 25, presentedAt);
  state = appendTrajectoryPoint(state, { x: 100, y: 70, elapsedMs: 100 });
  state = markMovementOnset(state, "2026-01-01T00:00:00.100Z");
  state = pauseAssessment(state);
  assert.equal(state.status, "paused");
  assert.equal(state.activeTrial, null);
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].outcome, "invalid");
  assert.match(state.records[0].invalidReason ?? "", /paused/i);
  assert.equal(state.records[0].movementCompletedAt, null);
  assert.equal(calculateTrialMeasurements(state.records[0]).reactionTime.value, null);
  assert.equal(calculateTrialMeasurements(state.records[0]).movementTime.value, null);
  assert.equal(state.nextTrialIndex, 1);
  state = resumeAssessment(state);
  assert.equal(state.status, "running");
});

test("pausing during positioning creates no record and resumes with fresh positioning", () => {
  let state = startAssessment(createTrialEngineState("pause-positioning", protocol, random));
  state = beginTrialPositioning(state, center);
  state = pauseAssessment(state);
  assert.equal(state.status, "paused");
  assert.equal(state.positioningTrial, null);
  assert.equal(state.records.length, 0);
  assert.equal(state.nextTrialIndex, 0);
  state = resumeAssessment(state);
  assert.equal(state.status, "running");
  state = beginTrialPositioning(state, center);
  assert.equal(state.positioningTrial?.plan.index, 0);
});

test("pausing during the final active trial completes the assessment and preserves the invalid record", () => {
  const epoch = Date.parse("2026-01-01T00:00:00.000Z");
  const timestamp = (index: number, offsetMs: number) => new Date(epoch + index * 1_000 + offsetMs).toISOString();
  const totalTrials = protocol.phases.reduce((total, phase) => total + phase.trialCount, 0);
  let state = startAssessment(createTrialEngineState("final-pause", protocol, random));

  for (let index = 0; index < totalTrials - 1; index += 1) {
    state = beginTrialPositioning(state, center);
    state = presentTargetAfterPositioning(state, center, 25, timestamp(index, 0), timestamp(index, 0));
    state = appendTrajectoryPoint(state, { x: center.x, y: center.y - 10, elapsedMs: 100 });
    state = markMovementOnset(state, timestamp(index, 100));
    state = completeActiveTrial(state, timestamp(index, 300));
  }
  assert.equal(state.nextTrialIndex, totalTrials - 1);

  const finalIndex = totalTrials - 1;
  state = beginTrialPositioning(state, center);
  state = presentTargetAfterPositioning(state, center, 25, timestamp(finalIndex, 0), timestamp(finalIndex, 0));
  state = appendTrajectoryPoint(state, { x: center.x, y: center.y - 10, elapsedMs: 100 });
  state = markMovementOnset(state, timestamp(finalIndex, 100));
  const paused = pauseAssessment(state);

  assert.equal(paused.status, "completed");
  assert.equal(paused.records.length, totalTrials);
  const finalRecord = paused.records[totalTrials - 1];
  assert.equal(finalRecord.index, finalIndex);
  assert.equal(finalRecord.outcome, "invalid");
  assert.match(finalRecord.invalidReason ?? "", /paused/i);
  assert.equal(finalRecord.movementCompletedAt, null);
  assert.deepEqual(finalRecord.trajectory, [{ x: center.x, y: center.y - 10, elapsedMs: 100 }]);
  assert.deepEqual(finalRecord.actualStartPosition, center);
  assert.equal(finalRecord.measurementProtocolVersion, CURRENT_MEASUREMENT_PROTOCOL_VERSION);
  assert.equal(calculateTrialMeasurements(finalRecord).reactionTime.value, null);
  assert.equal(calculateTrialMeasurements(finalRecord).movementTime.value, null);

  const session = buildCompletedAssessmentSession(paused, timestamp(0, 0), "mouse", timestamp(totalTrials, 0));
  assert.equal(session.trials.length, totalTrials);
  assert.equal(session.trials[totalTrials - 1].outcome, "invalid");
  assert.equal(session.metadata.protocolVersion, "0.3.0");
  assert.equal(measurementValidityForSession(session), "corrected-actual-origin");
  const washout = session.phaseSummaries.find((phase) => phase.phase === "de-adaptation");
  assert.equal(washout?.totalTrialCount, 4);
  assert.equal(washout?.validTrialCount, 3);

  // The hook delegates its exactly-once guard to this pure predicate.
  let persisted = false;
  assert.equal(canPersistCompletedSession(paused, persisted, timestamp(0, 0)), true);
  persisted = true;
  assert.equal(canPersistCompletedSession(paused, persisted, timestamp(0, 0)), false);
  assert.equal(canPersistCompletedSession(null, false, timestamp(0, 0)), false);
  assert.equal(canPersistCompletedSession(paused, false, null), false);
});

test("non-positioning beginNextTrial never claims a verified actual origin", () => {
  let state = startAssessment(createTrialEngineState("legacy-path", protocol, random));
  state = beginNextTrial(state, center, 25, presentedAt);
  state = appendTrajectoryPoint(state, { x: 100, y: 70, elapsedMs: 100 });
  state = markMovementOnset(state, "2026-01-01T00:00:00.100Z");
  state = completeActiveTrial(state, "2026-01-01T00:00:00.300Z");
  const record = state.records[0];
  assert.equal(record.measurementProtocolVersion, "0.1.0-legacy-origin-unverified");
  assert.equal(record.actualStartPosition, undefined);
  assert.equal(record.positioningCompletedAt, undefined);
  assert.equal(isCorrectedOriginTrial(record), false);
  assert.equal(calculateDirectionalError(record).value, null);
  // Reaction and movement times remain available without origin verification.
  assert.equal(calculateTrialMeasurements(record).reactionTime.value, 100);
  assert.equal(calculateTrialMeasurements(record).movementTime.value, 200);
  assert.equal(summarizePhaseMetrics(state.records, "baseline").meanReactionTimeMs, 100);
});

test("positioning-based trials carry the current verified-origin protocol version", () => {
  let state = startAssessment(createTrialEngineState("verified-path", protocol, random));
  state = beginTrialPositioning(state, center);
  state = presentTargetAfterPositioning(state, { x: 104, y: 99 }, 50, presentedAt, presentedAt);
  state = appendTrajectoryPoint(state, { x: 104, y: 69, elapsedMs: 100 });
  state = markMovementOnset(state, "2026-01-01T00:00:00.100Z");
  state = completeActiveTrial(state, "2026-01-01T00:00:00.300Z");
  const record = state.records[0];
  assert.equal(record.measurementProtocolVersion, CURRENT_MEASUREMENT_PROTOCOL_VERSION);
  assert.deepEqual(record.actualStartPosition, { x: 104, y: 99 });
  assert.equal(isCorrectedOriginTrial(record), true);
  assert.equal(calculateDirectionalError(record).valid, true);
});

test("timeout and missing-onset completion remain explicit non-success outcomes", () => {
  let state = startAssessment(createTrialEngineState("session-c", protocol, random));
  state = beginNextTrial(state, center, 25, presentedAt);
  state = markActiveTrialMissed(state);
  assert.equal(state.records[0].outcome, "timed-out");
  assert.equal(calculateTrialMeasurements(state.records[0]).reactionTime.value, null);
  state = beginNextTrial(state, center, 25, presentedAt);
  state = completeActiveTrial(state, "2026-01-01T00:00:00.100Z");
  assert.equal(state.records[1].outcome, "invalid");
  assert.equal(state.records[1].movementCompletedAt, null);
  assert.equal(calculateTrialMeasurements(state.records[1]).movementTime.value, null);
});

test("abort persists an active trial as aborted and rejects invalid transitions", () => {
  const ready = createTrialEngineState("session-d", protocol, random);
  assert.throws(() => beginNextTrial(ready, center, 25, presentedAt), /running assessment/);
  let state = startAssessment(ready);
  state = beginNextTrial(state, center, 25, presentedAt);
  state = abortAssessment(state, "operator abort");
  assert.equal(state.status, "aborted");
  assert.equal(state.records[0].outcome, "aborted");
  assert.equal(state.records[0].invalidReason, "operator abort");
  assert.throws(() => resumeAssessment(state), /paused assessment/);
});
