import type { MissionPhase } from "./mission";

/** Integer self-report scale: 0 = none / no confidence; 10 = extreme / complete confidence. */
export type SelfReportedScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type CheckInContext = "pre-assessment" | "post-assessment" | "general";

/**
 * The six subjective self-report items. One canonical list is shared by the
 * check-in form and every recovery view so wording and scales cannot drift.
 */
export type CheckInScoreField =
  | "dizzinessOrDisorientation"
  | "balanceOrCoordinationDifficulty"
  | "nausea"
  | "visualDiscomfort"
  | "fatigue"
  | "movementConfidence";

export interface CheckInFieldDefinition {
  readonly field: CheckInScoreField;
  readonly label: string;
  readonly scale: string;
}

/**
 * Subjective self-report. Omitted scores are unanswered, not zero; no field is
 * an objective vestibular, neurological, or clinical measurement.
 */
export interface SymptomCheckInRecord {
  readonly id: string;
  readonly participantId: string;
  readonly recordedAt: string;
  readonly context: CheckInContext;
  /** Present only when a real completed assessment session is already known. */
  readonly assessmentSessionId?: string;
  readonly missionPhase?: MissionPhase;
  readonly provenance: "browser-user-generated";
  readonly dizzinessOrDisorientation?: SelfReportedScore;
  readonly balanceOrCoordinationDifficulty?: SelfReportedScore;
  readonly nausea?: SelfReportedScore;
  readonly visualDiscomfort?: SelfReportedScore;
  readonly fatigue?: SelfReportedScore;
  /** 0 = no confidence; 10 = complete confidence. */
  readonly movementConfidence?: SelfReportedScore;
  readonly freeTextNote?: string;
  readonly interpretation: "self-report-not-an-objective-vestibular-measurement";
}
