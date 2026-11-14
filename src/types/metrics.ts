import type { TrialPhase } from "./trial";

export type TimeUnit = "milliseconds";
export type AngleUnit = "degrees";
export type DistanceUnit = "css-pixels";

export interface TimedMeasurement {
  readonly value: number | null;
  readonly unit: TimeUnit;
  readonly valid: boolean;
}

export interface ReactionTimeMeasurement extends TimedMeasurement { readonly metric: "reaction-time"; }
export interface MovementTimeMeasurement extends TimedMeasurement { readonly metric: "movement-time"; }

export interface DirectionalErrorMeasurement {
  readonly metric: "directional-error";
  readonly value: number | null;
  readonly unit: AngleUnit;
  readonly valid: boolean;
  /** Error sign is retained so clockwise and counterclockwise residuals are distinguishable. */
  readonly signConvention: "positive-clockwise";
}

export interface TrajectoryDeviationMeasurement {
  readonly metric: "trajectory-deviation";
  readonly value: number | null;
  readonly unit: DistanceUnit;
  readonly valid: boolean;
}

export interface CorrectionBehaviourMeasurement {
  readonly metric: "correction-behaviour";
  readonly correctionCount: number | null;
  readonly peakVelocityElapsedMs: number | null;
  readonly valid: boolean;
}

export interface TrialMeasurements {
  readonly reactionTime: ReactionTimeMeasurement;
  readonly movementTime: MovementTimeMeasurement;
  /** First raw movement sample relative to the captured actual start, not peak-velocity error. */
  readonly directionalError: DirectionalErrorMeasurement;
  readonly trajectoryDeviation: TrajectoryDeviationMeasurement;
  readonly correctionBehaviour: CorrectionBehaviourMeasurement;
}

export interface PhaseMetricSummary {
  readonly phase: TrialPhase;
  readonly validTrialCount: number;
  readonly totalTrialCount: number;
  readonly meanDirectionalErrorDegrees: number | null;
  readonly meanReactionTimeMs: number | null;
  readonly meanMovementTimeMs: number | null;
}

export interface AdaptationSummary {
  readonly earlyAdaptation: PhaseMetricSummary;
  readonly lateAdaptation: PhaseMetricSummary;
  readonly directionalErrorChangeDegrees: number | null;
}

export interface AftereffectSummary {
  readonly baselineMeanDirectionalErrorDegrees: number | null;
  readonly initialWashoutMeanDirectionalErrorDegrees: number | null;
  readonly signedAftereffectDegrees: number | null;
  readonly magnitudeDegrees: number | null;
  readonly validBaselineTrialCount: number;
  readonly validWashoutTrialCount: number;
  readonly initialWashoutTrialWindow: number;
}

export interface BaselineComparison {
  readonly participantId: string;
  readonly baselineSessionId: string;
  readonly comparisonSessionId: string;
  readonly metric: "directional-error" | "reaction-time" | "movement-time";
  readonly baselineValue: number | null;
  readonly comparisonValue: number | null;
  readonly changeFromBaseline: number | null;
  readonly interpretation: "descriptive-only-not-a-clinical-diagnosis";
}
