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
