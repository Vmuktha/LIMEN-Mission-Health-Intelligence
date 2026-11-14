import assert from "node:assert/strict";
import test from "node:test";
import { calculateMetricDelta, calculateRecoveryDeltas, selectPersonalReferenceSession } from "@/lib/analytics/baseline";
import { buildRecoveryDataset, findRecoveryMetric } from "@/lib/analytics/recovery";
import { PARTICIPANT, recoverySession, timedOutTrial, tunedTrial, V1, V2, V3 } from "./recovery-fixtures";

function close(actual: number | null, expected: number): void {
  if (actual === null) assert.fail("Expected a numeric value, received null.");
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, received ${actual}`);
}

function observationFor(dataset: ReturnType<typeof buildRecoveryDataset>, participantId: string, sessionId: string) {
  const observation = dataset.participants.find((participant) => participant.participantId === participantId)?.observations.find((candidate) => candidate.sessionId === sessionId);
  assert.ok(observation, `missing observation ${participantId}/${sessionId}`);
  return observation;
}

test("the default personal reference is the earliest eligible completed session", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "session-3", completedAt: "2026-03-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "session-1", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "session-2", completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  const selection = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "directional-error-mean" });
  assert.equal(selection.ok, true);
  if (!selection.ok) return;
  assert.equal(selection.reference.sessionId, "session-1");
  assert.equal(selection.reference.selection, "default-earliest-eligible");
  assert.equal(selection.reference.interpretation, "personal-reference-not-clinical-baseline");
});

test("reference selection is metric-specific: legacy timing can be eligible while origin metrics are not", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "legacy", measurementVersion: V1, completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "corrected", measurementVersion: V2, completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  const timing = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "reaction-time-mean" });
  assert.equal(timing.ok, true);
  if (timing.ok) assert.equal(timing.reference.sessionId, "legacy");

  const origin = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "directional-error-mean" });
  assert.equal(origin.ok, true);
  if (origin.ok) assert.equal(origin.reference.sessionId, "corrected");
});

test("an explicit reference is validated for existence, participant, metric, and protocol", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "a-early", participantId: "participant-a", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "a-late", participantId: "participant-a", completedAt: "2026-02-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "a-legacy", participantId: "participant-a", measurementVersion: V1, completedAt: "2026-01-15T00:10:00.000Z" }),
      recoverySession({ sessionId: "b-only", participantId: "participant-b", completedAt: "2026-01-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  });

  const explicit = selectPersonalReferenceSession(dataset, { participantId: "participant-a", metric: "directional-error-mean", referenceSessionId: "a-late" });
  assert.equal(explicit.ok, true);
  if (explicit.ok) {
    assert.equal(explicit.reference.sessionId, "a-late");
    assert.equal(explicit.reference.selection, "explicit-override");
  }

  const otherParticipant = selectPersonalReferenceSession(dataset, { participantId: "participant-a", metric: "directional-error-mean", referenceSessionId: "b-only" });
  assert.equal(otherParticipant.ok, false);
  if (!otherParticipant.ok) assert.equal(otherParticipant.reason, "participant-mismatch");

  const ineligibleMetric = selectPersonalReferenceSession(dataset, { participantId: "participant-a", metric: "directional-error-mean", referenceSessionId: "a-legacy" });
  assert.equal(ineligibleMetric.ok, false);
  if (!ineligibleMetric.ok) assert.equal(ineligibleMetric.reason, "metric-not-eligible");

  const missing = selectPersonalReferenceSession(dataset, { participantId: "participant-a", metric: "directional-error-mean", referenceSessionId: "does-not-exist" });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.reason, "session-not-found");
});

test("default selection skips earlier sessions with an incompatible measurement protocol", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "v3-earliest", measurementVersion: V3, completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "v2-later", measurementVersion: V2, completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  const compatible = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "directional-error-mean", requiredMeasurementProtocolVersion: V2 });
  assert.equal(compatible.ok, true);
  if (compatible.ok) assert.equal(compatible.reference.sessionId, "v2-later");

  const incompatible = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "directional-error-mean", referenceSessionId: "v3-earliest", requiredMeasurementProtocolVersion: V2 });
  assert.equal(incompatible.ok, false);
  if (!incompatible.ok) assert.equal(incompatible.reason, "incompatible-protocol");
});

test("v0.2.0 and v0.3.0 observations are never pooled into a metric comparison", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "v3-reference", measurementVersion: V3, completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "v2-current", measurementVersion: V2, completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  const reference = observationFor(dataset, PARTICIPANT, "v3-reference");
  const current = observationFor(dataset, PARTICIPANT, "v2-current");
  const delta = calculateMetricDelta(current, reference, "directional-error-mean");
  assert.equal(delta.comparisonValid, false);
  assert.equal(delta.change, null);
  assert.equal(delta.measurementVersion, null);
  assert.equal(delta.referenceValue, 0);
  assert.equal(delta.currentValue, 0);
  assert.match(delta.explanation ?? "", /differ/i);
  assert.match(delta.explanation ?? "", /never pooled/i);

  const timingDelta = calculateMetricDelta(current, reference, "reaction-time-mean");
  assert.equal(timingDelta.comparisonValid, false);
  assert.equal(timingDelta.change, null);

  const allDeltas = calculateRecoveryDeltas(current, reference);
  assert.equal(allDeltas.length, 8);
  assert.ok(allDeltas.every((candidate) => !candidate.comparisonValid && candidate.change === null));
});

test("legacy timing metrics compare across identical legacy versions, while origin metrics stay unavailable", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "legacy-reference", measurementVersion: V1, completedAt: "2026-01-01T00:10:00.000Z", trials: [tunedTrial({ reactionMs: 100 })] }),
      recoverySession({ sessionId: "legacy-current", measurementVersion: V1, completedAt: "2026-02-01T00:10:00.000Z", trials: [tunedTrial({ reactionMs: 150 })] }),
    ],
    checkIns: [],
  });
  const reference = observationFor(dataset, PARTICIPANT, "legacy-reference");
  const current = observationFor(dataset, PARTICIPANT, "legacy-current");
  const reaction = calculateMetricDelta(current, reference, "reaction-time-mean");
  assert.equal(reaction.comparisonValid, true);
  assert.equal(reaction.measurementVersion, V1);
  close(reaction.referenceValue, 100);
  close(reaction.currentValue, 150);
  close(reaction.change, 50);

  const directional = calculateMetricDelta(current, reference, "directional-error-mean");
  assert.equal(directional.comparisonValid, false);
  assert.equal(directional.change, null);
  assert.equal(directional.referenceValue, null);
  assert.match(directional.explanation ?? "", /Reference value is unavailable/i);
});

test("metric deltas use current minus reference with metric-specific units and trial counts", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z", trials: [tunedTrial({ reactionMs: 100, movementMs: 200, directionalErrorDegrees: 0 })] }),
      recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z", trials: [tunedTrial({ reactionMs: 150, movementMs: 250, directionalErrorDegrees: 10 })] }),
    ],
    checkIns: [],
  });
  const reference = observationFor(dataset, PARTICIPANT, "reference");
  const current = observationFor(dataset, PARTICIPANT, "current");

  const reaction = calculateMetricDelta(current, reference, "reaction-time-mean");
  assert.equal(reaction.comparisonValid, true);
  assert.equal(reaction.unit, "milliseconds");
  assert.equal(reaction.changeFormula, "currentValue - referenceValue");
  close(reaction.change, 50);
  assert.equal(reaction.referenceEligibleTrialCount, 1);
  assert.equal(reaction.referenceTotalTrialCount, 1);
  assert.equal(reaction.currentEligibleTrialCount, 1);

  const movement = calculateMetricDelta(current, reference, "movement-time-mean");
  assert.equal(movement.comparisonValid, true);
  close(movement.change, 50);

  const directional = calculateMetricDelta(current, reference, "directional-error-mean");
  assert.equal(directional.comparisonValid, true);
  assert.equal(directional.unit, "degrees");
  close(directional.change, 10);
  assert.equal(directional.interpretation, "descriptive-only-not-clinical-recovery");
});

test("missing reference or current values produce unavailable comparisons rather than zero", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "legacy-reference", measurementVersion: V1, completedAt: "2026-01-01T00:10:00.000Z", trials: [tunedTrial()] }),
      recoverySession({ sessionId: "missing-current", completedAt: "2026-02-01T00:10:00.000Z", trials: [timedOutTrial()] }),
      recoverySession({ sessionId: "valid-reference", completedAt: "2026-01-15T00:10:00.000Z", trials: [tunedTrial()] }),
    ],
    checkIns: [],
  });
  const legacyReference = observationFor(dataset, PARTICIPANT, "legacy-reference");
  const missingCurrent = observationFor(dataset, PARTICIPANT, "missing-current");
  const validReference = observationFor(dataset, PARTICIPANT, "valid-reference");

  const missingReferenceValue = calculateMetricDelta(validReference, legacyReference, "directional-error-mean");
  assert.equal(missingReferenceValue.comparisonValid, false);
  assert.equal(missingReferenceValue.referenceValue, null);
  assert.equal(missingReferenceValue.change, null);

  const missingCurrentValue = calculateMetricDelta(missingCurrent, validReference, "reaction-time-mean");
  assert.equal(missingCurrentValue.comparisonValid, false);
  assert.equal(missingCurrentValue.currentValue, null);
  assert.equal(missingCurrentValue.change, null);
});

test("deltas do not impute zero for missing trials and do not interpolate means", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({
        sessionId: "reference",
        completedAt: "2026-01-01T00:10:00.000Z",
        trials: [tunedTrial({ directionalErrorDegrees: 0 }), tunedTrial({ directionalErrorDegrees: 20 }), timedOutTrial()],
      }),
      recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z", trials: [tunedTrial({ directionalErrorDegrees: 30 })] }),
    ],
    checkIns: [],
  });
  const reference = observationFor(dataset, PARTICIPANT, "reference");
  const current = observationFor(dataset, PARTICIPANT, "current");
  close(findRecoveryMetric(reference, "directional-error-mean")?.value ?? null, 10);
  const delta = calculateMetricDelta(current, reference, "directional-error-mean");
  assert.equal(delta.comparisonValid, true);
  close(delta.referenceValue, 10);
  close(delta.currentValue, 30);
  close(delta.change, 20);
  assert.equal(delta.referenceEligibleTrialCount, 2);
  assert.equal(delta.referenceTotalTrialCount, 3);
});

test("a current observation can be excluded from being its own default reference", () => {
  const dataset = buildRecoveryDataset({ sessions: [recoverySession({ sessionId: "only" })], checkIns: [] });
  const selfReference = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "directional-error-mean" });
  assert.equal(selfReference.ok, true);
  if (selfReference.ok) assert.equal(selfReference.reference.sessionId, "only");

  const excluded = selectPersonalReferenceSession(dataset, { participantId: PARTICIPANT, metric: "directional-error-mean", excludeSessionId: "only" });
  assert.equal(excluded.ok, false);
  if (!excluded.ok) assert.equal(excluded.reason, "no-eligible-session-for-metric");
});

test("participant ambiguity requires an explicit browser-local participant ID", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "a-1", participantId: "participant-a", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "b-1", participantId: "participant-b", completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  const ambiguous = selectPersonalReferenceSession(dataset, { metric: "directional-error-mean" });
  assert.equal(ambiguous.ok, false);
  if (!ambiguous.ok) assert.equal(ambiguous.reason, "participant-required");

  const explicit = selectPersonalReferenceSession(dataset, { participantId: "participant-b", metric: "directional-error-mean" });
  assert.equal(explicit.ok, true);
  if (explicit.ok) assert.equal(explicit.reference.sessionId, "b-1");
});
