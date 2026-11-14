/**
 * Follow-up workflow records.
 *
 * These are administrative workflow records only. LIMEN does not diagnose,
 * prescribe, escalate care, or perform a medical referral. A referral record is
 * a user-entered request that an authorised reviewer consider the observation.
 */

export type FollowUpStatus = "open" | "reviewed" | "scheduled" | "completed" | "referred";

export type FollowUpRelatedKind = "assessment-session" | "check-in" | "signal-concordance" | "mission-event";

export interface FollowUpRelatedObservation {
  readonly kind: FollowUpRelatedKind;
  readonly id: string;
}

export type FollowUpActionType =
  | "create"
  | "review-observation"
  | "request-repeat-assessment"
  | "record-follow-up-check-in"
  | "add-contextual-note"
  | "mark-reviewed"
  | "schedule"
  | "complete"
  | "record-referral";

export interface FollowUpHistoryEntry {
  readonly id: string;
  readonly action: FollowUpActionType;
  readonly at: string;
  readonly author: string;
  readonly note?: string;
  /** Explicit identifier of a related check-in or assessment, when applicable. */
  readonly relatedId?: string;
}

export interface FollowUpNote {
  readonly id: string;
  readonly text: string;
  readonly author: string;
  readonly createdAt: string;
}

export interface FollowUpReferral {
  readonly id: string;
  /** Free-text authorised reviewer or service the user says they are referring to. */
  readonly referredTo: string;
  readonly reason: string;
  readonly requestedAt: string;
  readonly requestedBy: string;
  readonly status: "requested" | "acknowledged" | "completed";
  /** LIMEN records the request; it never performs the referral. */
  readonly performedByLimen: false;
  readonly interpretation: "request-for-authorised-medical-review-not-limen-escalation";
}

export type FollowUpSource = "user-entered" | "operator-entered" | "simulated-demo";
export type FollowUpProvenance = "browser-user-generated" | "simulated-demo";

export interface FollowUpRecord {
  readonly id: string;
  readonly relatedObservation: FollowUpRelatedObservation;
  readonly reason: string;
  readonly notes: readonly FollowUpNote[];
  readonly status: FollowUpStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Manually entered; never derived from a schedule or timestamp. */
  readonly dueDate?: string;
  readonly author: string;
  readonly source: FollowUpSource;
  readonly provenance: FollowUpProvenance;
  readonly referral?: FollowUpReferral;
  readonly history: readonly FollowUpHistoryEntry[];
  readonly interpretation: "workflow-record-not-medical-advice";
}

export interface FollowUpDraft {
  readonly id: string;
  readonly relatedObservation: FollowUpRelatedObservation;
  readonly reason: string;
  readonly author: string;
  readonly source: FollowUpSource;
  readonly provenance: FollowUpProvenance;
  readonly dueDate?: string;
  readonly createdAt?: string;
}

export interface FollowUpValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
