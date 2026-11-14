import type { CheckInContext, SelfReportedScore, SymptomCheckInRecord } from "@/types/checkin";
import type { MissionPhase } from "@/types/mission";

export const CHECKIN_NOTE_MAX_LENGTH = 1_000;
const checkInContexts: readonly CheckInContext[] = ["pre-assessment", "post-assessment", "general"];
const missionPhases: readonly MissionPhase[] = ["preflight", "inflight", "postflight", "reconditioning"];
const scoreFields = ["dizzinessOrDisorientation", "balanceOrCoordinationDifficulty", "nausea", "visualDiscomfort", "fatigue", "movementConfidence"] as const;

export interface CheckInValidationResult { readonly valid: boolean; readonly errors: readonly string[]; }

export function validateCheckIn(record: unknown): CheckInValidationResult {
  if (!isObject(record)) return invalid("Check-in must be an object.");
  const errors: string[] = [];
  if (!isNonEmptyString(record.id)) errors.push("Check-in ID is required.");
  if (!isNonEmptyString(record.participantId)) errors.push("Participant ID is required.");
  if (record.assessmentSessionId !== undefined && !isNonEmptyString(record.assessmentSessionId)) errors.push("Assessment session ID must be non-empty when provided.");
  if (!isValidTimestamp(record.recordedAt)) errors.push("Recorded-at timestamp must be a valid ISO-compatible date.");
  if (!checkInContexts.includes(record.context as CheckInContext)) errors.push("Check-in context must be pre-assessment, post-assessment, or general.");
  if (record.missionPhase !== undefined && !missionPhases.includes(record.missionPhase as MissionPhase)) errors.push("Mission phase is invalid.");
  if (record.provenance !== "browser-user-generated") errors.push("Check-in provenance must be browser-user-generated.");
  if (record.interpretation !== "self-report-not-an-objective-vestibular-measurement") errors.push("Check-in interpretation must preserve self-report status.");
  for (const field of scoreFields) {
    const value = record[field];
    if (value !== undefined && !isSelfReportedScore(value)) errors.push(`${field} must be an integer from 0 through 10 when answered.`);
  }
  if (record.freeTextNote !== undefined && (typeof record.freeTextNote !== "string" || record.freeTextNote.length > CHECKIN_NOTE_MAX_LENGTH)) errors.push(`Free-text note must be at most ${CHECKIN_NOTE_MAX_LENGTH} characters.`);
  return { valid: errors.length === 0, errors };
}

export function isValidCheckIn(record: unknown): record is SymptomCheckInRecord { return validateCheckIn(record).valid; }

export function isSelfReportedScore(value: unknown): value is SelfReportedScore { return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 10; }

function invalid(error: string): CheckInValidationResult { return { valid: false, errors: [error] }; }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isValidTimestamp(value: unknown): boolean { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
