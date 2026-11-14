import assert from "node:assert/strict";
import test from "node:test";

import { buildRecoveryDataset } from "@/lib/analytics/recovery";
import { createBrowserCheckIn } from "@/lib/checkin/record";
import { buildSignalConcordance } from "@/lib/concordance/signal-concordance";
import { createMissionContext } from "@/lib/mission/context";
import type { AssessmentSession } from "@/types/assessment";
import type { MeasurementProtocolVersion, TrialPhase } from "@/types/trial";
import type {
  ConcordancePerformanceMetric,
  SignalConcordanceResult,
} from "@/types/concordance";
import type { ExtendedCheckInAnswers, SymptomCheckInRecord } from "@/types/checkin";
import type { RecoveryParticipantDataset } from "@/types/recovery";
import { PARTICIPANT, V2, V3, recoverySession, tunedTrial } from "./recovery-fixtures";

/**
 * Clearly labelled synthetic application-workflow fixtures. These sessions are
 * not NASA observations and are not presented as such anywhere.
 */
const PHASES: readonly TrialPhase[] = ["baseline", "early-adaptation", "late-adaptation", "de-adaptation"];

function engineeredSession(options: {
  readonly id: string;
  readonly movementMs: number;
  readonly errors: readonly [number, number, number, number];
  readonly version?: MeasurementProtocolVersion;
  readonly completedAt?: string;
  readonly omitDeAdaptation?: boolean;
}): AssessmentSession {
  const phases = options.omitDeAdaptation ? PHASES.slice(0, 3) : PHASES;
  const trials = phases.flatMap((phase, phaseIndex) =>
    [0, 1].map((offset) =>
      tunedTrial({
        phase,
        index: phaseIndex * 2 + offset,
        directionalErrorDegrees: options.errors[phaseIndex],
        movementMs: options.movementMs,
      }),
    ),
  );
  return recoverySession({
    sessionId: options.id,
    measurementVersion: options.version ?? V2,
    completedAt: options.completedAt ?? "2026-01-01T00:10:00.000Z",
    trials,
  });
}

function checkIn(options: {
  readonly id: string;
  readonly sessionId: string;
  readonly recordedAt: string;
  readonly answers: ExtendedCheckInAnswers;
  readonly missionPhase?: SymptomCheckInRecord["missionPhase"];
}): SymptomCheckInRecord {
  return createBrowserCheckIn("post-assessment", options.answers, {
    id: options.id,
    participantId: PARTICIPANT,
    assessmentSessionId: options.sessionId,
    recordedAt: options.recordedAt,
    ...(options.missionPhase ? { missionPhase: options.missionPhase } : {}),
  });
}

function participantFor(sessions: readonly AssessmentSession[], checkIns: readonly SymptomCheckInRecord[]): RecoveryParticipantDataset {
  const dataset = buildRecoveryDataset({ sessions, checkIns });
  const participant = dataset.participants.find((candidate) => candidate.participantId === PARTICIPANT);
  assert.ok(participant);
  return participant;
}

interface LinkedPair {
  readonly participant: RecoveryParticipantDataset;
  readonly currentCheck: SymptomCheckInRecord;
  readonly referenceCheck: SymptomCheckInRecord;
  readonly result: SignalConcordanceResult;
}

function linkedPair(overrides: {
  readonly currentErrors?: readonly [number, number, number, number];
  readonly referenceErrors?: readonly [number, number, number, number];
  readonly currentMovementMs?: number;
  readonly referenceMovementMs?: number;
  readonly currentVersion?: MeasurementProtocolVersion;
  readonly referenceVersion?: MeasurementProtocolVersion;
  readonly referenceOmitDeAdaptation?: boolean;
  readonly currentMissionPhase?: SymptomCheckInRecord["missionPhase"];
  readonly referenceMissionPhase?: SymptomCheckInRecord["missionPhase"];
  readonly missionContextPhase?: "preflight" | "inflight-operations" | "postflight-recovery";
} = {}): LinkedPair {
  const current = engineeredSession({
    id: "current-session",
    movementMs: overrides.currentMovementMs ?? 300,
    errors: overrides.currentErrors ?? [0, 40, 15, 5],
    version: overrides.currentVersion,
    completedAt: "2026-01-02T00:10:00.000Z",
  });
  const reference = engineeredSession({
    id: "reference-session",
    movementMs: overrides.referenceMovementMs ?? 200,
    errors: overrides.referenceErrors ?? [0, 30, 10, 0],
    version: overrides.referenceVersion,
    completedAt: "2026-01-01T00:10:00.000Z",
    omitDeAdaptation: overrides.referenceOmitDeAdaptation,
  });
  const currentCheck = checkIn({
    id: "current-checkin",
    sessionId: "current-session",
    recordedAt: "2026-01-02T00:15:00.000Z",
    answers: { fatigue: 7, movementConfidence: 4, sleepQuality: 3, stress: 8 },
    missionPhase: overrides.currentMissionPhase,
  });
  const referenceCheck = checkIn({
    id: "reference-checkin",
    sessionId: "reference-session",
    recordedAt: "2026-01-01T00:15:00.000Z",
    answers: { fatigue: 3, movementConfidence: 8, sleepQuality: 8, stress: 8 },
    missionPhase: overrides.referenceMissionPhase,
  });
  const participant = participantFor([current, reference], [currentCheck, referenceCheck]);
  const missionContext = overrides.missionContextPhase
    ? createMissionContext(
        {
          id: "mission-context-1",
          missionId: "synthetic-mission",
          missionName: "Synthetic Mission",
          profile: "earth-orbit",
          phase: overrides.missionContextPhase,
          phaseRecordedAt: "2026-01-01T00:00:00.000Z",
          source: "manual-entry",
          provenance: "browser-user-generated",
        },
        "2026-01-01T00:00:00.000Z",
      )
    : null;
  const result = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck, referenceCheck],
    currentCheckInId: "current-checkin",
    referenceCheckInId: "reference-checkin",
    missionContext,
  });
  return { participant, currentCheck, referenceCheck, result };
}

function performance(result: SignalConcordanceResult, metric: ConcordancePerformanceMetric) {
  const comparison = result.performanceComparisons.find((candidate) => candidate.metric === metric);
  assert.ok(comparison, `missing comparison for ${metric}`);
  return comparison;
}

function selfReport(result: SignalConcordanceResult, field: string) {
  const comparison = result.selfReportComparisons.find((candidate) => candidate.field === field);
  assert.ok(comparison, `missing self-report comparison for ${field}`);
  return comparison;
}

function link(result: SignalConcordanceResult, metric: ConcordancePerformanceMetric, field: string) {
  const comparison = result.links.find((candidate) => candidate.metric === metric && candidate.field === field);
  assert.ok(comparison, `missing link for ${metric}/${field}`);
  return comparison;
}

test("explicitly linked records produce explainable metric comparisons with units and references", () => {
  const { result } = linkedPair();
  assert.equal(result.participantId, PARTICIPANT);
  assert.equal(result.current.sessionId, "current-session");
  assert.equal(result.reference.sessionId, "reference-session");
  assert.equal(result.protocol.compatible, true);
  assert.equal(result.performanceComparisons.length, 4);

  const movement = performance(result, "movement-time-mean");
  assert.equal(movement.unit, "milliseconds");
  assert.equal(movement.changeFormula, "currentValue - referenceValue");
  assert.equal(movement.method, "identical-protocol-current-minus-reference");
  assert.equal(movement.change, 100);
  assert.equal(movement.direction, "increased");
  assert.equal(movement.availability, "available");
  assert.equal(movement.missingDataStatus, "none");
  assert.equal(movement.sourceValue, 300);
  assert.equal(movement.referenceValue, 200);

  const directional = performance(result, "directional-error-mean");
  assert.equal(directional.unit, "degrees");
  assert.equal(directional.change, 5);
  assert.equal(directional.signConvention, "positive-clockwise");

  const adaptation = performance(result, "adaptation-change");
  assert.equal(adaptation.change, -5);
  assert.equal(adaptation.direction, "decreased");

  const washout = performance(result, "washout-aftereffect");
  assert.equal(washout.change, 5);
  assert.equal(washout.direction, "increased");

  for (const comparison of result.performanceComparisons) {
    assert.ok(comparison.definition.length > 0);
    assert.ok(comparison.interpretationLimit.length > 0);
    assert.equal(comparison.polarity, "no-inherent-valence");
  }
});

test("self-report comparisons preserve scale polarity and never average opposite constructs", () => {
  const { result } = linkedPair();
  assert.equal(result.selfReportComparisons.length, 12);

  const fatigue = selfReport(result, "fatigue");
  assert.equal(fatigue.polarity, "higher-is-worse");
  assert.equal(fatigue.change, 4);
  assert.equal(fatigue.direction, "increased");
  assert.equal(fatigue.availability, "available");

  const confidence = selfReport(result, "movementConfidence");
  assert.equal(confidence.polarity, "higher-is-better");
  assert.equal(confidence.change, -4);
  assert.equal(confidence.direction, "decreased");

  const sleep = selfReport(result, "sleepQuality");
  assert.equal(sleep.polarity, "higher-is-better");
  assert.equal(sleep.change, -5);
  assert.equal(sleep.direction, "decreased");

  const stress = selfReport(result, "stress");
  assert.equal(stress.change, 0);
  assert.equal(stress.direction, "no-observed-change");

  const nausea = selfReport(result, "nausea");
  assert.equal(nausea.availability, "missing-data");
  assert.equal(nausea.sourceValue, null);
  assert.equal(nausea.referenceValue, null);
  assert.equal(nausea.direction, "unavailable");
  assert.match(nausea.explanation ?? "", /not answered/);
});

test("concordance links classify co-occurrence, divergence, and unavailable evidence explicitly", () => {
  const { result } = linkedPair();

  const coOccurrence = link(result, "movement-time-mean", "fatigue");
  assert.equal(coOccurrence.classification, "co-occurrence");
  assert.equal(coOccurrence.interpretation, "direction-only-co-observation-not-causal");
  assert.match(coOccurrence.explanation, /same mathematical direction/);
  assert.match(coOccurrence.explanation, /not agreement in valence or a causal relationship/);

  assert.equal(link(result, "directional-error-mean", "fatigue").classification, "co-occurrence");
  assert.equal(link(result, "adaptation-change", "fatigue").classification, "divergence");
  assert.match(link(result, "adaptation-change", "fatigue").explanation, /opposite mathematical directions/);
  assert.equal(link(result, "washout-aftereffect", "fatigue").classification, "co-occurrence");

  const divergence = link(result, "movement-time-mean", "movementConfidence");
  assert.equal(divergence.classification, "divergence");

  const oneChanged = link(result, "movement-time-mean", "stress");
  assert.equal(oneChanged.classification, "unavailable");
  assert.match(oneChanged.explanation, /Only one measure changed/);

  assert.equal(link(result, "movement-time-mean", "nausea").classification, "unavailable");
});

test("identical explicitly linked observations report no observed change rather than stability", () => {
  const current = engineeredSession({ id: "current-session", movementMs: 200, errors: [0, 30, 10, 0], completedAt: "2026-01-02T00:10:00.000Z" });
  const reference = engineeredSession({ id: "reference-session", movementMs: 200, errors: [0, 30, 10, 0], completedAt: "2026-01-01T00:10:00.000Z" });
  const currentCheck = checkIn({ id: "current-checkin", sessionId: "current-session", recordedAt: "2026-01-02T00:15:00.000Z", answers: { fatigue: 5 } });
  const referenceCheck = checkIn({ id: "reference-checkin", sessionId: "reference-session", recordedAt: "2026-01-01T00:15:00.000Z", answers: { fatigue: 5 } });
  const result = buildSignalConcordance({
    participant: participantFor([current, reference], [currentCheck, referenceCheck]),
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck, referenceCheck],
    currentCheckInId: "current-checkin",
    referenceCheckInId: "reference-checkin",
  });

  for (const comparison of result.performanceComparisons) {
    assert.equal(comparison.change, 0);
    assert.equal(comparison.direction, "no-observed-change");
  }
  assert.equal(link(result, "movement-time-mean", "fatigue").classification, "no-observed-change");
  assert.match(link(result, "movement-time-mean", "fatigue").explanation, /does not establish stability/);
});

test("v0.2.0 and v0.3.0 are never pooled, even when both are supplied explicitly", () => {
  const { participant, result } = linkedPair({ currentVersion: V3, referenceVersion: V2 });
  assert.equal(result.protocol.compatible, false);
  assert.equal(result.protocol.sourceMeasurementProtocol, V3);
  assert.equal(result.protocol.referenceMeasurementProtocol, V2);
  assert.match(result.protocol.explanation ?? "", /not compared|never pooled/);

  for (const comparison of result.performanceComparisons) {
    assert.equal(comparison.availability, "incompatible-protocol");
    assert.equal(comparison.change, null);
    assert.equal(comparison.direction, "unavailable");
    assert.equal(comparison.missingDataStatus, "protocol-incompatible");
  }
  assert.equal(link(result, "movement-time-mean", "fatigue").classification, "unavailable");

  // Isolate the measurement-protocol rule: even with a shared assessment label,
  // differing measurement protocols remain incomparable.
  const sameAssessmentLabel = {
    ...participant,
    observations: participant.observations.map((observation) => ({ ...observation, assessmentProtocolVersion: "0.2.0" })),
  };
  const measurementOnly = buildSignalConcordance({
    participant: sameAssessmentLabel,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [],
  });
  assert.equal(measurementOnly.protocol.compatible, false);
  assert.match(measurementOnly.protocol.explanation ?? "", /never pooled or compared directly/);
});

test("a metric without a compatible reference is explicitly insufficient rather than substituted", () => {
  const { result } = linkedPair({ referenceOmitDeAdaptation: true });
  const washout = performance(result, "washout-aftereffect");
  assert.equal(washout.availability, "insufficient-reference");
  assert.equal(washout.referenceValue, null);
  assert.equal(washout.change, null);
  assert.equal(washout.missingDataStatus, "insufficient-reference");
  assert.match(washout.missingDataExplanation ?? "", /reference observation/);

  const adaptation = performance(result, "adaptation-change");
  assert.equal(adaptation.availability, "available", "an available metric is not withheld because another metric is missing");
});

test("a missing current metric is reported as missing data and is never treated as zero", () => {
  const baselineOnly = recoverySession({
    sessionId: "current-session",
    completedAt: "2026-01-02T00:10:00.000Z",
    trials: [
      tunedTrial({ phase: "baseline", index: 0, directionalErrorDegrees: 0, movementMs: 300 }),
      tunedTrial({ phase: "baseline", index: 1, directionalErrorDegrees: 0, movementMs: 300 }),
    ],
  });
  const reference = engineeredSession({ id: "reference-session", movementMs: 200, errors: [0, 30, 10, 0], completedAt: "2026-01-01T00:10:00.000Z" });
  const result = buildSignalConcordance({
    participant: participantFor([baselineOnly, reference], []),
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [],
  });

  const adaptation = performance(result, "adaptation-change");
  assert.equal(adaptation.availability, "missing-data");
  assert.equal(adaptation.missingDataStatus, "missing");
  assert.equal(adaptation.change, null);
  assert.match(adaptation.missingDataExplanation ?? "", /current observation/);
  assert.equal(performance(result, "movement-time-mean").availability, "available");
});

test("check-ins are associated only by explicit session identifiers, never by timestamp proximity", () => {
  const { participant, currentCheck } = linkedPair();

  const timestampOnly = checkIn({
    id: "timestamp-only",
    sessionId: "reference-session",
    recordedAt: "2026-01-02T00:10:00.000Z",
    answers: { fatigue: 7 },
  });
  assert.equal(timestampOnly.recordedAt, "2026-01-02T00:10:00.000Z");

  const result = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck, timestampOnly],
    currentCheckInId: "timestamp-only",
  });
  const fatigue = selfReport(result, "fatigue");
  assert.equal(fatigue.availability, "not-explicitly-linked");
  assert.match(fatigue.explanation ?? "", /not 'current-session'/);
  assert.match(fatigue.explanation ?? "", /not reassigned by timestamp/);

  const noLink = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck],
  });
  assert.equal(selfReport(noLink, "fatigue").availability, "not-explicitly-linked");
  assert.match(selfReport(noLink, "fatigue").explanation ?? "", /Timestamp proximity is never used/);

  const unknownId = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck],
    currentCheckInId: "unknown-checkin",
  });
  assert.match(selfReport(unknownId, "fatigue").explanation ?? "", /No check-in with explicit identifier/);
});

test("check-ins from another browser-local participant profile are rejected", () => {
  const { participant, currentCheck } = linkedPair();
  const otherParticipant = { ...currentCheck, id: "other-participant-check", participantId: "other-participant" };
  const result = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck, otherParticipant],
    currentCheckInId: "other-participant-check",
  });
  assert.equal(selfReport(result, "fatigue").availability, "not-explicitly-linked");
  assert.match(selfReport(result, "fatigue").explanation ?? "", /different browser-local participant/);
});

test("a session cannot be its own personal reference", () => {
  const { participant, currentCheck } = linkedPair();
  const result = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "current-session",
    checkIns: [currentCheck],
    currentCheckInId: "current-checkin",
  });
  for (const comparison of result.performanceComparisons) {
    assert.equal(comparison.availability, "self-reference-rejected");
    assert.equal(comparison.change, null);
  }
});

test("an unknown or foreign session identifier is rejected rather than guessed", () => {
  const { participant } = linkedPair();
  assert.throws(
    () => buildSignalConcordance({ participant, currentSessionId: "not-a-session", referenceSessionId: "reference-session", checkIns: [] }),
    /No completed observation with explicit session ID 'not-a-session'/,
  );
});

test("mission-phase context is explicit and reports unknown or conflicting records without choosing", () => {
  const same = linkedPair({ currentMissionPhase: "inflight-operations", referenceMissionPhase: "inflight-operations" });
  assert.equal(same.result.missionPhaseContext.relation, "same-phase");
  assert.equal(same.result.missionPhaseContext.currentPhaseSource, "explicit-check-in");

  const different = linkedPair({ currentMissionPhase: "inflight-operations", referenceMissionPhase: "preflight" });
  assert.equal(different.result.missionPhaseContext.relation, "different-phase");
  assert.match(different.result.missionPhaseContext.explanation, /different mission phases/);

  const unknown = linkedPair();
  assert.equal(unknown.result.missionPhaseContext.relation, "unknown");
  assert.equal(unknown.result.missionPhaseContext.currentPhaseSource, "not-recorded");

  const contextFilled = linkedPair({ referenceMissionPhase: "inflight-operations", missionContextPhase: "inflight-operations" });
  assert.equal(contextFilled.result.missionPhaseContext.relation, "same-phase");
  assert.equal(contextFilled.result.missionPhaseContext.currentPhaseSource, "explicit-mission-context");

  const conflicting = linkedPair({ currentMissionPhase: "inflight-operations", missionContextPhase: "postflight-recovery" });
  assert.equal(conflicting.result.missionPhaseContext.relation, "conflicting-explicit-records");
  assert.match(conflicting.result.missionPhaseContext.explanation, /does not choose between explicit records/);
});

test("the result exposes no composite score, readiness index, risk score, or causal claim", () => {
  const { result } = linkedPair();
  assert.equal(result.interpretation, "descriptive-co-observation-not-causal-not-diagnostic");
  assert.equal(Object.values(result).some((value) => typeof value === "number"), false);
  assert.deepEqual(result.performanceComparisons.map((comparison) => comparison.metric), [
    "movement-time-mean",
    "directional-error-mean",
    "adaptation-change",
    "washout-aftereffect",
  ]);

  const keys = new Set<string>();
  const collectKeys = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) collectKeys(item);
    } else if (value !== null && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        keys.add(key);
        collectKeys(nested);
      }
    }
  };
  collectKeys(result);
  for (const key of keys) {
    assert.equal(/composite|readiness|risk|score|diagnos/i.test(key), false, `unexpected result key ${key}`);
  }

  for (const comparison of result.performanceComparisons) {
    assert.equal(comparison.polarity, "no-inherent-valence");
    assert.match(comparison.interpretationLimit, /not an improvement, deterioration, diagnosis, or prediction/);
  }
  for (const comparison of result.selfReportComparisons) {
    assert.match(comparison.interpretationLimit, /subjective/);
  }
  assert.ok(result.limitations.some((limitation) => /co-observations/.test(limitation)));
  assert.ok(result.limitations.some((limitation) => /never pooled/.test(limitation)));
});

test("a reference session that belongs to a different participant is rejected at the observation boundary", () => {
  // Build a participant whose observations contain only "current-session".
  // The reference session exists in the system but belongs to a different participant.
  const current = engineeredSession({ id: "current-session", movementMs: 300, errors: [0, 40, 15, 5], completedAt: "2026-01-02T00:10:00.000Z" });
  // Build separate participants: current belongs to PARTICIPANT, reference belongs to "other-participant".
  const otherParticipantSession = recoverySession({
    sessionId: "other-participant-session",
    participantId: "other-participant",
    completedAt: "2026-01-01T00:10:00.000Z",
  });
  const currentOnly = participantFor([current], []);
  // The participant dataset contains only "current-session", not "other-participant-session".
  assert.throws(
    () => buildSignalConcordance({
      participant: currentOnly,
      currentSessionId: "current-session",
      referenceSessionId: "other-participant-session",
      checkIns: [],
    }),
    /No completed observation with explicit session ID 'other-participant-session'/,
  );
  // Verify the other session exists independently (not in this participant's observations).
  assert.ok(otherParticipantSession.metadata.sessionId === "other-participant-session");
});

test("a missing reference session is rejected and never substituted with the nearest available session", () => {
  const { participant } = linkedPair();
  // Attempt to use a non-existent reference session when valid sessions exist.
  assert.throws(
    () => buildSignalConcordance({
      participant,
      currentSessionId: "current-session",
      referenceSessionId: "non-existent-session",
      checkIns: [],
    }),
    /No completed observation with explicit session ID 'non-existent-session'/,
  );
  // Also verify that swapping current/reference with a missing current is rejected.
  assert.throws(
    () => buildSignalConcordance({
      participant,
      currentSessionId: "non-existent-session",
      referenceSessionId: "reference-session",
      checkIns: [],
    }),
    /No completed observation with explicit session ID 'non-existent-session'/,
  );
});

test("a check-in explicitly referencing a different assessmentSessionId is never reassigned", () => {
  const { participant, currentCheck, referenceCheck } = linkedPair();
  // currentCheck.assessmentSessionId === "current-session"
  // Try to use it as the reference check-in for "reference-session".
  const result = buildSignalConcordance({
    participant,
    currentSessionId: "current-session",
    referenceSessionId: "reference-session",
    checkIns: [currentCheck, referenceCheck],
    currentCheckInId: "current-checkin",
    referenceCheckInId: "current-checkin", // wrong: this check-in belongs to current-session, not reference-session
  });
  const fatigue = selfReport(result, "fatigue");
  // The reference self-report must be rejected because "current-checkin" references "current-session", not "reference-session".
  assert.equal(fatigue.availability, "not-explicitly-linked");
  assert.match(fatigue.explanation ?? "", /not 'reference-session'/);
});
