/** A coordinate in the browser assessment coordinate system, in CSS pixels. */
export interface CursorCoordinate {
  readonly x: number;
  readonly y: number;
}

export type TargetDirection = "up" | "right" | "down" | "left";

export interface TargetPosition extends CursorCoordinate {
  readonly direction: TargetDirection;
}

export interface CursorTrajectoryPoint extends CursorCoordinate {
  /** Milliseconds elapsed since the target was displayed. */
  readonly elapsedMs: number;
}

export type TrialPhase = "baseline" | "early-adaptation" | "late-adaptation" | "de-adaptation";
export type RotationCondition = "none" | "clockwise-45-degrees";
export type TrialOutcome = "completed" | "aborted" | "invalid" | "timed-out";
export type MeasurementProtocolVersion = "0.1.0-legacy-origin-unverified" | "0.2.0-actual-pointer-origin" | "0.3.0-actual-pointer-origin-hidden-cursor";

/** A trial record is a browser interaction record, never a published research finding. */
export interface TrialRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly index: number;
  readonly phase: TrialPhase;
  readonly rotationCondition: RotationCondition;
  readonly target: TargetPosition;
  readonly startPosition: CursorCoordinate;
  /** Geometric centre marker shown during positioning; not assumed to be the physical pointer. */
  readonly designatedStartPosition?: CursorCoordinate;
  /** Actual pointer coordinate captured after successful positioning; absent for unverified-origin records. */
  readonly actualStartPosition?: CursorCoordinate;
  /** Present only when the actual start was captured through the positioning procedure. */
  readonly positioningCompletedAt?: string;
  readonly measurementProtocolVersion?: MeasurementProtocolVersion;
  readonly targetPresentedAt: string;
  readonly movementOnsetAt: string | null;
  readonly movementCompletedAt: string | null;
  readonly trajectory: readonly CursorTrajectoryPoint[];
  /**
   * Visual-feedback positions shown by the browser cursor. `trajectory` always
   * remains the untransformed, actual pointer path used for behavioural metrics.
   * Older records may not contain this optional reproducibility field.
   */
  readonly displayedCursorTrajectory?: readonly CursorTrajectoryPoint[];
  readonly outcome: TrialOutcome;
  readonly invalidReason?: string;
}
