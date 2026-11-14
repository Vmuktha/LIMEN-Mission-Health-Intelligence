import { CURRENT_MEASUREMENT_PROTOCOL_VERSION, DEFAULT_ASSESSMENT_PROTOCOL, type AssessmentProtocol } from "./protocol";
import type { CursorCoordinate, CursorTrajectoryPoint, MeasurementProtocolVersion, RotationCondition, TargetDirection, TargetPosition, TrialOutcome, TrialPhase, TrialRecord } from "@/types/trial";

export interface PlannedTrial {
  readonly id: string;
  readonly sessionId: string;
  readonly index: number;
  readonly phase: TrialPhase;
  readonly rotationCondition: RotationCondition;
  readonly targetDirection: TargetDirection;
}

export interface ActiveTrial {
  readonly plan: PlannedTrial;
  readonly target: TargetPosition;
  readonly startPosition: CursorCoordinate;
  readonly designatedStartPosition: CursorCoordinate;
  /** Present only for trials whose origin was captured through positioning. */
  readonly actualStartPosition?: CursorCoordinate;
  /** Present only for trials whose origin was captured through positioning. */
  readonly positioningCompletedAt?: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion;
  readonly targetPresentedAt: string;
  readonly movementOnsetAt: string | null;
  readonly trajectory: readonly CursorTrajectoryPoint[];
  readonly displayedCursorTrajectory: readonly CursorTrajectoryPoint[];
}

export interface PositioningTrial {
  readonly plan: PlannedTrial;
  readonly designatedStartPosition: CursorCoordinate;
}

export type TrialEngineStatus = "ready" | "running" | "paused" | "aborted" | "completed";

export interface TrialEngineState {
  readonly sessionId: string;
  readonly protocol: AssessmentProtocol;
  readonly status: TrialEngineStatus;
  readonly plannedTrials: readonly PlannedTrial[];
  readonly nextTrialIndex: number;
  readonly activeTrial: ActiveTrial | null;
  readonly positioningTrial: PositioningTrial | null;
  readonly records: readonly TrialRecord[];
}

export type RandomSource = () => number;

/** Each block contains all four target directions exactly once, then is shuffled. */
export function createBalancedTargetSequence(trialCount: number, random: RandomSource = Math.random): readonly TargetDirection[] {
  const directions: TargetDirection[] = ["up", "right", "down", "left"];
  if (!Number.isInteger(trialCount) || trialCount <= 0 || trialCount % directions.length !== 0) {
    throw new Error("Trial count must be a positive multiple of four.");
  }

  const sequence: TargetDirection[] = [];
  for (let start = 0; start < trialCount; start += directions.length) {
    const block = [...directions];
    for (let index = block.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [block[index], block[swapIndex]] = [block[swapIndex], block[index]];
    }
    sequence.push(...block);
  }
  return sequence;
}

export function createPlannedTrials(sessionId: string, protocol: AssessmentProtocol = DEFAULT_ASSESSMENT_PROTOCOL, random: RandomSource = Math.random): readonly PlannedTrial[] {
  let index = 0;
  return protocol.phases.flatMap((phase) => createBalancedTargetSequence(phase.trialCount, random).map((targetDirection) => {
    const trial: PlannedTrial = { id: `${sessionId}-trial-${index + 1}`, sessionId, index, phase: phase.phase, rotationCondition: phase.rotationCondition, targetDirection };
    index += 1;
    return trial;
  }));
}

export function createTrialEngineState(sessionId: string, protocol: AssessmentProtocol = DEFAULT_ASSESSMENT_PROTOCOL, random: RandomSource = Math.random): TrialEngineState {
  return { sessionId, protocol, status: "ready", plannedTrials: createPlannedTrials(sessionId, protocol, random), nextTrialIndex: 0, activeTrial: null, positioningTrial: null, records: [] };
}

export function startAssessment(state: TrialEngineState): TrialEngineState {
  if (state.status !== "ready") throw new Error("Only a ready assessment can be started.");
  return { ...state, status: "running" };
}

/**
 * Legacy-compatible entry point. It does not perform the positioning procedure,
 * so it must never claim a verified actual pointer origin.
 */
export function beginNextTrial(state: TrialEngineState, center: CursorCoordinate, targetRadius: number, targetPresentedAt: string): TrialEngineState {
  if (state.status !== "running" || state.activeTrial) throw new Error("A new trial requires a running assessment with no active trial.");
  const plan = state.plannedTrials[state.nextTrialIndex];
  if (!plan) return { ...state, status: "completed" };
  if (!Number.isFinite(targetRadius) || targetRadius <= 0) throw new Error("Target radius must be positive and finite.");
  return { ...state, activeTrial: { plan, target: targetForDirection(center, targetRadius, plan.targetDirection), startPosition: center, designatedStartPosition: center, measurementProtocolVersion: "0.1.0-legacy-origin-unverified", targetPresentedAt, movementOnsetAt: null, trajectory: [], displayedCursorTrajectory: [] } };
}

/** Starts the v0.3.0 pre-target positioning stage; target timing has not begun. */
export function beginTrialPositioning(state: TrialEngineState, designatedStartPosition: CursorCoordinate): TrialEngineState {
  if (state.status !== "running" || state.activeTrial || state.positioningTrial) throw new Error("Positioning requires a running assessment with no active or positioning trial.");
  const plan = state.plannedTrials[state.nextTrialIndex];
  if (!plan) return { ...state, status: "completed" };
  return { ...state, positioningTrial: { plan, designatedStartPosition } };
}

/** Creates a target only after an observed physical pointer origin has been captured. */
export function presentTargetAfterPositioning(state: TrialEngineState, actualStartPosition: CursorCoordinate, targetRadius: number, targetPresentedAt: string, positioningCompletedAt: string): TrialEngineState {
  if (state.status !== "running" || state.activeTrial || !state.positioningTrial) throw new Error("A completed positioning stage is required before presenting a target.");
  if (!Number.isFinite(targetRadius) || targetRadius <= 0) throw new Error("Target radius must be positive and finite.");
  if (![actualStartPosition.x, actualStartPosition.y].every(Number.isFinite)) throw new Error("Actual start position must be finite.");
  const positioning = state.positioningTrial;
  return { ...state, positioningTrial: null, activeTrial: { plan: positioning.plan, target: targetForDirection(actualStartPosition, targetRadius, positioning.plan.targetDirection), startPosition: actualStartPosition, designatedStartPosition: positioning.designatedStartPosition, actualStartPosition, positioningCompletedAt, measurementProtocolVersion: CURRENT_MEASUREMENT_PROTOCOL_VERSION, targetPresentedAt, movementOnsetAt: null, trajectory: [], displayedCursorTrajectory: [] } };
}

export function appendTrajectoryPoint(state: TrialEngineState, point: CursorTrajectoryPoint): TrialEngineState {
  const activeTrial = requireActiveTrial(state);
  const priorPoint = activeTrial.trajectory.at(-1);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.elapsedMs) || point.elapsedMs < 0 || (priorPoint && point.elapsedMs < priorPoint.elapsedMs)) {
    throw new Error("Trajectory points must be finite and have nondecreasing elapsed time.");
  }
  return { ...state, activeTrial: { ...activeTrial, trajectory: [...activeTrial.trajectory, point] } };
}

/** Records only the transformed visual-feedback path; it never replaces raw pointer data. */
export function appendDisplayedCursorTrajectoryPoint(state: TrialEngineState, point: CursorTrajectoryPoint): TrialEngineState {
  const activeTrial = requireActiveTrial(state);
  const priorPoint = activeTrial.displayedCursorTrajectory.at(-1);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.elapsedMs) || point.elapsedMs < 0 || (priorPoint && point.elapsedMs < priorPoint.elapsedMs)) {
    throw new Error("Displayed cursor points must be finite and have nondecreasing elapsed time.");
  }
  return { ...state, activeTrial: { ...activeTrial, displayedCursorTrajectory: [...activeTrial.displayedCursorTrajectory, point] } };
}

export function markMovementOnset(state: TrialEngineState, movementOnsetAt: string): TrialEngineState {
  const activeTrial = requireActiveTrial(state);
  if (activeTrial.movementOnsetAt) return state;
  if (!isOnOrAfter(movementOnsetAt, activeTrial.targetPresentedAt)) throw new Error("Movement onset cannot precede target presentation.");
  return { ...state, activeTrial: { ...activeTrial, movementOnsetAt } };
}

export function completeActiveTrial(state: TrialEngineState, movementCompletedAt: string): TrialEngineState {
  const activeTrial = requireActiveTrial(state);
  const validCompletion = activeTrial.movementOnsetAt !== null && isOnOrAfter(movementCompletedAt, activeTrial.movementOnsetAt);
  return finalizeActiveTrial(state, validCompletion ? "completed" : "invalid", validCompletion ? movementCompletedAt : null, validCompletion ? undefined : "Movement onset or completion timestamp is missing or invalid.");
}

export function markActiveTrialMissed(state: TrialEngineState, reason = "Target was not completed before the trial timeout."): TrialEngineState {
  requireActiveTrial(state);
  return finalizeActiveTrial(state, "timed-out", null, reason);
}

/** A cancelled or malformed browser interaction remains an explicit invalid trial. */
export function invalidateActiveTrial(state: TrialEngineState, reason = "Pointer interaction was cancelled or invalid."): TrialEngineState {
  requireActiveTrial(state);
  return finalizeActiveTrial(state, "invalid", null, reason);
}

const PAUSE_INVALIDATION_REASON = "Assessment paused during an active trial; the trial was invalidated so paused time cannot enter reaction time, movement time, or the trial timeout.";

/**
 * Pausing during an active trial invalidates that trial and advances the plan;
 * paused intervals therefore never occur inside a recorded reaction/movement
 * interval. Pausing during positioning discards the unrecorded positioning
 * attempt. Raw event timestamps already recorded are preserved unchanged.
 */
export function pauseAssessment(state: TrialEngineState): TrialEngineState {
  if (state.status !== "running") throw new Error("Only a running assessment can be paused.");
  if (!state.activeTrial) return { ...state, status: "paused", positioningTrial: null };
  const record = buildRecord(state.activeTrial, "invalid", null, PAUSE_INVALIDATION_REASON);
  const nextTrialIndex = state.nextTrialIndex + 1;
  return {
    ...state,
    status: nextTrialIndex >= state.plannedTrials.length ? "completed" : "paused",
    activeTrial: null,
    positioningTrial: null,
    nextTrialIndex,
    records: [...state.records, record],
  };
}

export function resumeAssessment(state: TrialEngineState): TrialEngineState {
  if (state.status !== "paused") throw new Error("Only a paused assessment can be resumed.");
  return { ...state, status: "running" };
}

export function abortAssessment(state: TrialEngineState, reason = "Assessment aborted by participant or operator."): TrialEngineState {
  if (state.status === "completed" || state.status === "aborted") return state;
  if (!state.activeTrial) return { ...state, status: "aborted", positioningTrial: null };
  const record = buildRecord(state.activeTrial, "aborted", null, reason);
  return { ...state, status: "aborted", activeTrial: null, positioningTrial: null, nextTrialIndex: state.nextTrialIndex + 1, records: [...state.records, record] };
}

function finalizeActiveTrial(state: TrialEngineState, outcome: TrialOutcome, movementCompletedAt: string | null, invalidReason?: string): TrialEngineState {
  const activeTrial = requireActiveTrial(state);
  const records = [...state.records, buildRecord(activeTrial, outcome, movementCompletedAt, invalidReason)];
  const nextTrialIndex = state.nextTrialIndex + 1;
  return { ...state, activeTrial: null, positioningTrial: null, nextTrialIndex, records, status: nextTrialIndex === state.plannedTrials.length ? "completed" : "running" };
}

function buildRecord(activeTrial: ActiveTrial, outcome: TrialOutcome, movementCompletedAt: string | null, invalidReason?: string): TrialRecord {
  return {
    id: activeTrial.plan.id,
    sessionId: activeTrial.plan.sessionId,
    index: activeTrial.plan.index,
    phase: activeTrial.plan.phase,
    rotationCondition: activeTrial.plan.rotationCondition,
    target: activeTrial.target,
    startPosition: activeTrial.startPosition,
    designatedStartPosition: activeTrial.designatedStartPosition,
    ...(activeTrial.actualStartPosition ? { actualStartPosition: activeTrial.actualStartPosition } : {}),
    ...(activeTrial.positioningCompletedAt ? { positioningCompletedAt: activeTrial.positioningCompletedAt } : {}),
    measurementProtocolVersion: activeTrial.measurementProtocolVersion,
    targetPresentedAt: activeTrial.targetPresentedAt,
    movementOnsetAt: activeTrial.movementOnsetAt,
    movementCompletedAt,
    trajectory: activeTrial.trajectory,
    displayedCursorTrajectory: activeTrial.displayedCursorTrajectory,
    outcome,
    ...(invalidReason ? { invalidReason } : {}),
  };
}

function targetForDirection(center: CursorCoordinate, radius: number, direction: TargetDirection): TargetPosition {
  const offsets: Record<TargetDirection, CursorCoordinate> = { up: { x: 0, y: -radius }, right: { x: radius, y: 0 }, down: { x: 0, y: radius }, left: { x: -radius, y: 0 } };
  return { direction, x: center.x + offsets[direction].x, y: center.y + offsets[direction].y };
}

function requireActiveTrial(state: TrialEngineState): ActiveTrial {
  if (state.status !== "running" || !state.activeTrial) throw new Error("An active trial is required while the assessment is running.");
  return state.activeTrial;
}

function isOnOrAfter(laterTimestamp: string, earlierTimestamp: string): boolean {
  const later = Date.parse(laterTimestamp);
  const earlier = Date.parse(earlierTimestamp);
  return Number.isFinite(later) && Number.isFinite(earlier) && later >= earlier;
}
