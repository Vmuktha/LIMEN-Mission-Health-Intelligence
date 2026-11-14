import type { CheckInContext, CheckInFieldDefinition, CheckInScoreField, SelfReportedScore, SymptomCheckInRecord } from "@/types/checkin";

export interface CheckInAnswers extends Partial<Record<CheckInScoreField, SelfReportedScore>> {
  readonly freeTextNote?: string;
}

/**
 * The single source of truth for self-report wording and scales. The check-in
 * form and the recovery dashboard both read this list, so an item can never be
 * displayed with one label in one place and another label elsewhere.
 */
export const CHECK_IN_FIELDS: readonly CheckInFieldDefinition[] = [
  { field: "dizzinessOrDisorientation", label: "Dizziness or disorientation", scale: "0 = none; 10 = extreme" },
  { field: "balanceOrCoordinationDifficulty", label: "Balance or coordination difficulty", scale: "0 = none; 10 = extreme" },
  { field: "nausea", label: "Nausea", scale: "0 = none; 10 = extreme" },
  { field: "visualDiscomfort", label: "Visual discomfort", scale: "0 = none; 10 = extreme" },
  { field: "fatigue", label: "Fatigue", scale: "0 = none; 10 = extreme" },
  { field: "movementConfidence", label: "Confidence in movement", scale: "0 = no confidence; 10 = complete confidence" },
];

/** Builds a subjective self-report without substituting unanswered items with zero. */
export function createBrowserCheckIn(context: CheckInContext, answers: CheckInAnswers, options: { readonly id: string; readonly participantId: string; readonly assessmentSessionId?: string; readonly recordedAt?: string }): SymptomCheckInRecord {
  const note = answers.freeTextNote?.trim();
  return {
    id: options.id,
    participantId: options.participantId,
    recordedAt: options.recordedAt ?? new Date().toISOString(),
    context,
    ...(options.assessmentSessionId ? { assessmentSessionId: options.assessmentSessionId } : {}),
    provenance: "browser-user-generated",
    ...(answers.dizzinessOrDisorientation !== undefined ? { dizzinessOrDisorientation: answers.dizzinessOrDisorientation } : {}),
    ...(answers.balanceOrCoordinationDifficulty !== undefined ? { balanceOrCoordinationDifficulty: answers.balanceOrCoordinationDifficulty } : {}),
    ...(answers.nausea !== undefined ? { nausea: answers.nausea } : {}),
    ...(answers.visualDiscomfort !== undefined ? { visualDiscomfort: answers.visualDiscomfort } : {}),
    ...(answers.fatigue !== undefined ? { fatigue: answers.fatigue } : {}),
    ...(answers.movementConfidence !== undefined ? { movementConfidence: answers.movementConfidence } : {}),
    ...(note ? { freeTextNote: note } : {}),
    interpretation: "self-report-not-an-objective-vestibular-measurement",
  };
}
