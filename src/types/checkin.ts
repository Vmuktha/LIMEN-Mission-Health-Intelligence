import type { MissionPhase } from "./mission";

/** Integer self-report scale: 0 = none / no confidence; 10 = extreme / complete confidence. */
export type SelfReportedScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type CheckInContext = "pre-assessment" | "post-assessment" | "general";

/**
 * The original six subjective self-report items. This union is preserved
 * unchanged so the existing check-in form, recovery dashboard, and stored
 * records keep their exact semantics.
 */
export type CheckInScoreField =
  | "dizzinessOrDisorientation"
  | "balanceOrCoordinationDifficulty"
  | "nausea"
  | "visualDiscomfort"
  | "fatigue"
  | "movementConfidence";

/**
 * Stage 4 crew-context items. They are additive: every existing record remains
 * valid without them, and an omitted answer is unanswered rather than zero.
 */
export type ExtendedCheckInScoreField =
  | CheckInScoreField
  | "sleepQuality"
  | "sleepScheduleDisruption"
  | "workload"
  | "stress"
  | "generalWellbeing"
  | "existingSymptoms";

/** Explicit polarity. Opposite-polarity answers are never averaged together. */
export type CheckInPolarity = "higher-is-better" | "higher-is-worse";

export interface CheckInFieldDefinition {
  readonly field: CheckInScoreField;
  readonly label: string;
  readonly scale: string;
  readonly polarity: CheckInPolarity;
  /** Short statement of what a higher answer means, used by explainable views. */
  readonly construct: string;
}

export interface ExtendedCheckInFieldDefinition {
  readonly field: ExtendedCheckInScoreField;
  readonly label: string;
  readonly scale: string;
  readonly polarity: CheckInPolarity;
  readonly construct: string;
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
  /** Explicitly recorded; never inferred from `recordedAt`. */
  readonly missionPhase?: MissionPhase;
  /** Explicit link to a mission-context record, when one was recorded. */
  readonly missionContextId?: string;
  readonly provenance: "browser-user-generated";
  readonly dizzinessOrDisorientation?: SelfReportedScore;
  readonly balanceOrCoordinationDifficulty?: SelfReportedScore;
  readonly nausea?: SelfReportedScore;
  readonly visualDiscomfort?: SelfReportedScore;
  readonly fatigue?: SelfReportedScore;
  /** 0 = no confidence; 10 = complete confidence. */
  readonly movementConfidence?: SelfReportedScore;
  /** 0 = very poor; 10 = very good. Higher is better. */
  readonly sleepQuality?: SelfReportedScore;
  /** 0 = no disruption; 10 = extreme disruption. Higher is worse. */
  readonly sleepScheduleDisruption?: SelfReportedScore;
  /** 0 = no workload; 10 = extreme workload. Higher is worse. */
  readonly workload?: SelfReportedScore;
  /** 0 = no stress; 10 = extreme stress. Higher is worse. */
  readonly stress?: SelfReportedScore;
  /** 0 = very poor; 10 = very good. Higher is better. */
  readonly generalWellbeing?: SelfReportedScore;
  /** 0 = none; 10 = extreme. Higher is worse. */
  readonly existingSymptoms?: SelfReportedScore;
  readonly freeTextNote?: string;
  readonly interpretation: "self-report-not-an-objective-vestibular-measurement";
}

/** All Stage 4 self-report answers, including the original six. */
export type ExtendedCheckInAnswers = Partial<Record<ExtendedCheckInScoreField, SelfReportedScore>> & {
  readonly freeTextNote?: string;
};
