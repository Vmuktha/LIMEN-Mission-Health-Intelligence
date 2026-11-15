import { EXTENDED_CHECK_IN_FIELDS } from "@/lib/checkin/record";
import type { RecoveryCheckInObservation, RecoveryCheckInScoreField } from "@/types/recovery";

export interface SelfReportTrendPoint {
  readonly checkInId: string;
  readonly recordedAt: string;
  readonly value: number | null;
  readonly observationIndex: number;
}

export interface SelfReportTrendSeries {
  readonly field: RecoveryCheckInScoreField;
  readonly label: string;
  readonly scale: string;
  readonly polarity: "higher-is-worse" | "higher-is-better";
  readonly observations: readonly RecoveryCheckInObservation[];
  readonly points: readonly SelfReportTrendPoint[];
}

export function buildSelfReportTrendSeries(
  checkIns: readonly RecoveryCheckInObservation[],
  field: RecoveryCheckInScoreField,
): SelfReportTrendSeries {
  const definition = EXTENDED_CHECK_IN_FIELDS.find((item) => item.field === field);
  if (!definition) throw new Error(`Unknown self-report field: ${field}`);

  const observations = [...checkIns].sort((left, right) => {
    const leftTime = Date.parse(left.recordedAt);
    const rightTime = Date.parse(right.recordedAt);
    const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
    const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;
    return safeLeftTime - safeRightTime || left.checkInId.localeCompare(right.checkInId);
  });

  return {
    field,
    label: definition.label,
    scale: definition.scale,
    polarity: definition.polarity,
    observations,
    points: observations.map((observation, observationIndex) => ({
      checkInId: observation.checkInId,
      recordedAt: observation.recordedAt,
      value: observation.scores[field],
      observationIndex,
    })),
  };
}
