import assert from "node:assert/strict";
import test from "node:test";
import { buildObservationNotices, observationLoadErrorMessage, OBSERVATION_NOTICE_MODEL_VERSION } from "@/lib/observations/notices";
import { buildRecoveryDataset } from "@/lib/analytics/recovery";
import { createFollowUp } from "@/lib/followup/workflow";
import type { MissionEvent } from "@/types/mission-context";
import type { MissionTransition } from "@/types/transition";
import { recoveryCheckIn, recoverySession, timedOutTrial, tunedTrial, V2, V3 } from "./recovery-fixtures";

const event = (id = "event-1", provenance: MissionEvent["provenance"] = "browser-user-generated"): MissionEvent => ({
  id, missionContextId: "context-1", missionId: "mission-1", occurredAt: "2026-01-01T00:00:00.000Z", description: "Explicitly logged event",
  source: provenance === "simulated-demo" ? "simulated-demo" : "manual-entry", provenance, recordedAt: "2026-01-01T00:01:00.000Z", createdAt: "2026-01-01T00:01:00.000Z", updatedAt: "2026-01-01T00:01:00.000Z", interpretation: "manually-recorded-mission-event",
});
const transition: MissionTransition = {
  id: "transition-1", missionContextId: "context-1", missionId: "mission-1", previousPhase: "preflight", currentPhase: "launch",
  occurredAt: "2026-01-02T00:00:00.000Z", recordedAt: "2026-01-02T00:01:00.000Z", createdAt: "2026-01-02T00:01:00.000Z", updatedAt: "2026-01-02T00:01:00.000Z",
  source: "manual-entry", provenance: "browser-user-generated", interpretation: "explicitly-recorded-mission-transition-not-inferred",
};
const workflow = createFollowUp({ id: "follow-1", relatedObservation: { kind: "assessment-session", id: "session-a" }, reason: "User recorded reason", author: "operator", source: "user-entered", provenance: "browser-user-generated" }, "2026-01-03T00:00:00.000Z");
const participant = (sessions: ReturnType<typeof recoverySession>[], checkIns: ReturnType<typeof recoveryCheckIn>[] = []) => buildRecoveryDataset({ sessions, checkIns }).participants;
const input = (overrides: Partial<Parameters<typeof buildObservationNotices>[0]> = {}) => ({ events: [], transitions: [], followUps: [], participants: [], ...overrides });

test("explicit events, transitions and workflow records have exact rule IDs and references", () => {
  const result = buildObservationNotices(input({ events: [event()], transitions: [transition], followUps: [workflow] }));
  assert.equal(OBSERVATION_NOTICE_MODEL_VERSION, "1.0.0");
  assert.deepEqual(result.notices.map((notice) => notice.ruleId), ["mission-event-recorded.v1", "mission-transition-recorded.v1", "follow-up-workflow-record.v1"]);
  assert.deepEqual(result.notices.map((notice) => notice.records[0]?.id), ["event-1", "transition-1", "follow-1"]);
  assert.deepEqual(result.notices[0]?.timestamps.map((item) => item.label), ["User-reported occurrence", "Browser record time"]);
});

test("all simulated source records are excluded", () => {
  const result = buildObservationNotices(input({ events: [event("demo", "simulated-demo")] }));
  assert.equal(result.notices.length, 0);
  assert.equal(result.insufficientEvidence, true);
});

test("assessment difference requires adjacent same-profile assessments, eligible values and the same known protocol", () => {
  const sessions = [
    recoverySession({ sessionId: "a", completedAt: "2026-01-01T00:00:00.000Z", measurementVersion: V2, trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, reactionMs: 100 })) }),
    recoverySession({ sessionId: "b", completedAt: "2026-01-02T00:00:00.000Z", measurementVersion: V2, trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, reactionMs: 160 })) }),
    recoverySession({ sessionId: "c", completedAt: "2026-01-03T00:00:00.000Z", measurementVersion: V3, trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, reactionMs: 220 })) }),
  ];
  const result = buildObservationNotices(input({ participants: participant(sessions) }));
  const reaction = result.notices.filter((notice) => notice.ruleId === "assessment-metric-difference.v1" && notice.metric === "reaction-time-mean");
  assert.equal(reaction.length, 1);
  assert.deepEqual(reaction[0]?.records.map((record) => record.id), ["a", "b"]);
  assert.match(reaction[0]?.detail ?? "", /60 ms/);
  assert.match(reaction[0]?.missingness ?? "", /8\/8/);
  assert.equal(result.evidenceCounts.excludedProtocolPairs, 1);
});

test("missing or ineligible metric pairs do not produce a notice or zero replacement", () => {
  const sessions = [
    recoverySession({ sessionId: "a", completedAt: "2026-01-01T00:00:00.000Z", measurementVersion: V2, trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index })) }),
    recoverySession({ sessionId: "b", completedAt: "2026-01-02T00:00:00.000Z", measurementVersion: V2, trials: Array.from({ length: 8 }, (_, index) => timedOutTrial("baseline", index)) }),
  ];
  const result = buildObservationNotices(input({ participants: participant(sessions) }));
  assert.equal(result.notices.some((notice) => notice.ruleId === "assessment-metric-difference.v1"), false);
  assert.ok(result.evidenceCounts.missingMetricPairs > 0);
});

test("self-report differences require an answered same field and same explicit context", () => {
  const checkIns = [
    recoveryCheckIn({ id: "ci-a", recordedAt: "2026-01-01T00:00:00.000Z", context: "general", fatigue: 2 }),
    recoveryCheckIn({ id: "ci-b", recordedAt: "2026-01-02T00:00:00.000Z", context: "general", fatigue: 6 }),
    recoveryCheckIn({ id: "ci-c", recordedAt: "2026-01-03T00:00:00.000Z", context: "post-assessment", fatigue: 8 }),
  ];
  const result = buildObservationNotices(input({ participants: participant([], checkIns) }));
  const fatigue = result.notices.filter((notice) => notice.ruleId === "self-report-difference.v1" && notice.title.includes("fatigue"));
  assert.equal(fatigue.length, 1);
  assert.deepEqual(fatigue[0]?.records.map((record) => record.id), ["ci-a", "ci-b"]);
  assert.match(fatigue[0]?.associationBasis ?? "", /same explicitly recorded check-in context/);
});

test("read failures provide a stable actionable message without implying records changed", () => {
  assert.equal(observationLoadErrorMessage(new Error("IndexedDB is unavailable.")), "IndexedDB is unavailable.");
  assert.match(observationLoadErrorMessage(null), /could not be read/);
  assert.match(observationLoadErrorMessage(null), /No new data was written/);
});

test("empty input is deterministically insufficient and never described as normal", () => {
  const first = buildObservationNotices(input());
  const second = buildObservationNotices(input());
  assert.deepEqual(first, second);
  assert.deepEqual(first.notices, []);
  assert.equal(first.insufficientEvidence, true);
});
