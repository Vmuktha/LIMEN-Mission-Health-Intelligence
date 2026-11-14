import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryStorageAdapter, getIndexedDbAdapter } from "@/lib/storage/database";
import { deleteAssessmentSession, getAssessmentSession, listAssessmentSessions, saveAssessmentSession } from "@/lib/storage/assessment-storage";
import type { AssessmentSession } from "@/types/assessment";

function completedSession(sessionId = "session-1"): AssessmentSession {
  return {
    metadata: { sessionId, participantId: "participant-1", createdAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T00:10:00.000Z", inputDevice: "mouse", protocolVersion: "0.1.0", provenance: "browser-user-generated", simulated: false },
    status: "completed",
    conditions: ["normal-feedback", "clockwise-45-degree-feedback-rotation"],
    trials: [], phaseSummaries: [], adaptationSummary: null, baselineComparisons: [], neuralActivityMeasured: false, clinicalDiagnosticStatus: "not-a-clinical-diagnosis",
  };
}

test("assessment sessions save, retrieve, list, delete, and preserve nulls without overwriting", async () => {
  const adapter = createInMemoryStorageAdapter();
  const session = completedSession();
  assert.equal((await saveAssessmentSession(session, adapter)).ok, true);
  const retrieved = await getAssessmentSession("session-1", adapter);
  assert.equal(retrieved.ok, true);
  if (retrieved.ok) assert.deepEqual(retrieved.value, session);
  assert.equal((await listAssessmentSessions(adapter)).ok, true);
  const duplicate = await saveAssessmentSession(session, adapter);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, "duplicate-id");
  assert.equal((await deleteAssessmentSession("session-1", adapter)).ok, true);
  const deleted = await getAssessmentSession("session-1", adapter);
  assert.equal(deleted.ok, true);
  if (deleted.ok) assert.equal(deleted.value, null);
});

test("incomplete sessions and unavailable IndexedDB return recoverable failures", async () => {
  const adapter = createInMemoryStorageAdapter();
  const incomplete = { ...completedSession("incomplete"), status: "incomplete" as const, metadata: { ...completedSession("incomplete").metadata, completedAt: null } };
  const result = await saveAssessmentSession(incomplete, adapter);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid-record");
  const unavailable = await getIndexedDbAdapter();
  assert.equal(unavailable.ok, false);
  if (!unavailable.ok) assert.equal(unavailable.error.code, "unavailable");
});

test("assessment session validation rejects malformed input and preserves valid sessions", async () => {
  const adapter = createInMemoryStorageAdapter();

  // undefined input
  const resUndefined = await saveAssessmentSession(undefined as unknown as AssessmentSession, adapter);
  assert.equal(resUndefined.ok, false);
  if (!resUndefined.ok) {
    assert.equal(resUndefined.error.code, "invalid-record");
    assert.equal(resUndefined.error.message, "Assessment session must be an object.");
  }

  // null input
  const resNull = await saveAssessmentSession(null as unknown as AssessmentSession, adapter);
  assert.equal(resNull.ok, false);
  if (!resNull.ok) {
    assert.equal(resNull.error.code, "invalid-record");
    assert.equal(resNull.error.message, "Assessment session must be an object.");
  }

  // primitive input
  const resPrimitive = await saveAssessmentSession("not-an-object" as unknown as AssessmentSession, adapter);
  assert.equal(resPrimitive.ok, false);
  if (!resPrimitive.ok) {
    assert.equal(resPrimitive.error.code, "invalid-record");
    assert.equal(resPrimitive.error.message, "Assessment session must be an object.");
  }

  // missing metadata
  const resMissingMeta = await saveAssessmentSession({ status: "completed" } as unknown as AssessmentSession, adapter);
  assert.equal(resMissingMeta.ok, false);
  if (!resMissingMeta.ok) {
    assert.equal(resMissingMeta.error.code, "invalid-record");
    assert.equal(resMissingMeta.error.message, "Assessment session metadata is required.");
  }

  // missing session ID
  const resMissingId = await saveAssessmentSession(
    { status: "completed", metadata: { sessionId: "   ", provenance: "browser-user-generated", simulated: false } } as unknown as AssessmentSession,
    adapter,
  );
  assert.equal(resMissingId.ok, false);
  if (!resMissingId.ok) {
    assert.equal(resMissingId.error.code, "invalid-record");
    assert.equal(resMissingId.error.message, "Completed assessment sessions require a session ID.");
  }

  // invalid provenance
  const resInvalidProv = await saveAssessmentSession(
    { ...completedSession("bad-prov"), metadata: { ...completedSession().metadata, provenance: "telemetry" as unknown as "browser-user-generated" } },
    adapter,
  );
  assert.equal(resInvalidProv.ok, false);
  if (!resInvalidProv.ok) {
    assert.equal(resInvalidProv.error.code, "invalid-record");
    assert.equal(resInvalidProv.error.message, "Only real browser-generated assessment sessions can be saved.");
  }

  // simulated sessions
  const resSimulated = await saveAssessmentSession(
    { ...completedSession("bad-sim"), metadata: { ...completedSession().metadata, simulated: true as unknown as false } },
    adapter,
  );
  assert.equal(resSimulated.ok, false);
  if (!resSimulated.ok) {
    assert.equal(resSimulated.error.code, "invalid-record");
    assert.equal(resSimulated.error.message, "Simulated assessment sessions cannot be saved as browser records.");
  }

  // invalid createdAt timestamp
  const resBadCreatedAt = await saveAssessmentSession(
    { ...completedSession("bad-created"), metadata: { ...completedSession().metadata, createdAt: "not-a-date" } },
    adapter,
  );
  assert.equal(resBadCreatedAt.ok, false);
  if (!resBadCreatedAt.ok) {
    assert.equal(resBadCreatedAt.error.code, "invalid-record");
    assert.equal(resBadCreatedAt.error.message, "Assessment session createdAt must be a valid ISO date.");
  }

  // invalid completedAt timestamp
  const resBadCompletedAt = await saveAssessmentSession(
    { ...completedSession("bad-completed"), metadata: { ...completedSession().metadata, completedAt: "invalid-date" } },
    adapter,
  );
  assert.equal(resBadCompletedAt.ok, false);
  if (!resBadCompletedAt.ok) {
    assert.equal(resBadCompletedAt.error.code, "invalid-record");
    assert.equal(resBadCompletedAt.error.message, "Assessment session completedAt must be a valid ISO date or null.");
  }

  // missing participantId
  const resMissingParticipant = await saveAssessmentSession(
    { ...completedSession("no-part"), metadata: { ...completedSession().metadata, participantId: "  " } },
    adapter,
  );
  assert.equal(resMissingParticipant.ok, false);
  if (!resMissingParticipant.ok) {
    assert.equal(resMissingParticipant.error.code, "invalid-record");
    assert.equal(resMissingParticipant.error.message, "Completed assessment sessions require a participant ID.");
  }

  // invalid inputDevice
  const resBadDevice = await saveAssessmentSession(
    { ...completedSession("bad-dev"), metadata: { ...completedSession().metadata, inputDevice: "vr-controller" as unknown as "mouse" } },
    adapter,
  );
  assert.equal(resBadDevice.ok, false);
  if (!resBadDevice.ok) {
    assert.equal(resBadDevice.error.code, "invalid-record");
    assert.equal(resBadDevice.error.message, "Assessment session inputDevice must be mouse, trackpad, or unknown.");
  }

  // invalid protocolVersion
  const resBadProto = await saveAssessmentSession(
    { ...completedSession("bad-proto"), metadata: { ...completedSession().metadata, protocolVersion: "" } },
    adapter,
  );
  assert.equal(resBadProto.ok, false);
  if (!resBadProto.ok) {
    assert.equal(resBadProto.error.code, "invalid-record");
    assert.equal(resBadProto.error.message, "Assessment session protocolVersion is required.");
  }

  // invalid conditions
  const resBadConditions = await saveAssessmentSession(
    { ...completedSession("bad-cond"), conditions: ["unrecognized-condition" as unknown as "normal-feedback"] },
    adapter,
  );
  assert.equal(resBadConditions.ok, false);
  if (!resBadConditions.ok) {
    assert.equal(resBadConditions.error.code, "invalid-record");
    assert.equal(resBadConditions.error.message, "Assessment session conditions must be an array of valid conditions.");
  }

  // malformed trials
  const resBadTrials = await saveAssessmentSession(
    { ...completedSession("bad-trial"), trials: [{ id: "t1" } as unknown as AssessmentSession["trials"][number]] },
    adapter,
  );
  assert.equal(resBadTrials.ok, false);
  if (!resBadTrials.ok) {
    assert.equal(resBadTrials.error.code, "invalid-record");
    assert.equal(resBadTrials.error.message, "Assessment session trials must be an array of valid trial records.");
  }

  // malformed phase summaries
  const resBadSummaries = await saveAssessmentSession(
    { ...completedSession("bad-summary"), phaseSummaries: [{ phase: "not-a-phase" } as unknown as AssessmentSession["phaseSummaries"][number]] },
    adapter,
  );
  assert.equal(resBadSummaries.ok, false);
  if (!resBadSummaries.ok) {
    assert.equal(resBadSummaries.error.code, "invalid-record");
    assert.equal(resBadSummaries.error.message, "Assessment session phaseSummaries must be an array of valid phase summaries.");
  }

  // malformed adaptation summary
  const resBadAdaptation = await saveAssessmentSession(
    { ...completedSession("bad-adapt"), adaptationSummary: { earlyAdaptation: "invalid" } as unknown as AssessmentSession["adaptationSummary"] },
    adapter,
  );
  assert.equal(resBadAdaptation.ok, false);
  if (!resBadAdaptation.ok) {
    assert.equal(resBadAdaptation.error.code, "invalid-record");
    assert.equal(resBadAdaptation.error.message, "Assessment session adaptationSummary is malformed.");
  }

  // malformed baseline comparisons
  const resBadComparisons = await saveAssessmentSession(
    { ...completedSession("bad-base"), baselineComparisons: [{ interpretation: "invalid-diagnosis" } as unknown as AssessmentSession["baselineComparisons"][number]] },
    adapter,
  );
  assert.equal(resBadComparisons.ok, false);
  if (!resBadComparisons.ok) {
    assert.equal(resBadComparisons.error.code, "invalid-record");
    assert.equal(resBadComparisons.error.message, "Assessment session baselineComparisons must be an array of valid baseline comparisons.");
  }

  // invalid neuralActivityMeasured
  const resBadNeural = await saveAssessmentSession(
    { ...completedSession("bad-neural"), neuralActivityMeasured: true as unknown as false },
    adapter,
  );
  assert.equal(resBadNeural.ok, false);
  if (!resBadNeural.ok) {
    assert.equal(resBadNeural.error.code, "invalid-record");
    assert.equal(resBadNeural.error.message, "neuralActivityMeasured must be false.");
  }

  // invalid clinicalDiagnosticStatus
  const resBadClinical = await saveAssessmentSession(
    { ...completedSession("bad-clin"), clinicalDiagnosticStatus: "clinical-diagnosis" as unknown as "not-a-clinical-diagnosis" },
    adapter,
  );
  assert.equal(resBadClinical.ok, false);
  if (!resBadClinical.ok) {
    assert.equal(resBadClinical.error.code, "invalid-record");
    assert.equal(resBadClinical.error.message, "clinicalDiagnosticStatus must be not-a-clinical-diagnosis.");
  }

  // valid completed session
  const resValid = await saveAssessmentSession(completedSession("defensive-valid-1"), adapter);
  assert.equal(resValid.ok, true);
  if (resValid.ok) {
    assert.equal(resValid.value.metadata.sessionId, "defensive-valid-1");
  }
});
