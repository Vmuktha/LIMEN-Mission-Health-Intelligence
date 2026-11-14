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

const VALID_INPUT_DEVICES: readonly string[] = ["mouse", "trackpad", "unknown"];
const VALID_CONDITIONS: readonly string[] = ["normal-feedback", "clockwise-45-degree-feedback-rotation"];
const VALID_TRIAL_PHASES: readonly string[] = ["baseline", "early-adaptation", "late-adaptation", "de-adaptation"];
const VALID_ROTATION_CONDITIONS: readonly string[] = ["none", "clockwise-45-degrees"];
const VALID_TRIAL_OUTCOMES: readonly string[] = ["completed", "aborted", "invalid", "timed-out"];
const VALID_TARGET_DIRECTIONS: readonly string[] = ["up", "right", "down", "left"];
const VALID_BASELINE_METRICS: readonly string[] = ["directional-error", "reaction-time", "movement-time"];

function isValidTimestamp(val: unknown): boolean {
  return typeof val === "string" && Number.isFinite(Date.parse(val));
}

function isValidCoordinate(val: unknown): boolean {
  if (typeof val !== "object" || val === null) return false;
  const c = val as Record<string, unknown>;
  return typeof c.x === "number" && Number.isFinite(c.x) && typeof c.y === "number" && Number.isFinite(c.y);
}

function isValidTargetPosition(val: unknown): boolean {
  if (!isValidCoordinate(val)) return false;
  const t = val as Record<string, unknown>;
  return typeof t.direction === "string" && VALID_TARGET_DIRECTIONS.includes(t.direction);
}

function isValidTrajectoryPoint(val: unknown): boolean {
  if (!isValidCoordinate(val)) return false;
  const p = val as Record<string, unknown>;
  return typeof p.elapsedMs === "number" && Number.isFinite(p.elapsedMs);
}

function isValidTrialRecord(val: unknown): boolean {
  if (typeof val !== "object" || val === null) return false;
  const t = val as Record<string, unknown>;
  if (typeof t.id !== "string" || t.id.trim().length === 0) return false;
  if (typeof t.sessionId !== "string" || t.sessionId.trim().length === 0) return false;
  if (typeof t.index !== "number" || !Number.isInteger(t.index) || t.index < 0) return false;
  if (typeof t.phase !== "string" || !VALID_TRIAL_PHASES.includes(t.phase)) return false;
  if (typeof t.rotationCondition !== "string" || !VALID_ROTATION_CONDITIONS.includes(t.rotationCondition)) return false;
  if (!isValidTargetPosition(t.target)) return false;
  if (!isValidCoordinate(t.startPosition)) return false;
  if (t.designatedStartPosition !== undefined && !isValidCoordinate(t.designatedStartPosition)) return false;
  if (t.actualStartPosition !== undefined && !isValidCoordinate(t.actualStartPosition)) return false;
  if (!isValidTimestamp(t.targetPresentedAt)) return false;
  if (t.movementOnsetAt !== null && t.movementOnsetAt !== undefined && !isValidTimestamp(t.movementOnsetAt)) return false;
  if (t.movementCompletedAt !== null && t.movementCompletedAt !== undefined && !isValidTimestamp(t.movementCompletedAt)) return false;
  if (!Array.isArray(t.trajectory) || !t.trajectory.every(isValidTrajectoryPoint)) return false;
  if (t.displayedCursorTrajectory !== undefined && (!Array.isArray(t.displayedCursorTrajectory) || !t.displayedCursorTrajectory.every(isValidTrajectoryPoint))) return false;
  if (typeof t.outcome !== "string" || !VALID_TRIAL_OUTCOMES.includes(t.outcome)) return false;
  return true;
}

function isValidPhaseMetricSummary(val: unknown): boolean {
  if (typeof val !== "object" || val === null) return false;
  const p = val as Record<string, unknown>;
  if (typeof p.phase !== "string" || !VALID_TRIAL_PHASES.includes(p.phase)) return false;
  if (typeof p.validTrialCount !== "number" || !Number.isInteger(p.validTrialCount) || p.validTrialCount < 0) return false;
  if (typeof p.totalTrialCount !== "number" || !Number.isInteger(p.totalTrialCount) || p.totalTrialCount < 0) return false;
  if (p.meanDirectionalErrorDegrees !== null && (typeof p.meanDirectionalErrorDegrees !== "number" || !Number.isFinite(p.meanDirectionalErrorDegrees))) return false;
  if (p.meanReactionTimeMs !== null && (typeof p.meanReactionTimeMs !== "number" || !Number.isFinite(p.meanReactionTimeMs))) return false;
  if (p.meanMovementTimeMs !== null && (typeof p.meanMovementTimeMs !== "number" || !Number.isFinite(p.meanMovementTimeMs))) return false;
  return true;
}

function isValidAdaptationSummary(val: unknown): boolean {
  if (val === null) return true;
  if (typeof val !== "object") return false;
  const a = val as Record<string, unknown>;
  if (!isValidPhaseMetricSummary(a.earlyAdaptation)) return false;
  if (!isValidPhaseMetricSummary(a.lateAdaptation)) return false;
  if (a.directionalErrorChangeDegrees !== null && (typeof a.directionalErrorChangeDegrees !== "number" || !Number.isFinite(a.directionalErrorChangeDegrees))) return false;
  return true;
}

function isValidBaselineComparison(val: unknown): boolean {
  if (typeof val !== "object" || val === null) return false;
  const b = val as Record<string, unknown>;
  if (typeof b.participantId !== "string" || b.participantId.trim().length === 0) return false;
  if (typeof b.baselineSessionId !== "string" || b.baselineSessionId.trim().length === 0) return false;
  if (typeof b.comparisonSessionId !== "string" || b.comparisonSessionId.trim().length === 0) return false;
  if (typeof b.metric !== "string" || !VALID_BASELINE_METRICS.includes(b.metric)) return false;
  if (b.baselineValue !== null && (typeof b.baselineValue !== "number" || !Number.isFinite(b.baselineValue))) return false;
  if (b.comparisonValue !== null && (typeof b.comparisonValue !== "number" || !Number.isFinite(b.comparisonValue))) return false;
  if (b.changeFromBaseline !== null && (typeof b.changeFromBaseline !== "number" || !Number.isFinite(b.changeFromBaseline))) return false;
  if (b.interpretation !== "descriptive-only-not-a-clinical-diagnosis") return false;
  return true;
}

function validateAssessmentSession(session: unknown): StorageResult<AssessmentSession> {
  if (typeof session !== "object" || session === null) {
    return failure("invalid-record", "Assessment session must be an object.");
  }
  const s = session as Record<string, unknown>;
  if (typeof s.metadata !== "object" || s.metadata === null) {
    return failure("invalid-record", "Assessment session metadata is required.");
  }
  const meta = s.metadata as Record<string, unknown>;
  if (typeof meta.sessionId !== "string" || !hasIdentifier(meta.sessionId)) {
    return failure("invalid-record", "Completed assessment sessions require a session ID.");
  }
  if (typeof meta.participantId !== "string" || !hasIdentifier(meta.participantId)) {
    return failure("invalid-record", "Completed assessment sessions require a participant ID.");
  }
  if (!isValidTimestamp(meta.createdAt)) {
    return failure("invalid-record", "Assessment session createdAt must be a valid ISO date.");
  }
  if (meta.completedAt !== null && !isValidTimestamp(meta.completedAt)) {
    return failure("invalid-record", "Assessment session completedAt must be a valid ISO date or null.");
  }
  if (typeof meta.inputDevice !== "string" || !VALID_INPUT_DEVICES.includes(meta.inputDevice)) {
    return failure("invalid-record", "Assessment session inputDevice must be mouse, trackpad, or unknown.");
  }
  if (typeof meta.protocolVersion !== "string" || !hasIdentifier(meta.protocolVersion)) {
    return failure("invalid-record", "Assessment session protocolVersion is required.");
  }
  if (meta.provenance !== "browser-user-generated") {
    return failure("invalid-record", "Only real browser-generated assessment sessions can be saved.");
  }
  if (meta.simulated !== false) {
    return failure("invalid-record", "Simulated assessment sessions cannot be saved as browser records.");
  }
  if (s.status !== "completed") {
    return failure("invalid-record", "Only completed assessment sessions can be saved.");
  }
  if (!Array.isArray(s.conditions) || !s.conditions.every((c) => typeof c === "string" && VALID_CONDITIONS.includes(c))) {
    return failure("invalid-record", "Assessment session conditions must be an array of valid conditions.");
  }
  if (!Array.isArray(s.trials) || !s.trials.every(isValidTrialRecord)) {
    return failure("invalid-record", "Assessment session trials must be an array of valid trial records.");
  }
  if (!Array.isArray(s.phaseSummaries) || !s.phaseSummaries.every(isValidPhaseMetricSummary)) {
    return failure("invalid-record", "Assessment session phaseSummaries must be an array of valid phase summaries.");
  }
  if (!isValidAdaptationSummary(s.adaptationSummary)) {
    return failure("invalid-record", "Assessment session adaptationSummary is malformed.");
  }
  if (!Array.isArray(s.baselineComparisons) || !s.baselineComparisons.every(isValidBaselineComparison)) {
    return failure("invalid-record", "Assessment session baselineComparisons must be an array of valid baseline comparisons.");
  }
  if (s.neuralActivityMeasured !== false) {
    return failure("invalid-record", "neuralActivityMeasured must be false.");
  }
  if (s.clinicalDiagnosticStatus !== "not-a-clinical-diagnosis") {
    return failure("invalid-record", "clinicalDiagnosticStatus must be not-a-clinical-diagnosis.");
  }
  return success(session as AssessmentSession);
}

function hasIdentifier(value: string): boolean { return value.trim().length > 0; }
