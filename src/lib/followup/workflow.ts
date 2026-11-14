/**
 * Pure follow-up lifecycle logic.
 *
 * Status transitions are closed and documented. No function offers medical
 * advice, sets a prescription, or claims that LIMEN escalated a concern. A
 * referral is stored as a user-entered request for authorised review.
 */

import type {
  FollowUpActionType,
  FollowUpDraft,
  FollowUpHistoryEntry,
  FollowUpNote,
  FollowUpRecord,
  FollowUpReferral,
  FollowUpRelatedKind,
  FollowUpSource,
  FollowUpProvenance,
  FollowUpStatus,
  FollowUpValidationResult,
} from "@/types/followup";

export const FOLLOW_UP_STATUSES: readonly FollowUpStatus[] = ["open", "reviewed", "scheduled", "completed", "referred"];
export const FOLLOW_UP_RELATED_KINDS: readonly FollowUpRelatedKind[] = ["assessment-session", "check-in", "signal-concordance", "mission-event"];
export const FOLLOW_UP_STATUS_LABELS: Readonly<Record<FollowUpStatus, string>> = {
  open: "Open",
  reviewed: "Reviewed",
  scheduled: "Scheduled",
  completed: "Completed",
  referred: "Referred for authorised review",
};

/** Closed transition table. Terminal states have no outgoing transitions. */
export const FOLLOW_UP_TRANSITIONS: Readonly<Record<FollowUpStatus, readonly FollowUpStatus[]>> = {
  open: ["reviewed", "scheduled", "completed", "referred"],
  reviewed: ["scheduled", "completed", "referred"],
  scheduled: ["reviewed", "completed", "referred"],
  completed: [],
  referred: [],
};

export const FOLLOW_UP_TEXT_MAX_LENGTH = 2_000;
export const FOLLOW_UP_NOTE_MAX_LENGTH = 2_000;

const SOURCES: readonly FollowUpSource[] = ["user-entered", "operator-entered", "simulated-demo"];
const PROVENANCES: readonly FollowUpProvenance[] = ["browser-user-generated", "simulated-demo"];

export function canTransitionFollowUp(from: FollowUpStatus, to: FollowUpStatus): boolean {
  return FOLLOW_UP_TRANSITIONS[from].includes(to);
}

export function validateFollowUp(value: unknown): FollowUpValidationResult {
  if (!isRecord(value)) return invalid("Follow-up record must be an object.");
  const errors: string[] = [];
  if (!isNonEmptyString(value.id)) errors.push("Follow-up ID is required.");
  if (!isRecord(value.relatedObservation)) {
    errors.push("A follow-up requires a related observation.");
  } else {
    if (!FOLLOW_UP_RELATED_KINDS.includes(value.relatedObservation.kind as FollowUpRelatedKind)) errors.push("Related observation kind is invalid.");
    if (!isNonEmptyString(value.relatedObservation.id)) errors.push("Related observation ID is required.");
  }
  if (!isNonEmptyString(value.reason)) errors.push("A follow-up requires a reason.");
  else if ((value.reason as string).length > FOLLOW_UP_TEXT_MAX_LENGTH) errors.push(`Follow-up reason must be at most ${FOLLOW_UP_TEXT_MAX_LENGTH} characters.`);
  if (!FOLLOW_UP_STATUSES.includes(value.status as FollowUpStatus)) errors.push("Follow-up status is invalid.");
  if (!isValidTimestamp(value.createdAt)) errors.push("Follow-up createdAt must be a valid timestamp.");
  if (!isValidTimestamp(value.updatedAt)) errors.push("Follow-up updatedAt must be a valid timestamp.");
  if (value.dueDate !== undefined && !isValidTimestamp(value.dueDate)) errors.push("Follow-up due date must be a valid timestamp when provided.");
  if (!isNonEmptyString(value.author)) errors.push("A follow-up requires an explicit author.");
  if (!SOURCES.includes(value.source as FollowUpSource)) errors.push("Follow-up source is invalid.");
  if (!PROVENANCES.includes(value.provenance as FollowUpProvenance)) errors.push("Follow-up provenance is invalid.");
  if (value.source === "simulated-demo" && value.provenance !== "simulated-demo") errors.push("Simulated-demo follow-ups must carry simulated-demo provenance.");
  if (value.source !== "simulated-demo" && value.provenance === "simulated-demo") errors.push("Only simulated-demo sources may carry simulated-demo provenance.");
  if (value.interpretation !== "workflow-record-not-medical-advice") errors.push("Follow-up interpretation must remain workflow-record-not-medical-advice.");
  if (!Array.isArray(value.notes)) errors.push("Follow-up notes must be an array.");
  else if (!value.notes.every(isValidNote)) errors.push("Every follow-up note requires an ID, text, author, and valid timestamp.");
  if (!Array.isArray(value.history)) errors.push("Follow-up history must be an array.");
  if (value.referral !== undefined && !isValidReferral(value.referral)) errors.push("Follow-up referral record is invalid.");
  return { valid: errors.length === 0, errors };
}

export function createFollowUp(draft: FollowUpDraft, now = new Date().toISOString()): FollowUpRecord {
  const record: FollowUpRecord = {
    id: draft.id,
    relatedObservation: draft.relatedObservation,
    reason: draft.reason,
    notes: [],
    status: "open",
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
    ...(draft.dueDate !== undefined ? { dueDate: draft.dueDate } : {}),
    author: draft.author,
    source: draft.source,
    provenance: draft.provenance,
    history: [{ id: `${draft.id}-created`, action: "create", at: draft.createdAt ?? now, author: draft.author, note: "Follow-up record created." }],
    interpretation: "workflow-record-not-medical-advice",
  };
  const validation = validateFollowUp(record);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return record;
}

export function addFollowUpNote(record: FollowUpRecord, note: FollowUpNote): FollowUpRecord {
  const next: FollowUpRecord = {
    ...record,
    notes: [...record.notes, note],
    updatedAt: note.createdAt,
    history: [...record.history, historyEntry(record, "add-contextual-note", note.author, note.createdAt, note.text)],
  };
  return assertValid(next);
}

export function markFollowUpReviewed(record: FollowUpRecord, at: string, author: string, note?: string): FollowUpRecord {
  return transition(record, "reviewed", "mark-reviewed", at, author, note);
}

export function reviewObservation(record: FollowUpRecord, at: string, author: string, note?: string): FollowUpRecord {
  return transition(record, "reviewed", "review-observation", at, author, note);
}

export function scheduleFollowUp(record: FollowUpRecord, dueDate: string, at: string, author: string, note?: string): FollowUpRecord {
  if (!isValidTimestamp(dueDate)) throw new Error("A scheduled follow-up requires a valid manually entered due date.");
  const next: FollowUpRecord = {
    ...transition(record, "scheduled", "schedule", at, author, note),
    dueDate,
  };
  return assertValid(next);
}

export function completeFollowUp(record: FollowUpRecord, at: string, author: string, note?: string): FollowUpRecord {
  return transition(record, "completed", "complete", at, author, note);
}

/** Records a user request for a repeat functional assessment. */
export function requestRepeatAssessment(record: FollowUpRecord, at: string, author: string, note?: string): FollowUpRecord {
  if (isTerminal(record.status)) throw new Error(`A ${record.status} follow-up cannot request a repeat assessment.`);
  const next: FollowUpRecord = {
    ...record,
    updatedAt: at,
    history: [...record.history, historyEntry(record, "request-repeat-assessment", author, at, note)],
  };
  return assertValid(next);
}

/** Records that a follow-up check-in was completed and explicitly linked. */
export function recordFollowUpCheckIn(record: FollowUpRecord, checkInId: string, at: string, author: string, note?: string): FollowUpRecord {
  if (!isNonEmptyString(checkInId)) throw new Error("A follow-up check-in requires an explicit check-in identifier.");
  if (isTerminal(record.status)) throw new Error(`A ${record.status} follow-up cannot record another check-in.`);
  const next: FollowUpRecord = {
    ...record,
    updatedAt: at,
    history: [...record.history, { ...historyEntry(record, "record-follow-up-check-in", author, at, note), relatedId: checkInId }],
  };
  return assertValid(next);
}

/** Records a user-entered referral for authorised medical review. LIMEN does not perform it. */
export function recordReferral(record: FollowUpRecord, referral: FollowUpReferral): FollowUpRecord {
  if (referral.performedByLimen !== false || referral.interpretation !== "request-for-authorised-medical-review-not-limen-escalation") {
    throw new Error("A referral record must state that LIMEN did not perform the referral.");
  }
  if (!isValidReferral(referral)) throw new Error("Referral record is invalid.");
  if (isTerminal(record.status)) throw new Error(`A ${record.status} follow-up cannot record a new referral.`);
  const next: FollowUpRecord = {
    ...record,
    status: "referred",
    referral,
    updatedAt: referral.requestedAt,
    history: [...record.history, historyEntry(record, "record-referral", referral.requestedBy, referral.requestedAt, referral.reason)],
  };
  return assertValid(next);
}

export function isFollowUp(value: unknown): value is FollowUpRecord {
  return validateFollowUp(value).valid;
}

function transition(record: FollowUpRecord, to: FollowUpStatus, action: FollowUpActionType, at: string, author: string, note?: string): FollowUpRecord {
  if (!canTransitionFollowUp(record.status, to)) throw new Error(`A ${record.status} follow-up cannot transition to ${to}.`);
  if (!isValidTimestamp(at)) throw new Error("A follow-up transition requires a valid timestamp.");
  if (!isNonEmptyString(author)) throw new Error("A follow-up transition requires an explicit author.");
  const next: FollowUpRecord = {
    ...record,
    status: to,
    updatedAt: at,
    history: [...record.history, historyEntry(record, action, author, at, note)],
  };
  return assertValid(next);
}

function historyEntry(record: FollowUpRecord, action: FollowUpActionType, author: string, at: string, note?: string): FollowUpHistoryEntry {
  return {
    id: `${record.id}-${record.history.length + 1}-${action}`,
    action,
    at,
    author,
    ...(note !== undefined ? { note } : {}),
  };
}

function assertValid(record: FollowUpRecord): FollowUpRecord {
  const validation = validateFollowUp(record);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return record;
}

function isTerminal(status: FollowUpStatus): boolean {
  return FOLLOW_UP_TRANSITIONS[status].length === 0;
}

function isValidNote(value: unknown): value is FollowUpNote {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && typeof value.text === "string"
    && value.text.length > 0
    && value.text.length <= FOLLOW_UP_NOTE_MAX_LENGTH
    && isNonEmptyString(value.author)
    && isValidTimestamp(value.createdAt);
}

function isValidReferral(value: unknown): value is FollowUpReferral {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.referredTo)
    && isNonEmptyString(value.reason)
    && isValidTimestamp(value.requestedAt)
    && isNonEmptyString(value.requestedBy)
    && ["requested", "acknowledged", "completed"].includes(value.status as string)
    && value.performedByLimen === false
    && value.interpretation === "request-for-authorised-medical-review-not-limen-escalation";
}

function invalid(error: string): FollowUpValidationResult {
  return { valid: false, errors: [error] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
