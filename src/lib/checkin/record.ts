import type {
  CheckInContext,
  CheckInFieldDefinition,
  CheckInPolarity,
  CheckInScoreField,
  ExtendedCheckInAnswers,
  ExtendedCheckInFieldDefinition,
  ExtendedCheckInScoreField,
  SelfReportedScore,
  SymptomCheckInRecord,
} from "@/types/checkin";
import type { MissionPhase } from "@/types/mission";

/** Legacy six-item answer set, kept for the existing check-in form. */
export interface CheckInAnswers extends Partial<Record<CheckInScoreField, SelfReportedScore>> {
  readonly freeTextNote?: string;
}

/**
 * The original six self-report items. This single source of truth is shared by
 * the existing check-in form and every recovery view, so wording and scales
 * cannot drift. Stage 4 items live in `EXTENDED_CHECK_IN_FIELDS` and are not
 * rendered by the existing form.
 */
export const CHECK_IN_FIELDS: readonly CheckInFieldDefinition[] = [
  { field: "dizzinessOrDisorientation", label: "Dizziness or disorientation", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported dizziness or disorientation" },
  { field: "balanceOrCoordinationDifficulty", label: "Balance or coordination difficulty", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported balance or coordination difficulty" },
  { field: "nausea", label: "Nausea", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported nausea" },
  { field: "visualDiscomfort", label: "Visual discomfort", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported visual discomfort" },
  { field: "fatigue", label: "Fatigue", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported fatigue" },
  { field: "movementConfidence", label: "Confidence in movement", scale: "0 = no confidence; 10 = complete confidence", polarity: "higher-is-better", construct: "Better reported confidence in movement" },
];

/** Stage 4 crew-context items, additive to the original six. */
export const EXTENDED_CHECK_IN_FIELDS: readonly ExtendedCheckInFieldDefinition[] = [
  ...CHECK_IN_FIELDS,
  { field: "sleepQuality", label: "Sleep quality", scale: "0 = very poor; 10 = very good", polarity: "higher-is-better", construct: "Better reported sleep quality" },
  { field: "sleepScheduleDisruption", label: "Sleep schedule disruption", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported sleep-schedule disruption" },
  { field: "workload", label: "Workload", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "Higher reported workload" },
  { field: "stress", label: "Stress", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported stress" },
  { field: "generalWellbeing", label: "General wellbeing", scale: "0 = very poor; 10 = very good", polarity: "higher-is-better", construct: "Better reported general wellbeing" },
  { field: "existingSymptoms", label: "Existing symptoms", scale: "0 = none; 10 = extreme", polarity: "higher-is-worse", construct: "More reported symptom burden" },
];

export const ALL_CHECK_IN_FIELDS: readonly ExtendedCheckInFieldDefinition[] = EXTENDED_CHECK_IN_FIELDS;

const FIELD_BY_KEY: ReadonlyMap<ExtendedCheckInScoreField, ExtendedCheckInFieldDefinition> = new Map(
  EXTENDED_CHECK_IN_FIELDS.map((definition) => [definition.field, definition]),
);

export function checkInFieldDefinition(field: ExtendedCheckInScoreField): ExtendedCheckInFieldDefinition {
  const definition = FIELD_BY_KEY.get(field);
  if (!definition) throw new Error(`Unknown check-in field: ${field}`);
  return definition;
}

export function checkInPolarity(field: ExtendedCheckInScoreField): CheckInPolarity {
  return checkInFieldDefinition(field).polarity;
}

/** True when a higher answer is better; false when a higher answer is worse. */
export function isHigherAnswerBetter(field: ExtendedCheckInScoreField): boolean {
  return checkInPolarity(field) === "higher-is-better";
}

/**
 * Builds a subjective self-report without substituting unanswered items with
 * zero. Existing six-item calls remain valid; Stage 4 answers are stored only
 * when they were actually provided.
 */
export function createBrowserCheckIn(
  context: CheckInContext,
  answers: ExtendedCheckInAnswers,
  options: {
    readonly id: string;
    readonly participantId: string;
    readonly assessmentSessionId?: string;
    readonly recordedAt?: string;
    readonly missionPhase?: MissionPhase;
    readonly missionContextId?: string;
  },
): SymptomCheckInRecord {
  const note = answers.freeTextNote?.trim();
  const scores: Partial<Record<ExtendedCheckInScoreField, SelfReportedScore>> = {};
  for (const definition of EXTENDED_CHECK_IN_FIELDS) {
    const value = answers[definition.field];
    if (value !== undefined) scores[definition.field] = value;
  }
  return {
    id: options.id,
    participantId: options.participantId,
    recordedAt: options.recordedAt ?? new Date().toISOString(),
    context,
    ...(options.assessmentSessionId ? { assessmentSessionId: options.assessmentSessionId } : {}),
    ...(options.missionPhase ? { missionPhase: options.missionPhase } : {}),
    ...(options.missionContextId ? { missionContextId: options.missionContextId } : {}),
    provenance: "browser-user-generated",
    ...scores,
    ...(note ? { freeTextNote: note } : {}),
    interpretation: "self-report-not-an-objective-vestibular-measurement",
  };
}
