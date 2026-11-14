import { ASSESSMENT_STORE, failure, failureFromError, getIndexedDbAdapter, success, type StorageAdapter, type StorageResult } from "./database";
import type { AssessmentSession } from "@/types/assessment";

export async function saveAssessmentSession(session: AssessmentSession, adapter?: StorageAdapter): Promise<StorageResult<AssessmentSession>> {
  const validation = validateAssessmentSession(session);
  if (!validation.ok) return validation;
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.add(ASSESSMENT_STORE, session.metadata.sessionId, session);
    return success(session);
  } catch (error) { return failureFromError(error, "Unable to save the assessment session locally."); }
}

export async function getAssessmentSession(sessionId: string, adapter?: StorageAdapter): Promise<StorageResult<AssessmentSession | null>> {
  if (!hasIdentifier(sessionId)) return failure("invalid-record", "Assessment session ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { return success(await storage.value.get<AssessmentSession>(ASSESSMENT_STORE, sessionId)); }
  catch (error) { return failureFromError(error, "Unable to retrieve the assessment session."); }
}

export async function listAssessmentSessions(adapter?: StorageAdapter): Promise<StorageResult<readonly AssessmentSession[]>> {
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { return success(await storage.value.getAll<AssessmentSession>(ASSESSMENT_STORE)); }
  catch (error) { return failureFromError(error, "Unable to list assessment sessions."); }
}

export async function deleteAssessmentSession(sessionId: string, adapter?: StorageAdapter): Promise<StorageResult<void>> {
  if (!hasIdentifier(sessionId)) return failure("invalid-record", "Assessment session ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { await storage.value.delete(ASSESSMENT_STORE, sessionId); return success(undefined); }
  catch (error) { return failureFromError(error, "Unable to delete the assessment session."); }
}

function validateAssessmentSession(session: AssessmentSession): StorageResult<AssessmentSession> {
  if (!hasIdentifier(session.metadata.sessionId)) return failure("invalid-record", "Completed assessment sessions require a session ID.");
  if (session.status !== "completed") return failure("invalid-record", "Only completed assessment sessions can be saved.");
  if (session.metadata.provenance !== "browser-user-generated" || session.metadata.simulated !== false) return failure("invalid-record", "Only real browser-generated assessment sessions can be saved.");
  return success(session);
}

function hasIdentifier(value: string): boolean { return value.trim().length > 0; }
