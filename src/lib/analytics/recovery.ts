import { calculateAdaptationSummary } from "@/lib/analytics/adaptation";
import { calculateWashoutAftereffect } from "@/lib/analytics/aftereffects";
import { calculateTrialMeasurements } from "@/lib/assessment/metrics";
import {
  allowsOriginSensitiveMetrics,
  allowsTimingMetrics,
  measurementProtocolVersionsForTrials,
  measurementValidityForSession,
  type MeasurementValidity,
  type TrialMeasurementProtocolKey,
} from "@/lib/assessment/measurement-validity";
import { listAssessmentSessions } from "@/lib/storage/assessment-storage";
import { validateCheckIn } from "@/lib/storage/checkin-validation";
import { listCheckIns } from "@/lib/storage/checkin-storage";
import { success, type StorageAdapter, type StorageResult } from "@/lib/storage/database";
import type { AssessmentCondition, AssessmentSession, InputDevice } from "@/types/assessment";
import type { SymptomCheckInRecord } from "@/types/checkin";
import type {
  CheckInAssociation,
  CheckInLinkState,
  RecoveryCheckInObservation,
  RecoveryCheckInScores,
  RecoveryDataIssue,
  RecoveryDataQuality,
  RecoveryDataset,
  RecoveryExcludedSession,
  RecoveryMetric,
  RecoveryMetricUnavailability,
  RecoveryMetricValue,
  RecoveryObservation,
  RecoveryParticipantDataset,
  RecoveryRejectedRecord,
} from "@/types/recovery";
import type {
  CursorCoordinate,
  CursorTrajectoryPoint,
  MeasurementProtocolVersion,
  RotationCondition,
  TargetDirection,
  TrialOutcome,
  TrialPhase,
  TrialRecord,
} from "@/types/trial";

export const RECOVERY_METRICS: readonly RecoveryMetric[] = [
  "reaction-time-mean",
  "movement-time-mean",
  "directional-error-mean",
  "trajectory-deviation-mean",
  "correction-count-mean",
  "peak-velocity-time-mean",
  "adaptation-change",
  "washout-aftereffect",
];

export const WASHOUT_WINDOW = 4;

const METRIC_UNITS: Readonly<Record<RecoveryMetric, RecoveryMetricValue["unit"]>> = {
  "reaction-time-mean": "milliseconds",
  "movement-time-mean": "milliseconds",
  "directional-error-mean": "degrees",
  "trajectory-deviation-mean": "css-pixels",
  "correction-count-mean": "count",
  "peak-velocity-time-mean": "milliseconds",
  "adaptation-change": "degrees",
  "washout-aftereffect": "degrees",
};

const TRIAL_PHASES: readonly TrialPhase[] = ["baseline", "early-adaptation", "late-adaptation", "de-adaptation"];
const ROTATION_CONDITIONS: readonly RotationCondition[] = ["none", "clockwise-45-degrees"];
const TRIAL_OUTCOMES: readonly TrialOutcome[] = ["completed", "aborted", "invalid", "timed-out"];
const TARGET_DIRECTIONS: readonly TargetDirection[] = ["up", "right", "down", "left"];
const INPUT_DEVICES: readonly InputDevice[] = ["mouse", "trackpad", "unknown"];
const ASSESSMENT_CONDITIONS: readonly AssessmentCondition[] = ["normal-feedback", "clockwise-45-degree-feedback-rotation"];

export interface RecoveryDatasetInput {
  readonly sessions: readonly unknown[];
  readonly checkIns: readonly unknown[];
}

interface SessionInfo {
  readonly sessionId: string;
  readonly participantId: string;
  readonly status: string;
  readonly completedAt: string | null;
}

interface ParsedTrial {
  readonly trial: TrialRecord | null;
  readonly issues: readonly RecoveryDataIssue[];
  readonly nonFinite: boolean;
  readonly originUnavailable: boolean;
  readonly sessionIdMismatch: boolean;
}

type ParsedSession =
  | { readonly kind: "observation"; readonly observation: RecoveryObservation; readonly sessionInfo: SessionInfo }
  | { readonly kind: "excluded"; readonly excluded: RecoveryExcludedSession; readonly sessionInfo: SessionInfo }
  | { readonly kind: "rejected"; readonly rejected: RecoveryRejectedRecord };

type ParsedCheckIn =
  | { readonly kind: "valid"; readonly record: SymptomCheckInRecord }
  | { readonly kind: "rejected"; readonly rejected: RecoveryRejectedRecord };

/**
 * Builds the pure recovery dataset from stored records. Stored sessions and
 * check-ins are never mutated. Metrics are recomputed from raw trials, and only
 * explicit session identifiers associate a check-in with an assessment.
 */
export function buildRecoveryDataset(input: RecoveryDatasetInput): RecoveryDataset {
  const observations: RecoveryObservation[] = [];
  const excludedSessions: RecoveryExcludedSession[] = [];
  const rejectedRecords: RecoveryRejectedRecord[] = [];
  const sessionInfoById = new Map<string, SessionInfo>();

  for (const rawSession of input.sessions) {
    const parsed = parseSessionRecord(rawSession);
    if (parsed.kind === "observation") {
      observations.push(parsed.observation);
      sessionInfoById.set(parsed.sessionInfo.sessionId, parsed.sessionInfo);
    } else if (parsed.kind === "excluded") {
      excludedSessions.push(parsed.excluded);
      if (!sessionInfoById.has(parsed.sessionInfo.sessionId)) sessionInfoById.set(parsed.sessionInfo.sessionId, parsed.sessionInfo);
    } else {
      rejectedRecords.push(parsed.rejected);
    }
  }

  const validCheckIns: SymptomCheckInRecord[] = [];
  for (const rawCheckIn of input.checkIns) {
    const parsed = parseCheckInRecord(rawCheckIn);
    if (parsed.kind === "valid") validCheckIns.push(parsed.record);
    else rejectedRecords.push(parsed.rejected);
  }

  observations.sort(compareObservations);
  validCheckIns.sort(compareCheckIns);

  const observationByKey = new Map<string, RecoveryObservation>();
  for (const observation of observations) observationByKey.set(observationKey(observation.participantId, observation.sessionId), observation);

  const checkInObservations = validCheckIns.map((record) => associateCheckIn(record, observationByKey, sessionInfoById));
  const associationsByObservation = new Map<string, CheckInAssociation[]>();
  for (const checkIn of checkInObservations) {
    if (!checkIn.association || !checkIn.assessmentSessionId) continue;
    const key = observationKey(checkIn.participantId, checkIn.assessmentSessionId);
    const existing = associationsByObservation.get(key) ?? [];
    existing.push(checkIn.association);
    associationsByObservation.set(key, existing);
  }

  const finalizedObservations = observations.map((observation) => ({
    ...observation,
    checkIns: [...(associationsByObservation.get(observationKey(observation.participantId, observation.sessionId)) ?? [])].sort(compareCheckInAssociations),
  }));

  const participantIds = [...new Set([...finalizedObservations.map((observation) => observation.participantId), ...checkInObservations.map((checkIn) => checkIn.participantId)])];
  const participants: RecoveryParticipantDataset[] = participantIds
    .map((participantId) => {
      const participantObservations = finalizedObservations.filter((observation) => observation.participantId === participantId).sort(compareObservations);
      const participantCheckIns = checkInObservations.filter((checkIn) => checkIn.participantId === participantId).sort(compareCheckInObservations);
      return {
        participantId,
        profileKind: "browser-local-participant-profile" as const,
        observations: participantObservations,
        checkIns: participantCheckIns,
        unassociatedCheckIns: participantCheckIns.filter((checkIn) => checkIn.association === null),
      };
    })
    .sort(compareParticipants);

  return {
    profileKind: "browser-local-participant-profile",
    participants,
    rejectedRecords,
    excludedSessions: excludedSessions.sort(compareExcludedSessions),
    loadedSessionCount: input.sessions.length,
    loadedCheckInCount: input.checkIns.length,
    interpretation: "descriptive-only-not-clinical-recovery",
  };
}

/** Loads stored browser records through the existing storage APIs. */
export async function loadRecoveryDataset(adapter?: StorageAdapter): Promise<StorageResult<RecoveryDataset>> {
  const sessions = await listAssessmentSessions(adapter);
  if (!sessions.ok) return sessions;
  const checkIns = await listCheckIns(adapter);
  if (!checkIns.ok) return checkIns;
  return success(buildRecoveryDataset({ sessions: sessions.value, checkIns: checkIns.value }));
}

export function findRecoveryMetric(observation: RecoveryObservation, metric: RecoveryMetric): RecoveryMetricValue | null {
  return observation.metrics.find((value) => value.metric === metric) ?? null;
}

export function recoveryMetricUnit(metric: RecoveryMetric): RecoveryMetricValue["unit"] {
  return METRIC_UNITS[metric];
}

export function findRecoveryObservation(dataset: RecoveryDataset, participantId: string, sessionId: string): RecoveryObservation | null {
  return dataset.participants.find((participant) => participant.participantId === participantId)?.observations.find((observation) => observation.sessionId === sessionId) ?? null;
}

function parseSessionRecord(raw: unknown): ParsedSession {
  if (!isRecord(raw)) return rejectedSession("Assessment session record is not an object.", null);
  const metadata = isRecord(raw.metadata) ? raw.metadata : null;
  const sessionId = metadata && isNonEmptyString(metadata.sessionId) ? metadata.sessionId : null;
  const participantId = metadata && isNonEmptyString(metadata.participantId) ? metadata.participantId : null;
  if (!metadata || !sessionId || !participantId) return rejectedSession("Assessment session metadata requires a non-empty session ID and participant ID.", sessionId ?? recordIdentifier(raw));

  const status = typeof raw.status === "string" ? raw.status : "unknown";
  const completedAt = typeof metadata.completedAt === "string" ? metadata.completedAt : null;
  if (status !== "completed") {
    return {
      kind: "excluded",
      sessionInfo: { sessionId, participantId, status, completedAt },
      excluded: { sessionId, participantId, status, completedAt, reason: "not-completed", explanation: "Only completed assessment sessions enter recovery observations." },
    };
  }
  if (completedAt === null) {
    return {
      kind: "excluded",
      sessionInfo: { sessionId, participantId, status, completedAt: null },
      excluded: { sessionId, participantId, status, completedAt: null, reason: "missing-completion-timestamp", explanation: "The completed session has no completion timestamp and cannot be ordered chronologically." },
    };
  }
  if (!isFiniteTimestamp(completedAt)) {
    return {
      kind: "excluded",
      sessionInfo: { sessionId, participantId, status, completedAt },
      excluded: { sessionId, participantId, status, completedAt, reason: "invalid-completion-timestamp", explanation: "The session completion timestamp is not a finite date and cannot be ordered chronologically." },
    };
  }
  if (!isFiniteTimestamp(metadata.createdAt)) return rejectedSession("The assessment session creation timestamp is missing or not a finite date.", sessionId);
  if (metadata.provenance !== "browser-user-generated" || metadata.simulated !== false) return rejectedSession("Only real browser-generated assessment sessions enter recovery observations.", sessionId);
  if (!Array.isArray(raw.trials)) return rejectedSession("The assessment session trial collection is malformed.", sessionId);

  const issues: RecoveryDataIssue[] = [];
  const inputDevice: InputDevice = INPUT_DEVICES.includes(metadata.inputDevice as InputDevice) ? metadata.inputDevice as InputDevice : "unknown";
  if (inputDevice === "unknown" && metadata.inputDevice !== "unknown") issues.push(issue("invalid-session-record", "warning", "The stored input device is unrecognized and has been retained as unknown."));
  const protocolVersion = typeof metadata.protocolVersion === "string" ? metadata.protocolVersion : "";
  const conditions: readonly AssessmentCondition[] = Array.isArray(raw.conditions) ? raw.conditions.filter((condition): condition is AssessmentCondition => ASSESSMENT_CONDITIONS.includes(condition as AssessmentCondition)) : [];

  const rawTrials = raw.trials as readonly unknown[];
  const objectTrials = rawTrials.filter(isRecord) as unknown as readonly TrialRecord[];
  const nonObjectTrialCount = rawTrials.length - objectTrials.length;
  const parsedTrials = rawTrials.map((trial) => parseTrialRecord(trial, sessionId));
  const usableTrials = parsedTrials.flatMap((parsed) => parsed.trial ? [parsed.trial] : []);
  for (const parsed of parsedTrials) issues.push(...parsed.issues);
  if (nonObjectTrialCount > 0) issues.push(issue("malformed-trial", "error", `${nonObjectTrialCount} stored trial record(s) were not objects and were withheld from all metric calculations.`));

  const sessionForValidity: AssessmentSession = {
    metadata: { sessionId, participantId, createdAt: metadata.createdAt, completedAt, inputDevice, protocolVersion, provenance: "browser-user-generated", simulated: false },
    status: "completed",
    conditions,
    trials: objectTrials,
    phaseSummaries: [],
    adaptationSummary: null,
    baselineComparisons: [],
    neuralActivityMeasured: false,
    clinicalDiagnosticStatus: "not-a-clinical-diagnosis",
  };
  let measurementValidity: MeasurementValidity = nonObjectTrialCount > 0 ? "unknown-protocol" : measurementValidityForSession(sessionForValidity);
  if (measurementValidity === "corrected-actual-origin" && parsedTrials.some((parsed) => parsed.originUnavailable)) measurementValidity = "inconsistent-origin-provenance";
  const validityIssue = issueForValidity(measurementValidity);
  if (validityIssue) issues.push(validityIssue);

  const measurementVersionSet = new Set<TrialMeasurementProtocolKey>(measurementProtocolVersionsForTrials(objectTrials));
  if (nonObjectTrialCount > 0) measurementVersionSet.add("unknown");
  const measurementVersions = [...measurementVersionSet];
  const onlyVersion = measurementVersions.length === 1 ? measurementVersions[0] : null;
  const measurementProtocolVersion: MeasurementProtocolVersion | null = onlyVersion && onlyVersion !== "unknown" ? onlyVersion : null;

  const metrics = buildMetricValues(usableTrials, measurementValidity, measurementProtocolVersion, measurementVersions, rawTrials.length);
  const timingMetricsEligible = allowsTimingMetrics(measurementValidity);
  const originSensitiveMetricsEligible = allowsOriginSensitiveMetrics(measurementValidity);
  const unavailableMetrics: readonly RecoveryMetricUnavailability[] = metrics.filter((metric) => !metric.eligible).map((metric) => ({ metric: metric.metric, reason: metric.explanation ?? "Unavailable." }));
  const dataQuality = buildDataQuality(rawTrials, parsedTrials, issues, metrics, nonObjectTrialCount);

  return {
    kind: "observation",
    sessionInfo: { sessionId, participantId, status, completedAt },
    observation: {
      sessionId,
      participantId,
      createdAt: metadata.createdAt,
      completedAt,
      status: "completed",
      assessmentProtocolVersion: protocolVersion,
      measurementProtocolVersion,
      measurementVersions,
      inputDevice,
      conditions,
      measurementValidity,
      eligibility: {
        measurementValidity,
        timingMetricsEligible,
        originSensitiveMetricsEligible,
        eligibleMetrics: metrics.filter((metric) => metric.eligible).map((metric) => metric.metric),
        unavailableMetrics,
      },
      dataQuality,
      metrics,
      checkIns: [],
      provenance: "browser-user-generated",
      simulated: false,
      interpretation: "descriptive-only-not-clinical-recovery",
    },
  };
}

function parseTrialRecord(raw: unknown, parentSessionId: string): ParsedTrial {
  if (!isRecord(raw)) return malformedTrial("A stored trial record is not an object.", null);
  const trialId = isNonEmptyString(raw.id) ? raw.id : null;
  if (!trialId) return malformedTrial("A stored trial record has no usable identifier.", null);

  const sessionIdMismatch = !isNonEmptyString(raw.sessionId) || raw.sessionId !== parentSessionId;
  if (sessionIdMismatch) return { trial: null, issues: [issue("trial-session-id-mismatch", "error", "The trial session ID does not match its parent assessment session.", trialId)], nonFinite: false, originUnavailable: false, sessionIdMismatch: true };

  if (!Number.isInteger(raw.index) || (raw.index as number) < 0) return malformedTrial("The trial index is missing or not a non-negative integer.", trialId);
  if (!TRIAL_PHASES.includes(raw.phase as TrialPhase)) return malformedTrial("The trial phase is unrecognized.", trialId);
  if (!ROTATION_CONDITIONS.includes(raw.rotationCondition as RotationCondition)) return malformedTrial("The trial rotation condition is unrecognized.", trialId);
  if (!TRIAL_OUTCOMES.includes(raw.outcome as TrialOutcome)) return malformedTrial("The trial outcome is unrecognized.", trialId);
  if (!isRecord(raw.target) || !TARGET_DIRECTIONS.includes(raw.target.direction as TargetDirection)) return malformedTrial("The trial target is malformed.", trialId);
  if (typeof raw.target.x !== "number" || typeof raw.target.y !== "number") return malformedTrial("The trial target coordinates are not numeric.", trialId);
  if (!isRecord(raw.startPosition) || typeof raw.startPosition.x !== "number" || typeof raw.startPosition.y !== "number") return malformedTrial("The trial start position is malformed.", trialId);

  const issues: RecoveryDataIssue[] = [];
  let nonFinite = false;
  let originUnavailable = false;

  const noteNonFinite = (message: string): void => {
    nonFinite = true;
    issues.push(issue("non-finite-value", "error", message, trialId));
  };

  if (!Number.isFinite(raw.target.x) || !Number.isFinite(raw.target.y)) {
    noteNonFinite("The trial target contains a non-finite coordinate; origin-sensitive measurements are unavailable for this trial.");
    originUnavailable = true;
  }
  if (!Number.isFinite(raw.startPosition.x) || !Number.isFinite(raw.startPosition.y)) {
    noteNonFinite("The trial start position contains a non-finite coordinate; origin-sensitive measurements are unavailable for this trial.");
    originUnavailable = true;
  }

  let actualStartPosition: CursorCoordinate | undefined;
  if (raw.actualStartPosition !== undefined) {
    if (!isFiniteCoordinate(raw.actualStartPosition)) {
      noteNonFinite("The captured actual pointer origin is missing or non-finite; this trial cannot contribute origin-sensitive measurements.");
      originUnavailable = true;
    } else {
      actualStartPosition = { x: raw.actualStartPosition.x, y: raw.actualStartPosition.y };
    }
  }

  let positioningCompletedAt: string | undefined;
  if (raw.positioningCompletedAt !== undefined) {
    if (!isFiniteTimestamp(raw.positioningCompletedAt)) {
      nonFinite = true;
      issues.push(issue("non-finite-timestamp", "error", "The positioning completion timestamp is missing or not a finite date.", trialId));
      originUnavailable = true;
    } else {
      positioningCompletedAt = raw.positioningCompletedAt;
    }
  }

  let measurementProtocolVersion: MeasurementProtocolVersion | undefined;
  if (raw.measurementProtocolVersion !== undefined) {
    if (typeof raw.measurementProtocolVersion === "string") measurementProtocolVersion = raw.measurementProtocolVersion as MeasurementProtocolVersion;
    else issues.push(issue("unknown-measurement-protocol", "warning", "The trial measurement protocol label is malformed and is treated as unknown.", trialId));
  }

  let targetPresentedAt = "";
  if (isFiniteTimestamp(raw.targetPresentedAt)) targetPresentedAt = raw.targetPresentedAt;
  else {
    nonFinite = true;
    issues.push(issue("non-finite-timestamp", "error", "The target presentation timestamp is missing or not a finite date.", trialId));
  }

  const movementOnsetAt = optionalFiniteTimestamp(raw.movementOnsetAt, "movement onset", trialId, issues);
  const movementCompletedAt = optionalFiniteTimestamp(raw.movementCompletedAt, "movement completion", trialId, issues);
  if ((raw.movementOnsetAt !== null && raw.movementOnsetAt !== undefined && movementOnsetAt === null) || (raw.movementCompletedAt !== null && raw.movementCompletedAt !== undefined && movementCompletedAt === null)) nonFinite = true;

  let trajectory: readonly CursorTrajectoryPoint[] = [];
  if (!Array.isArray(raw.trajectory)) {
    issues.push(issue("malformed-trial", "error", "The trial trajectory is not an array; origin-sensitive measurements are unavailable for this trial.", trialId));
    originUnavailable = true;
  } else if (!raw.trajectory.every(isFiniteTrajectoryPoint)) {
    noteNonFinite("The trial trajectory contains a non-finite or negative sample; the telemetry is withheld rather than partially interpreted.");
    originUnavailable = true;
  } else {
    trajectory = raw.trajectory.map((point) => ({ x: point.x, y: point.y, elapsedMs: point.elapsedMs }));
  }

  let displayedCursorTrajectory: readonly CursorTrajectoryPoint[] | undefined;
  if (raw.displayedCursorTrajectory !== undefined) {
    if (Array.isArray(raw.displayedCursorTrajectory) && raw.displayedCursorTrajectory.every(isFiniteTrajectoryPoint)) {
      displayedCursorTrajectory = raw.displayedCursorTrajectory.map((point) => ({ x: point.x, y: point.y, elapsedMs: point.elapsedMs }));
    } else {
      issues.push(issue("non-finite-value", "warning", "The displayed-cursor trajectory contains a non-finite sample and was withheld for this trial.", trialId));
      displayedCursorTrajectory = [];
    }
  }

  const trial: TrialRecord = {
    id: trialId,
    sessionId: parentSessionId,
    index: raw.index as number,
    phase: raw.phase as TrialPhase,
    rotationCondition: raw.rotationCondition as RotationCondition,
    target: { direction: raw.target.direction as TargetDirection, x: raw.target.x, y: raw.target.y },
    startPosition: { x: raw.startPosition.x, y: raw.startPosition.y },
    ...(actualStartPosition && !originUnavailable ? { actualStartPosition } : {}),
    ...(positioningCompletedAt && !originUnavailable ? { positioningCompletedAt } : {}),
    ...(measurementProtocolVersion ? { measurementProtocolVersion } : {}),
    targetPresentedAt,
    movementOnsetAt,
    movementCompletedAt,
    trajectory,
    ...(displayedCursorTrajectory !== undefined ? { displayedCursorTrajectory } : {}),
    outcome: raw.outcome as TrialOutcome,
  };

  return { trial, issues, nonFinite, originUnavailable, sessionIdMismatch: false };
}

function buildMetricValues(
  trials: readonly TrialRecord[],
  validity: MeasurementValidity,
  measurementProtocolVersion: MeasurementProtocolVersion | null,
  measurementVersions: readonly TrialMeasurementProtocolKey[],
  totalTrialCount: number,
): readonly RecoveryMetricValue[] {
  const timingEligible = allowsTimingMetrics(validity);
  const originEligible = allowsOriginSensitiveMetrics(validity);
  const measurements = trials.map((trial) => {
    try {
      return calculateTrialMeasurements(trial);
    } catch {
      return null;
    }
  });
  const directionalErrorValues = validValues(measurements.flatMap((measurement) => measurement ? [measurement.directionalError] : []));
  const reactionTimeValues = validValues(measurements.flatMap((measurement) => measurement ? [measurement.reactionTime] : []));
  const movementTimeValues = validValues(measurements.flatMap((measurement) => measurement ? [measurement.movementTime] : []));
  const trajectoryDeviationValues = validValues(measurements.flatMap((measurement) => measurement ? [measurement.trajectoryDeviation] : []));
  const correctionCounts = measurements.flatMap((measurement) => measurement && measurement.correctionBehaviour.valid && measurement.correctionBehaviour.correctionCount !== null && Number.isFinite(measurement.correctionBehaviour.correctionCount) ? [measurement.correctionBehaviour.correctionCount] : []);
  const peakVelocityTimes = measurements.flatMap((measurement) => measurement && measurement.correctionBehaviour.valid && measurement.correctionBehaviour.peakVelocityElapsedMs !== null && Number.isFinite(measurement.correctionBehaviour.peakVelocityElapsedMs) ? [measurement.correctionBehaviour.peakVelocityElapsedMs] : []);
  const adaptation = safeAdaptation(trials);
  const aftereffect = safeAftereffect(trials);
  const adaptationEligibleCount = trials.reduce((count, trial, index) => (trial.phase === "early-adaptation" || trial.phase === "late-adaptation") && isValidMeasurement(measurements[index]?.directionalError) ? count + 1 : count, 0);
  const orderedWashout = trials.filter((trial) => trial.phase === "de-adaptation").sort((left, right) => left.index - right.index).slice(0, WASHOUT_WINDOW);
  const washoutTrialIds = new Set(orderedWashout.map((trial) => trial.id));
  const washoutEligibleCount = trials.reduce((count, trial, index) => (trial.phase === "baseline" || washoutTrialIds.has(trial.id)) && isValidMeasurement(measurements[index]?.directionalError) ? count + 1 : count, 0);

  const timingUnavailable = `Timing metrics require one homogeneous known measurement protocol; the session validity is ${validity}.`;
  const originUnavailable = `Origin-sensitive metrics require verified actual-pointer origins and one homogeneous corrected measurement protocol; the session validity is ${validity}.`;

  return [
    metricValue({ metric: "reaction-time-mean", value: meanOrNull(reactionTimeValues), allowed: timingEligible, eligibleTrialCount: reactionTimeValues.length, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: timingEligible ? "No completed trial had a finite reaction-time interval." : timingUnavailable }),
    metricValue({ metric: "movement-time-mean", value: meanOrNull(movementTimeValues), allowed: timingEligible, eligibleTrialCount: movementTimeValues.length, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: timingEligible ? "No completed trial had a finite positive movement-time interval." : timingUnavailable }),
    metricValue({ metric: "directional-error-mean", value: meanOrNull(directionalErrorValues), allowed: originEligible, eligibleTrialCount: directionalErrorValues.length, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: originEligible ? "No completed origin-verified trial had a qualifying first movement sample." : originUnavailable, signConvention: originEligible ? "positive-clockwise" : undefined }),
    metricValue({ metric: "trajectory-deviation-mean", value: meanOrNull(trajectoryDeviationValues), allowed: originEligible, eligibleTrialCount: trajectoryDeviationValues.length, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: originEligible ? "No completed origin-verified trial had usable trajectory samples." : originUnavailable }),
    metricValue({ metric: "correction-count-mean", value: meanOrNull(correctionCounts), allowed: originEligible, eligibleTrialCount: correctionCounts.length, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: originEligible ? "No completed origin-verified trial had non-zero path segments." : originUnavailable }),
    metricValue({ metric: "peak-velocity-time-mean", value: meanOrNull(peakVelocityTimes), allowed: originEligible, eligibleTrialCount: peakVelocityTimes.length, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: originEligible ? "No completed origin-verified trial had a positive segment velocity." : originUnavailable }),
    metricValue({ metric: "adaptation-change", value: originEligible ? adaptation.directionalErrorChangeDegrees : null, allowed: originEligible, eligibleTrialCount: adaptationEligibleCount, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: originEligible ? "Adaptation change requires eligible directional errors in both early- and late-adaptation phases." : originUnavailable, signConvention: originEligible ? "positive-clockwise" : undefined }),
    metricValue({ metric: "washout-aftereffect", value: originEligible && aftereffect ? aftereffect.signedAftereffectDegrees : null, allowed: originEligible, eligibleTrialCount: washoutEligibleCount, totalTrialCount, measurementProtocolVersion, measurementVersions, unavailableReason: originEligible ? "Washout aftereffect requires eligible baseline and initial washout directional errors." : originUnavailable, signConvention: originEligible ? "positive-clockwise" : undefined }),
  ];
}

interface MetricValueInput {
  readonly metric: RecoveryMetric;
  readonly value: number | null;
  readonly allowed: boolean;
  readonly eligibleTrialCount: number;
  readonly totalTrialCount: number;
  readonly measurementProtocolVersion: MeasurementProtocolVersion | null;
  readonly measurementVersions: readonly TrialMeasurementProtocolKey[];
  readonly unavailableReason: string;
  readonly signConvention?: "positive-clockwise";
}

function metricValue(input: MetricValueInput): RecoveryMetricValue {
  const finiteValue = input.allowed && input.value !== null && Number.isFinite(input.value) ? input.value : null;
  const eligible = input.allowed && finiteValue !== null && input.eligibleTrialCount > 0;
  return {
    metric: input.metric,
    value: eligible ? finiteValue : null,
    unit: METRIC_UNITS[input.metric],
    eligible,
    eligibleTrialCount: eligible ? input.eligibleTrialCount : 0,
    totalTrialCount: input.totalTrialCount,
    measurementProtocolVersion: input.measurementProtocolVersion,
    measurementVersions: input.measurementVersions,
    explanation: eligible ? null : input.unavailableReason,
    ...(input.signConvention ? { signConvention: input.signConvention } : {}),
  };
}

function buildDataQuality(
  rawTrials: readonly unknown[],
  parsedTrials: readonly ParsedTrial[],
  issues: readonly RecoveryDataIssue[],
  metrics: readonly RecoveryMetricValue[],
  nonObjectTrialCount: number,
): RecoveryDataQuality {
  const outcomeCounts = countOutcomes(rawTrials);
  const missingDataExplanations = metrics.filter((metric) => !metric.eligible || metric.value === null).map((metric) => `${metric.metric}: ${metric.explanation ?? "Unavailable."}`);
  return {
    valid: rawTrials.length > 0 && !issues.some((dataIssue) => dataIssue.severity === "error"),
    totalTrials: rawTrials.length,
    completedTrials: outcomeCounts.completed,
    invalidTrials: outcomeCounts.invalid + nonObjectTrialCount,
    timedOutTrials: outcomeCounts["timed-out"],
    abortedTrials: outcomeCounts.aborted,
    nonFiniteTrialCount: parsedTrials.filter((parsed) => parsed.nonFinite).length,
    sessionIdMismatchCount: parsedTrials.filter((parsed) => parsed.sessionIdMismatch).length,
    issues,
    missingDataExplanations,
  };
}

function parseCheckInRecord(raw: unknown): ParsedCheckIn {
  const validation = validateCheckIn(raw);
  if (!validation.valid) return { kind: "rejected", rejected: { kind: "check-in", recordId: recordIdentifier(raw), reason: validation.errors.join(" ") } };
  return { kind: "valid", record: raw as SymptomCheckInRecord };
}

function associateCheckIn(
  record: SymptomCheckInRecord,
  observationByKey: ReadonlyMap<string, RecoveryObservation>,
  sessionInfoById: ReadonlyMap<string, SessionInfo>,
): RecoveryCheckInObservation {
  const scores = checkInScores(record);
  const base = {
    checkInId: record.id,
    participantId: record.participantId,
    recordedAt: record.recordedAt,
    context: record.context,
    ...(record.missionPhase ? { missionPhase: record.missionPhase } : {}),
    scores,
    ...(record.freeTextNote !== undefined ? { freeTextNote: record.freeTextNote } : {}),
    provenance: "browser-user-generated" as const,
    interpretation: "self-report-not-an-objective-vestibular-measurement" as const,
  };
  const explicitSessionId = record.assessmentSessionId;
  if (!explicitSessionId) {
    return { ...base, linkState: "no-explicit-session-identifier", association: null, associationExplanation: "No explicit assessment-session identifier was recorded. Timestamp proximity is never used to infer an association." };
  }

  const observation = observationByKey.get(observationKey(record.participantId, explicitSessionId));
  if (observation) {
    return {
      ...base,
      assessmentSessionId: explicitSessionId,
      linkState: "associated-with-completed-session",
      association: {
        checkInId: record.id,
        assessmentSessionId: explicitSessionId,
        context: record.context,
        recordedAt: record.recordedAt,
        ...(record.missionPhase ? { missionPhase: record.missionPhase } : {}),
        scores,
        ...(record.freeTextNote !== undefined ? { freeTextNote: record.freeTextNote } : {}),
        provenance: "browser-user-generated",
        interpretation: "self-report-not-an-objective-vestibular-measurement",
        associationSource: "explicit-assessment-session-identifier",
      },
      associationExplanation: null,
    };
  }

  const sessionInfo = sessionInfoById.get(explicitSessionId);
  const linkState: CheckInLinkState = sessionInfo && sessionInfo.participantId !== record.participantId
    ? "participant-mismatch"
    : sessionInfo
      ? "session-not-completed"
      : "session-not-found";
  const explanation = linkState === "participant-mismatch"
    ? "The referenced assessment session belongs to a different browser-local participant profile."
    : linkState === "session-not-completed"
      ? "The referenced assessment session is not a valid completed session, so it cannot receive this check-in."
      : "No completed assessment session with the explicit identifier was found. The check-in remains unassociated.";
  return { ...base, assessmentSessionId: explicitSessionId, linkState, association: null, associationExplanation: explanation };
}

function checkInScores(record: SymptomCheckInRecord): RecoveryCheckInScores {
  return {
    dizzinessOrDisorientation: record.dizzinessOrDisorientation ?? null,
    balanceOrCoordinationDifficulty: record.balanceOrCoordinationDifficulty ?? null,
    nausea: record.nausea ?? null,
    visualDiscomfort: record.visualDiscomfort ?? null,
    fatigue: record.fatigue ?? null,
    movementConfidence: record.movementConfidence ?? null,
  };
}

function issueForValidity(validity: MeasurementValidity): RecoveryDataIssue | null {
  switch (validity) {
    case "corrected-actual-origin":
      return null;
    case "legacy-origin-unverified":
      return issue("legacy-origin-unverified", "warning", "This session has a homogeneous legacy protocol without verified actual-pointer origins. Timing metrics remain available; origin-sensitive metrics do not.");
    case "mixed-measurement-protocols":
      return issue("mixed-measurement-protocols", "error", "This session mixes measurement protocol versions and cannot supply pooled metrics.");
    case "inconsistent-origin-provenance":
      return issue("inconsistent-origin-provenance", "error", "At least one trial lacks verified origin provenance; origin-sensitive metrics are withheld.");
    case "inconsistent-session-protocol":
      return issue("inconsistent-session-protocol", "error", "Stored session protocol metadata is missing or inconsistent with the trial-level measurement versions.");
    case "unknown-protocol":
      return issue("unknown-measurement-protocol", "error", "The measurement protocol is unknown or unrecognized, so pooled metrics are withheld.");
    case "no-trials":
      return issue("no-trials", "error", "This completed session contains no trial records, so no metrics can be derived.");
  }
}

function safeAdaptation(trials: readonly TrialRecord[]) {
  try {
    return calculateAdaptationSummary(trials);
  } catch {
    return { earlyAdaptation: { phase: "early-adaptation" as const, validTrialCount: 0, totalTrialCount: 0, meanDirectionalErrorDegrees: null, meanReactionTimeMs: null, meanMovementTimeMs: null }, lateAdaptation: { phase: "late-adaptation" as const, validTrialCount: 0, totalTrialCount: 0, meanDirectionalErrorDegrees: null, meanReactionTimeMs: null, meanMovementTimeMs: null }, directionalErrorChangeDegrees: null };
  }
}

function safeAftereffect(trials: readonly TrialRecord[]) {
  try {
    return calculateWashoutAftereffect(trials, WASHOUT_WINDOW);
  } catch {
    return { baselineMeanDirectionalErrorDegrees: null, initialWashoutMeanDirectionalErrorDegrees: null, signedAftereffectDegrees: null, magnitudeDegrees: null, validBaselineTrialCount: 0, validWashoutTrialCount: 0, initialWashoutTrialWindow: WASHOUT_WINDOW };
  }
}

function optionalFiniteTimestamp(value: unknown, label: string, trialId: string, issues: RecoveryDataIssue[]): string | null {
  if (value === null || value === undefined) return null;
  if (isFiniteTimestamp(value)) return value;
  issues.push(issue("non-finite-timestamp", "error", `The ${label} timestamp is not a finite date; that interval is unavailable.`, trialId));
  return null;
}

function countOutcomes(rawTrials: readonly unknown[]): Record<TrialOutcome, number> {
  const counts: Record<TrialOutcome, number> = { completed: 0, aborted: 0, invalid: 0, "timed-out": 0 };
  for (const trial of rawTrials) {
    if (isRecord(trial) && TRIAL_OUTCOMES.includes(trial.outcome as TrialOutcome)) counts[trial.outcome as TrialOutcome] += 1;
  }
  return counts;
}

function validValues(measurements: readonly { readonly value: number | null; readonly valid: boolean }[]): readonly number[] {
  return measurements.flatMap((measurement) => measurement.valid && measurement.value !== null && Number.isFinite(measurement.value) ? [measurement.value] : []);
}

function isValidMeasurement(measurement: { readonly value: number | null; readonly valid: boolean } | undefined): boolean {
  return Boolean(measurement && measurement.valid && measurement.value !== null && Number.isFinite(measurement.value));
}

function meanOrNull(values: readonly number[]): number | null {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function malformedTrial(message: string, trialId: string | null): ParsedTrial {
  return { trial: null, issues: [issue("malformed-trial", "error", message, trialId ?? undefined)], nonFinite: false, originUnavailable: false, sessionIdMismatch: false };
}

function rejectedSession(message: string, recordId: string | null): ParsedSession {
  return { kind: "rejected", rejected: { kind: "assessment-session", recordId, reason: message } };
}

function issue(code: RecoveryDataIssue["code"], severity: RecoveryDataIssue["severity"], message: string, trialId?: string): RecoveryDataIssue {
  return { code, severity, message, ...(trialId ? { trialId } : {}) };
}

function observationKey(participantId: string, sessionId: string): string { return `${participantId}\u0000${sessionId}`; }

function recordIdentifier(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (isNonEmptyString(value.id)) return value.id;
  if (isRecord(value.metadata) && isNonEmptyString(value.metadata.sessionId)) return value.metadata.sessionId;
  return null;
}

function compareObservations(left: RecoveryObservation, right: RecoveryObservation): number {
  return timestampComparison(left.completedAt, right.completedAt) || left.sessionId.localeCompare(right.sessionId);
}

function compareCheckIns(left: SymptomCheckInRecord, right: SymptomCheckInRecord): number {
  return timestampComparison(left.recordedAt, right.recordedAt) || left.id.localeCompare(right.id);
}

function compareCheckInObservations(left: RecoveryCheckInObservation, right: RecoveryCheckInObservation): number {
  return timestampComparison(left.recordedAt, right.recordedAt) || left.checkInId.localeCompare(right.checkInId);
}

function compareCheckInAssociations(left: CheckInAssociation, right: CheckInAssociation): number {
  return timestampComparison(left.recordedAt, right.recordedAt) || left.checkInId.localeCompare(right.checkInId);
}

function compareExcludedSessions(left: RecoveryExcludedSession, right: RecoveryExcludedSession): number {
  return timestampComparison(left.completedAt ?? "", right.completedAt ?? "") || left.sessionId.localeCompare(right.sessionId);
}

function compareParticipants(left: RecoveryParticipantDataset, right: RecoveryParticipantDataset): number {
  const leftKey = left.observations[0]?.completedAt ?? left.checkIns[0]?.recordedAt ?? "";
  const rightKey = right.observations[0]?.completedAt ?? right.checkIns[0]?.recordedAt ?? "";
  return timestampComparison(leftKey, rightKey) || left.participantId.localeCompare(right.participantId);
}

function timestampComparison(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
  if (!Number.isFinite(leftTime)) return 1;
  if (!Number.isFinite(rightTime)) return -1;
  return leftTime - rightTime;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isNonEmptyString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isFiniteTimestamp(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function isFiniteCoordinate(value: unknown): value is CursorCoordinate & Record<string, unknown> { return isRecord(value) && typeof value.x === "number" && typeof value.y === "number" && Number.isFinite(value.x) && Number.isFinite(value.y); }
function isFiniteTrajectoryPoint(value: unknown): value is CursorTrajectoryPoint & Record<string, unknown> { return isRecord(value) && typeof value.x === "number" && typeof value.y === "number" && typeof value.elapsedMs === "number" && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.elapsedMs) && value.elapsedMs >= 0; }
