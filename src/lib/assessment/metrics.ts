import type { CorrectionBehaviourMeasurement, DirectionalErrorMeasurement, MovementTimeMeasurement, PhaseMetricSummary, ReactionTimeMeasurement, TrajectoryDeviationMeasurement, TrialMeasurements } from "@/types/metrics";
import type { CursorCoordinate, CursorTrajectoryPoint, TrialPhase, TrialRecord } from "@/types/trial";
import { allowsOriginSensitiveMetrics, allowsTimingMetrics, isCorrectedOriginTrial, measurementValidityForTrials } from "./measurement-validity";
import { MOVEMENT_ONSET_DISTANCE_CSS_PIXELS } from "./interaction";

const DIRECTION_CHANGE_THRESHOLD_DEGREES = 10;
const VECTOR_EPSILON = 0.000001;

/** Returns null for missing, invalid, negative, or zero-duration timestamps. */
export function elapsedMilliseconds(startTimestamp: string | null, endTimestamp: string | null, allowZero = false): number | null {
  if (!startTimestamp || !endTimestamp) return null;
  const start = Date.parse(startTimestamp);
  const end = Date.parse(endTimestamp);
  const elapsed = end - start;
  if (!Number.isFinite(start) || !Number.isFinite(end) || elapsed < 0 || (!allowZero && elapsed === 0)) return null;
  return elapsed;
}

export function calculateReactionTime(trial: TrialRecord): ReactionTimeMeasurement {
  const value = trial.outcome === "completed" ? elapsedMilliseconds(trial.targetPresentedAt, trial.movementOnsetAt, true) : null;
  return { metric: "reaction-time", value, unit: "milliseconds", valid: value !== null };
}

export function calculateMovementTime(trial: TrialRecord): MovementTimeMeasurement {
  const value = trial.outcome === "completed" ? elapsedMilliseconds(trial.movementOnsetAt, trial.movementCompletedAt) : null;
  return { metric: "movement-time", value, unit: "milliseconds", valid: value !== null };
}

/**
 * Signed angle from the target vector to the first raw movement sample at least
 * 3 CSS pixels from the captured actual start. It is an initial aiming error,
 * not an error at peak velocity. In screen coordinates (+y down), a positive
 * value is a clockwise error.
 */
export function calculateDirectionalError(trial: TrialRecord): DirectionalErrorMeasurement {
  if (trial.outcome !== "completed" || !isCorrectedOriginTrial(trial)) return invalidDirectionalError();
  const start = trial.actualStartPosition;
  if (!start) return invalidDirectionalError();
  const actualPoint = firstMovementPoint(trial);
  if (!actualPoint) return invalidDirectionalError();
  const intended = vectorBetween(start, trial.target);
  const actual = vectorBetween(start, actualPoint);
  if (vectorLength(intended) <= VECTOR_EPSILON || vectorLength(actual) <= VECTOR_EPSILON) return invalidDirectionalError();
  return { metric: "directional-error", value: normalizeSignedDegrees(screenAngle(actual) - screenAngle(intended)), unit: "degrees", valid: true, signConvention: "positive-clockwise" };
}

/** Root-mean-square perpendicular distance of trajectory samples from the start-to-target line. */
export function calculateTrajectoryDeviation(trial: TrialRecord): TrajectoryDeviationMeasurement {
  if (trial.outcome !== "completed" || !isCorrectedOriginTrial(trial) || trial.trajectory.length === 0) return { metric: "trajectory-deviation", value: null, unit: "css-pixels", valid: false };
  const start = trial.actualStartPosition;
  if (!start) return { metric: "trajectory-deviation", value: null, unit: "css-pixels", valid: false };
  const targetVector = vectorBetween(start, trial.target);
  const targetLength = vectorLength(targetVector);
  if (targetLength <= VECTOR_EPSILON) return { metric: "trajectory-deviation", value: null, unit: "css-pixels", valid: false };
  const squaredDistances = trial.trajectory.map((point) => {
    const pointVector = vectorBetween(start, point);
    const crossProduct = targetVector.x * pointVector.y - targetVector.y * pointVector.x;
    return (crossProduct / targetLength) ** 2;
  });
  return { metric: "trajectory-deviation", value: Math.sqrt(mean(squaredDistances)), unit: "css-pixels", valid: true };
}

/**
 * Counts adjacent, non-zero trajectory segments whose headings differ by at
 * least 10 degrees. This is a geometric turn count, not a neural measure.
 */
export function calculateCorrectionBehaviour(trial: TrialRecord): CorrectionBehaviourMeasurement {
  if (trial.outcome !== "completed" || !isCorrectedOriginTrial(trial)) return { metric: "correction-behaviour", correctionCount: null, peakVelocityElapsedMs: null, valid: false };
  const start = trial.actualStartPosition;
  if (!start) return { metric: "correction-behaviour", correctionCount: null, peakVelocityElapsedMs: null, valid: false };
  const points = [start, ...trial.trajectory];
  const segments = points.slice(1).map((point, index) => ({ vector: vectorBetween(points[index], point), elapsedMs: trial.trajectory[index]?.elapsedMs ?? null })).filter((segment) => vectorLength(segment.vector) > VECTOR_EPSILON);
  if (segments.length === 0) return { metric: "correction-behaviour", correctionCount: null, peakVelocityElapsedMs: null, valid: false };

  let correctionCount = 0;
  for (let index = 1; index < segments.length; index += 1) {
    if (Math.abs(normalizeSignedDegrees(screenAngle(segments[index].vector) - screenAngle(segments[index - 1].vector))) >= DIRECTION_CHANGE_THRESHOLD_DEGREES) correctionCount += 1;
  }
  return { metric: "correction-behaviour", correctionCount, peakVelocityElapsedMs: peakVelocityElapsedMs(trial), valid: true };
}

export function calculateTrialMeasurements(trial: TrialRecord): TrialMeasurements {
  return { reactionTime: calculateReactionTime(trial), movementTime: calculateMovementTime(trial), directionalError: calculateDirectionalError(trial), trajectoryDeviation: calculateTrajectoryDeviation(trial), correctionBehaviour: calculateCorrectionBehaviour(trial) };
}

export interface PhaseSummaryEligibility {
  /** Caller-level gate, used when a session contains multiple phase protocols. */
  readonly allowTiming?: boolean;
  /** Caller-level gate, used when a session contains multiple phase protocols. */
  readonly allowDirectional?: boolean;
}

/**
 * Summaries retain all trials in their count; only eligible measurements enter
 * means. Reaction and movement times require valid timestamps but not a
 * verified pointer origin, so homogeneous legacy phases keep them. Any mixed
 * measurement-protocol phase withholds both timing and origin-sensitive means
 * rather than pooling incompatible protocols.
 */
export function summarizePhaseMetrics(trials: readonly TrialRecord[], phase: TrialPhase, eligibility: PhaseSummaryEligibility = {}): PhaseMetricSummary {
  const phaseTrials = trials.filter((trial) => trial.phase === phase);
  const measurements = phaseTrials.map(calculateTrialMeasurements);
  const validity = measurementValidityForTrials(phaseTrials);
  const allowTiming = eligibility.allowTiming ?? allowsTimingMetrics(validity);
  const allowDirectional = eligibility.allowDirectional ?? allowsOriginSensitiveMetrics(validity);
  const reactionTimes = allowTiming ? validValues(measurements.map((measurement) => measurement.reactionTime)) : [];
  const movementTimes = allowTiming ? validValues(measurements.map((measurement) => measurement.movementTime)) : [];
  const directionalErrors = allowDirectional ? validValues(measurements.map((measurement) => measurement.directionalError)) : [];
  const validTrialCount = allowDirectional ? phaseTrials.filter((trial) => trial.outcome === "completed" && calculateDirectionalError(trial).valid).length : 0;
  return { phase, totalTrialCount: phaseTrials.length, validTrialCount, meanDirectionalErrorDegrees: meanOrNull(directionalErrors), meanReactionTimeMs: meanOrNull(reactionTimes), meanMovementTimeMs: meanOrNull(movementTimes) };
}

function firstMovementPoint(trial: TrialRecord): CursorTrajectoryPoint | null {
  if (!isCorrectedOriginTrial(trial)) return null;
  const start = trial.actualStartPosition;
  if (!start) return null;
  return trial.trajectory.find((point) => vectorLength(vectorBetween(start, point)) >= MOVEMENT_ONSET_DISTANCE_CSS_PIXELS) ?? null;
}

function peakVelocityElapsedMs(trial: TrialRecord): number | null {
  const points = [trial.startPosition, ...trial.trajectory];
  let peakVelocity = -Infinity;
  let peakElapsed: number | null = null;
  for (let index = 1; index < points.length; index += 1) {
    const elapsed = trial.trajectory[index - 1]?.elapsedMs;
    const previousElapsed = index === 1 ? 0 : trial.trajectory[index - 2]?.elapsedMs;
    if (elapsed === undefined || previousElapsed === undefined) continue;
    const duration = elapsed - previousElapsed;
    if (duration <= 0) continue;
    const velocity = vectorLength(vectorBetween(points[index - 1], points[index])) / duration;
    if (velocity > peakVelocity) { peakVelocity = velocity; peakElapsed = elapsed; }
  }
  return peakElapsed;
}

function invalidDirectionalError(): DirectionalErrorMeasurement {
  return { metric: "directional-error", value: null, unit: "degrees", valid: false, signConvention: "positive-clockwise" };
}

function vectorBetween(start: CursorCoordinate, end: CursorCoordinate): CursorCoordinate { return { x: end.x - start.x, y: end.y - start.y }; }
function vectorLength(vector: CursorCoordinate): number { return Math.hypot(vector.x, vector.y); }
function screenAngle(vector: CursorCoordinate): number { return (Math.atan2(vector.y, vector.x) * 180) / Math.PI; }
function normalizeSignedDegrees(degrees: number): number { return ((degrees + 180) % 360 + 360) % 360 - 180; }
function mean(values: readonly number[]): number { return values.reduce((total, value) => total + value, 0) / values.length; }
function meanOrNull(values: readonly number[]): number | null { return values.length > 0 ? mean(values) : null; }
function validValues(measurements: readonly { readonly value: number | null; readonly valid: boolean }[]): readonly number[] { return measurements.flatMap((measurement) => measurement.valid && measurement.value !== null ? [measurement.value] : []); }
