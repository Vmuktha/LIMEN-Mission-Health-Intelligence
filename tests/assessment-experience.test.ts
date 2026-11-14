import assert from "node:assert/strict";
import test from "node:test";
import { summarizeAssessmentResults } from "@/lib/analytics/session-summary";
import { createBrowserCheckIn } from "@/lib/checkin/record";
import { saveCheckIn } from "@/lib/storage/checkin-storage";
import { createInMemoryStorageAdapter } from "@/lib/storage/database";
import { validateCheckIn } from "@/lib/storage/checkin-validation";
import type { AssessmentSession } from "@/types/assessment";
import { assessmentSession, completedTrial, legacyTrial } from "./test-fixtures";

test("pre-assessment reports preserve missing answers and do not invent a future session ID", () => {
  const record = createBrowserCheckIn("pre-assessment", { nausea: 3 }, { id: "pre-1", participantId: "browser-participant", recordedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(record.context, "pre-assessment");
  assert.equal(record.nausea, 3);
  assert.equal(record.dizzinessOrDisorientation, undefined);
  assert.equal(record.assessmentSessionId, undefined);
  assert.equal(validateCheckIn(record).valid, true);
});

test("post-assessment reports retain their verified completed-session association and reject duplicate saving", async () => {
  const adapter = createInMemoryStorageAdapter();
  const record = createBrowserCheckIn("post-assessment", { movementConfidence: 8 }, { id: "post-1", participantId: "browser-participant", assessmentSessionId: "completed-session", recordedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(record.assessmentSessionId, "completed-session");
  assert.equal((await saveCheckIn(record, adapter)).ok, true);
  const duplicate = await saveCheckIn(record, adapter);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, "duplicate-id");
});

test("results summary uses completed-session records and leaves unavailable metrics null", () => {
  const complete = legacyTrial();
  const invalid = { ...legacyTrial({ id: "invalid", outcome: "invalid", movementOnsetAt: null, movementCompletedAt: null, trajectory: [] }), phase: "early-adaptation" as const, index: 1 };
  const session: AssessmentSession = {
    metadata: { sessionId: "results-1", participantId: "browser-participant", createdAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T00:10:00.000Z", inputDevice: "mouse", protocolVersion: "0.1.0", provenance: "browser-user-generated", simulated: false },
    status: "completed", conditions: ["normal-feedback", "clockwise-45-degree-feedback-rotation"], trials: [complete, invalid], phaseSummaries: [], adaptationSummary: null, baselineComparisons: [], neuralActivityMeasured: false, clinicalDiagnosticStatus: "not-a-clinical-diagnosis",
  };
  const summary = summarizeAssessmentResults(session);
  assert.equal(summary.measurementValidity, "legacy-origin-unverified");
  assert.equal(summary.totalTrials, 2);
  assert.equal(summary.completedTrials, 1);
  assert.equal(summary.invalidTrials, 1);
  assert.equal(summary.meanReactionTimeMs, 100);
  assert.equal(summary.adaptationDirectionalErrorChangeDegrees, null);
  assert.equal(summary.signedWashoutAftereffectDegrees, null);
  // Timing remains available for a homogeneous legacy session.
  assert.equal(summary.meanMovementTimeMs, 200);
});

test("results summaries recompute stale stored phase summaries from raw trials without rewriting the session", () => {
  const legacy = legacyTrial({ phase: "baseline" });
  const session = assessmentSession([legacy], "0.1.0", {
    phaseSummaries: [{ phase: "baseline", totalTrialCount: 1, validTrialCount: 0, meanDirectionalErrorDegrees: null, meanReactionTimeMs: null, meanMovementTimeMs: null }],
  });
  const before = structuredClone(session);
  const summary = summarizeAssessmentResults(session);
  assert.equal(summary.phaseSummaries.length, 1);
  assert.equal(summary.phaseSummaries[0].meanReactionTimeMs, 100);
  assert.equal(summary.phaseSummaries[0].meanMovementTimeMs, 200);
  assert.equal(summary.phaseSummaries[0].meanDirectionalErrorDegrees, null);
  assert.deepEqual(session, before);
});

test("mixed measurement-protocol sessions withhold every pooled metric including timing", () => {
  const v2 = completedTrial();
  const v3 = completedTrial({ id: "v3", measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor" });
  const summary = summarizeAssessmentResults(assessmentSession([v2, v3], "0.3.0"));
  assert.equal(summary.measurementValidity, "mixed-measurement-protocols");
  assert.equal(summary.meanReactionTimeMs, null);
  assert.equal(summary.meanMovementTimeMs, null);
  assert.equal(summary.meanDirectionalErrorDegrees, null);
  assert.equal(summary.phaseSummaries[0].meanReactionTimeMs, null);
  assert.equal(summary.phaseSummaries[0].meanMovementTimeMs, null);
});
