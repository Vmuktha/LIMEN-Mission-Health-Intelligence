import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryDataset, findRecoveryMetric, loadRecoveryDataset, RECOVERY_METRICS } from "@/lib/analytics/recovery";
import { saveAssessmentSession } from "@/lib/storage/assessment-storage";
import { saveCheckIn } from "@/lib/storage/checkin-storage";
import { createInMemoryStorageAdapter } from "@/lib/storage/database";
import type { AssessmentSession } from "@/types/assessment";
import type { SymptomCheckInRecord } from "@/types/checkin";
import { completedTrial } from "./test-fixtures";
import { PARTICIPANT, recoveryCheckIn, recoverySession, timedOutTrial, tunedTrial } from "./recovery-fixtures";

function close(actual: number | null, expected: number): void {
  if (actual === null) assert.fail("Expected a numeric value, received null.");
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, received ${actual}`);
}

function onlyObservation(dataset: ReturnType<typeof buildRecoveryDataset>) {
  assert.equal(dataset.participants.length, 1);
  assert.equal(dataset.participants[0].observations.length, 1);
  return dataset.participants[0].observations[0];
}

test("an empty dataset reports no participants and does not fabricate observations", () => {
  const dataset = buildRecoveryDataset({ sessions: [], checkIns: [] });
  assert.deepEqual(dataset.participants, []);
  assert.deepEqual(dataset.rejectedRecords, []);
  assert.deepEqual(dataset.excludedSessions, []);
  assert.equal(dataset.loadedSessionCount, 0);
  assert.equal(dataset.loadedCheckInCount, 0);
  assert.equal(dataset.interpretation, "descriptive-only-not-clinical-recovery");
});

test("assessment sessions and check-ins are sorted by their actual timestamps", () => {
  const sessions = [
    recoverySession({ sessionId: "s3", completedAt: "2026-01-03T00:10:00.000Z" }),
    recoverySession({ sessionId: "s1", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "s2", completedAt: "2026-01-02T00:10:00.000Z" }),
  ];
  const checkIns = [
    recoveryCheckIn({ id: "c2", recordedAt: "2026-01-02T00:00:00.000Z" }),
    recoveryCheckIn({ id: "c1", recordedAt: "2026-01-01T00:00:00.000Z" }),
  ];
  const dataset = buildRecoveryDataset({ sessions, checkIns });
  assert.equal(dataset.participants.length, 1);
  assert.deepEqual(dataset.participants[0].observations.map((observation) => observation.sessionId), ["s1", "s2", "s3"]);
  assert.deepEqual(dataset.participants[0].checkIns.map((checkIn) => checkIn.checkInId), ["c1", "c2"]);
});

test("observations are grouped by the existing browser-local participant ID", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "a-1", participantId: "participant-a", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "b-1", participantId: "participant-b", completedAt: "2026-01-02T00:10:00.000Z" }),
      recoverySession({ sessionId: "a-2", participantId: "participant-a", completedAt: "2026-01-03T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  assert.equal(dataset.participants.length, 2);
  const participantA = dataset.participants.find((participant) => participant.participantId === "participant-a");
  const participantB = dataset.participants.find((participant) => participant.participantId === "participant-b");
  assert.ok(participantA);
  assert.ok(participantB);
  assert.deepEqual(participantA.observations.map((observation) => observation.sessionId), ["a-1", "a-2"]);
  assert.deepEqual(participantB.observations.map((observation) => observation.sessionId), ["b-1"]);
  assert.equal(participantA.profileKind, "browser-local-participant-profile");
});

test("a single completed session exposes separate raw-derived metrics, never a composite score", () => {
  const observation = onlyObservation(buildRecoveryDataset({ sessions: [recoverySession({ sessionId: "s-1" })], checkIns: [] }));
  assert.equal(observation.status, "completed");
  assert.equal(observation.interpretation, "descriptive-only-not-clinical-recovery");
  assert.equal(observation.metrics.length, RECOVERY_METRICS.length);
  assert.deepEqual(observation.metrics.map((metric) => metric.metric), [...RECOVERY_METRICS]);
  assert.equal(observation.metrics.some((metric) => /composite|readiness|score/i.test(metric.metric)), false);
  assert.equal(observation.dataQuality.totalTrials, 8);
  close(findRecoveryMetric(observation, "reaction-time-mean")?.value ?? null, 100);
  close(findRecoveryMetric(observation, "movement-time-mean")?.value ?? null, 200);
  close(findRecoveryMetric(observation, "directional-error-mean")?.value ?? null, 0);
  close(findRecoveryMetric(observation, "trajectory-deviation-mean")?.value ?? null, 0);
  close(findRecoveryMetric(observation, "adaptation-change")?.value ?? null, 0);
  close(findRecoveryMetric(observation, "washout-aftereffect")?.value ?? null, 0);
});

test("multiple completed sessions remain separate chronological observations", () => {
  const dataset = buildRecoveryDataset({
    sessions: [recoverySession({ sessionId: "s-2", completedAt: "2026-01-02T00:10:00.000Z" }), recoverySession({ sessionId: "s-1", completedAt: "2026-01-01T00:10:00.000Z" })],
    checkIns: [],
  });
  assert.equal(dataset.participants[0].observations.length, 2);
  assert.notEqual(dataset.participants[0].observations[0], dataset.participants[0].observations[1]);
});

test("incomplete and non-completed sessions are excluded with explicit reasons", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "incomplete", status: "incomplete", completedAt: null }),
      recoverySession({ sessionId: "aborted", status: "aborted", completedAt: "2026-01-02T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  assert.deepEqual(dataset.participants, []);
  assert.equal(dataset.excludedSessions.length, 2);
  assert.deepEqual(dataset.excludedSessions.map((session) => session.reason), ["not-completed", "not-completed"]);
  assert.equal(dataset.rejectedRecords.length, 0);
});

test("malformed session and check-in records are rejected with reasons", () => {
  const malformedTrials = { ...recoverySession({ sessionId: "bad-trials" }), trials: "not-an-array" } as unknown as AssessmentSession;
  const simulated = { ...recoverySession({ sessionId: "simulated" }), metadata: { ...recoverySession({ sessionId: "simulated" }).metadata, simulated: true } } as unknown as AssessmentSession;
  const dataset = buildRecoveryDataset({
    sessions: [null, {}, malformedTrials, simulated],
    checkIns: [recoveryCheckIn({ id: "bad-checkin", nausea: 11 as 10 })],
  });
  assert.deepEqual(dataset.participants, []);
  assert.equal(dataset.rejectedRecords.length, 5);
  assert.equal(dataset.rejectedRecords.filter((record) => record.kind === "assessment-session").length, 4);
  assert.equal(dataset.rejectedRecords.filter((record) => record.kind === "check-in").length, 1);
  assert.ok(dataset.rejectedRecords.every((record) => record.reason.length > 0));
});

test("non-finite trial data is withheld while unaffected timing metrics remain available", () => {
  const session = recoverySession({
    sessionId: "non-finite",
    trials: [
      tunedTrial({ phase: "baseline", index: 0 }),
      completedTrial({ phase: "baseline", index: 1, actualStartPosition: { x: Number.NaN, y: 0 } }),
      completedTrial({ phase: "baseline", index: 2, trajectory: [{ x: Number.POSITIVE_INFINITY, y: 0, elapsedMs: 100 }] }),
    ],
  });
  const observation = onlyObservation(buildRecoveryDataset({ sessions: [session], checkIns: [] }));
  assert.equal(observation.measurementValidity, "inconsistent-origin-provenance");
  const reactionTime = findRecoveryMetric(observation, "reaction-time-mean");
  assert.ok(reactionTime);
  assert.equal(reactionTime.eligible, true);
  assert.equal(reactionTime.eligibleTrialCount, 3);
  close(reactionTime.value, 100);
  const directionalError = findRecoveryMetric(observation, "directional-error-mean");
  assert.ok(directionalError);
  assert.equal(directionalError.eligible, false);
  assert.equal(directionalError.value, null);
  assert.ok(observation.dataQuality.nonFiniteTrialCount >= 2);
  assert.ok(observation.dataQuality.issues.some((issue) => issue.code === "non-finite-value"));
});

test("a non-finite session completion timestamp is excluded instead of ordered", () => {
  const dataset = buildRecoveryDataset({ sessions: [recoverySession({ sessionId: "bad-time", completedAt: "not-a-date" })], checkIns: [] });
  assert.deepEqual(dataset.participants, []);
  assert.equal(dataset.excludedSessions.length, 1);
  assert.equal(dataset.excludedSessions[0].reason, "invalid-completion-timestamp");
});

test("trials whose session ID does not match the parent are withheld and counted", () => {
  const session = recoverySession({ sessionId: "mismatch" });
  const mismatched = { ...session, trials: [{ ...session.trials[0], sessionId: "another-session" }, ...session.trials.slice(1)] };
  const observation = onlyObservation(buildRecoveryDataset({ sessions: [mismatched], checkIns: [] }));
  assert.equal(observation.dataQuality.sessionIdMismatchCount, 1);
  assert.equal(observation.dataQuality.totalTrials, 8);
  assert.equal(findRecoveryMetric(observation, "reaction-time-mean")?.eligibleTrialCount, 7);
  assert.ok(observation.dataQuality.issues.some((issue) => issue.code === "trial-session-id-mismatch"));
});

test("missing measurements remain null, zero values remain valid, and no interpolation occurs", () => {
  const missing = onlyObservation(buildRecoveryDataset({ sessions: [recoverySession({ sessionId: "missing", trials: [timedOutTrial()] })], checkIns: [] }));
  const missingMetric = findRecoveryMetric(missing, "directional-error-mean");
  assert.ok(missingMetric);
  assert.equal(missingMetric.value, null);
  assert.equal(missingMetric.eligible, false);
  assert.notEqual(missingMetric.value, 0);

  const zero = onlyObservation(buildRecoveryDataset({ sessions: [recoverySession({ sessionId: "zero" })], checkIns: [] }));
  const zeroMetric = findRecoveryMetric(zero, "directional-error-mean");
  assert.ok(zeroMetric);
  assert.equal(zeroMetric.eligible, true);
  assert.equal(zeroMetric.value, 0);

  const interpolated = onlyObservation(buildRecoveryDataset({
    sessions: [recoverySession({
      sessionId: "interpolation",
      trials: [tunedTrial({ directionalErrorDegrees: 0 }), tunedTrial({ directionalErrorDegrees: 20, phase: "baseline" }), timedOutTrial()],
    })],
    checkIns: [],
  }));
  const directional = findRecoveryMetric(interpolated, "directional-error-mean");
  assert.ok(directional);
  close(directional.value, 10);
  assert.equal(directional.eligibleTrialCount, 2);
  assert.equal(directional.totalTrialCount, 3);
});

test("check-ins associate only through explicit completed-session identifiers", () => {
  const completed = recoverySession({ sessionId: "session-1", completedAt: "2026-01-01T00:10:00.000Z" });
  const incomplete = recoverySession({ sessionId: "session-incomplete", status: "incomplete", completedAt: null });
  const otherParticipant = recoverySession({ sessionId: "session-other", participantId: "other-participant" });
  const checkIns = [
    recoveryCheckIn({ id: "associated", assessmentSessionId: "session-1", recordedAt: "2026-01-05T00:00:00.000Z" }),
    recoveryCheckIn({ id: "timestamp-only", recordedAt: completed.metadata.completedAt ?? "" }),
    recoveryCheckIn({ id: "missing-session", assessmentSessionId: "does-not-exist" }),
    recoveryCheckIn({ id: "incomplete-session", assessmentSessionId: "session-incomplete" }),
    recoveryCheckIn({ id: "other-participant-session", assessmentSessionId: "session-other" }),
  ];
  const dataset = buildRecoveryDataset({ sessions: [completed, incomplete, otherParticipant], checkIns });
  const participant = dataset.participants.find((candidate) => candidate.participantId === PARTICIPANT);
  assert.ok(participant);
  assert.equal(participant.observations.length, 1);
  assert.equal(participant.observations[0].checkIns.length, 1);
  assert.equal(participant.observations[0].checkIns[0].checkInId, "associated");
  assert.equal(participant.observations[0].checkIns[0].associationSource, "explicit-assessment-session-identifier");
  assert.equal(participant.unassociatedCheckIns.length, 4);
  assert.equal(participant.checkIns.find((checkIn) => checkIn.checkInId === "timestamp-only")?.linkState, "no-explicit-session-identifier");
  assert.equal(participant.checkIns.find((checkIn) => checkIn.checkInId === "missing-session")?.linkState, "session-not-found");
  assert.equal(participant.checkIns.find((checkIn) => checkIn.checkInId === "incomplete-session")?.linkState, "session-not-completed");
  assert.equal(participant.checkIns.find((checkIn) => checkIn.checkInId === "other-participant-session")?.linkState, "participant-mismatch");
  assert.equal(participant.checkIns.find((checkIn) => checkIn.checkInId === "timestamp-only")?.association, null);
});

test("check-in scores retain zero separately from unanswered null values", () => {
  const dataset = buildRecoveryDataset({
    sessions: [recoverySession({ sessionId: "session-1" })],
    checkIns: [recoveryCheckIn({ id: "scores", assessmentSessionId: "session-1", nausea: 0, fatigue: 7 })],
  });
  const checkIn = dataset.participants[0].checkIns[0];
  assert.equal(checkIn.scores.nausea, 0);
  assert.equal(checkIn.scores.fatigue, 7);
  assert.equal(checkIn.scores.dizzinessOrDisorientation, null);
  assert.equal(checkIn.scores.movementConfidence, null);
});

test("recovery construction does not mutate historical input records", () => {
  const sessions = [recoverySession({ sessionId: "immutable-1" }), recoverySession({ sessionId: "immutable-2", completedAt: "2026-02-01T00:10:00.000Z" })];
  const checkIns: SymptomCheckInRecord[] = [recoveryCheckIn({ id: "immutable-checkin", assessmentSessionId: "immutable-1" })];
  const sessionsSnapshot = structuredClone(sessions);
  const checkInsSnapshot = structuredClone(checkIns);
  buildRecoveryDataset({ sessions, checkIns });
  assert.deepEqual(sessions, sessionsSnapshot);
  assert.deepEqual(checkIns, checkInsSnapshot);
});

test("the loader lists storage records and sorts them by timestamp", async () => {
  const adapter = createInMemoryStorageAdapter();
  const sessions = [
    recoverySession({ sessionId: "stored-2", completedAt: "2026-01-02T00:10:00.000Z" }),
    recoverySession({ sessionId: "stored-1", completedAt: "2026-01-01T00:10:00.000Z" }),
  ];
  assert.equal((await saveAssessmentSession(sessions[0], adapter)).ok, true);
  assert.equal((await saveAssessmentSession(sessions[1], adapter)).ok, true);
  assert.equal((await saveCheckIn(recoveryCheckIn({ id: "stored-checkin", assessmentSessionId: "stored-1" }), adapter)).ok, true);
  const loaded = await loadRecoveryDataset(adapter);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.value.loadedSessionCount, 2);
  assert.equal(loaded.value.loadedCheckInCount, 1);
  assert.deepEqual(loaded.value.participants[0].observations.map((observation) => observation.sessionId), ["stored-1", "stored-2"]);
  assert.equal(loaded.value.participants[0].observations[0].checkIns.length, 1);
});
