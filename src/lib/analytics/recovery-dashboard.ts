import { calculateMetricDelta, selectPersonalReferenceSession } from "@/lib/analytics/baseline";
import { findRecoveryMetric, RECOVERY_METRICS } from "@/lib/analytics/recovery";
import type { MeasurementValidity } from "@/lib/assessment/measurement-validity";
import { CHECK_IN_FIELDS } from "@/lib/checkin/record";
import type { CheckInContext, CheckInFieldDefinition } from "@/types/checkin";
import type {
  CheckInAssociation,
  CheckInLinkState,
  MetricDelta,
  RecoveryCheckInObservation,
  RecoveryCheckInScoreField,
  RecoveryDataIssue,
  RecoveryDataset,
  RecoveryMetric,
  RecoveryMetricValue,
  RecoveryObservation,
  RecoveryParticipantDataset,
} from "@/types/recovery";
import type { MeasurementProtocolVersion } from "@/types/trial";

export interface RecoveryMetricPresentation {
  readonly metric: RecoveryMetric;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly unitLabel: string;
  readonly precision: number;
  readonly originSensitive: boolean;
}

const METRIC_PRESENTATIONS: Readonly<Record<RecoveryMetric, RecoveryMetricPresentation>> = {
  "reaction-time-mean": {
    metric: "reaction-time-mean",
    label: "Mean reaction time",
    shortLabel: "Reaction",
    description: "Mean time from target presentation to movement onset.",
    unitLabel: "ms",
    precision: 0,
    originSensitive: false,
  },
  "movement-time-mean": {
    metric: "movement-time-mean",
    label: "Mean movement time",
    shortLabel: "Movement",
    description: "Mean time from movement onset to movement completion.",
    unitLabel: "ms",
    precision: 0,
    originSensitive: false,
  },
  "directional-error-mean": {
    metric: "directional-error-mean",
    label: "Mean directional error",
    shortLabel: "Directional error",
    description: "Mean signed initial aiming error; positive values are clockwise.",
    unitLabel: "degrees",
    precision: 1,
    originSensitive: true,
  },
  "trajectory-deviation-mean": {
    metric: "trajectory-deviation-mean",
    label: "Mean trajectory deviation",
    shortLabel: "Trajectory",
    description: "Mean RMS perpendicular distance of the recorded path from the start-to-target line.",
    unitLabel: "CSS px",
    precision: 1,
    originSensitive: true,
  },
  "correction-count-mean": {
    metric: "correction-count-mean",
    label: "Mean correction count",
    shortLabel: "Corrections",
    description: "Mean count of adjacent non-zero trajectory segments whose heading changes by at least 10 degrees.",
    unitLabel: "count",
    precision: 0,
    originSensitive: true,
  },
  "peak-velocity-time-mean": {
    metric: "peak-velocity-time-mean",
    label: "Mean peak-velocity time",
    shortLabel: "Peak velocity",
    description: "Mean elapsed time to the highest positive segment velocity.",
    unitLabel: "ms",
    precision: 0,
    originSensitive: true,
  },
  "adaptation-change": {
    metric: "adaptation-change",
    label: "Adaptation change",
    shortLabel: "Adaptation",
    description: "Late-adaptation mean directional error minus early-adaptation mean directional error.",
    unitLabel: "degrees",
    precision: 1,
    originSensitive: true,
  },
  "washout-aftereffect": {
    metric: "washout-aftereffect",
    label: "Washout aftereffect",
    shortLabel: "Washout",
    description: "Signed initial-washout directional error (first N = 4 ordered washout trials) minus baseline mean error; positive values are clockwise.",
    unitLabel: "degrees",
    precision: 1,
    originSensitive: true,
  },
};

export function recoveryMetricPresentation(metric: RecoveryMetric): RecoveryMetricPresentation {
  return METRIC_PRESENTATIONS[metric];
}

export const RECOVERY_METRIC_PRESENTATIONS: readonly RecoveryMetricPresentation[] = RECOVERY_METRICS.map(recoveryMetricPresentation);

/** One canonical list of self-report items, shared with the check-in form. */
export const RECOVERY_CHECK_IN_FIELDS: readonly CheckInFieldDefinition[] = CHECK_IN_FIELDS;

export const CHECK_IN_CONTEXT_LABELS: Readonly<Record<CheckInContext, string>> = {
  "pre-assessment": "Pre-assessment",
  "post-assessment": "Post-assessment",
  general: "General",
};

export const CHECK_IN_LINK_STATE_LABELS: Readonly<Record<CheckInLinkState, string>> = {
  "associated-with-completed-session": "Explicitly associated with a completed session",
  "no-explicit-session-identifier": "No explicit session identifier",
  "session-not-found": "Referenced session not found",
  "session-not-completed": "Referenced session not completed",
  "participant-mismatch": "Referenced session belongs to another profile",
};

export const MEASUREMENT_VALIDITY_LABELS: Readonly<Record<MeasurementValidity, string>> = {
  "corrected-actual-origin": "Corrected actual-pointer origin",
  "legacy-origin-unverified": "Legacy origin unverified",
  "mixed-measurement-protocols": "Mixed measurement protocols",
  "inconsistent-origin-provenance": "Inconsistent origin provenance",
  "inconsistent-session-protocol": "Inconsistent session protocol",
  "unknown-protocol": "Unknown measurement protocol",
  "no-trials": "No trials",
};

export const MEASUREMENT_VALIDITY_EXPLANATIONS: Readonly<Record<MeasurementValidity, string | null>> = {
  "corrected-actual-origin": null,
  "legacy-origin-unverified": "This session uses a homogeneous legacy measurement protocol without a verified actual-pointer origin. Timing metrics may remain available; directional, trajectory, correction, adaptation, and washout metrics do not.",
  "mixed-measurement-protocols": "This session contains more than one measurement protocol version. All pooled metrics, including timing, are withheld rather than merging incompatible protocols.",
  "inconsistent-origin-provenance": "At least one trial lacks verified origin provenance. Origin-sensitive metrics are withheld; timing metrics may remain available where timestamps are valid.",
  "inconsistent-session-protocol": "Stored session protocol metadata is missing or inconsistent with the trial-level measurement versions. Pooled derived metrics are withheld conservatively.",
  "unknown-protocol": "The measurement protocol is missing or unrecognized. Pooled derived metrics are withheld conservatively.",
  "no-trials": "This completed session contains no trial records, so no metrics can be derived.",
};

const PROTOCOL_LABELS: Readonly<Record<MeasurementProtocolVersion, string>> = {
  "0.1.0-legacy-origin-unverified": "v0.1.0 legacy, origin unverified",
  "0.2.0-actual-pointer-origin": "v0.2.0 actual-pointer origin",
  "0.3.0-actual-pointer-origin-hidden-cursor": "v0.3.0 actual-pointer origin, hidden cursor",
};

const PROTOCOL_SHORT_LABELS: Readonly<Record<MeasurementProtocolVersion, string>> = {
  "0.1.0-legacy-origin-unverified": "v0.1.0 legacy",
  "0.2.0-actual-pointer-origin": "v0.2.0",
  "0.3.0-actual-pointer-origin-hidden-cursor": "v0.3.0",
};

export function measurementProtocolLabel(version: MeasurementProtocolVersion | null): string {
  if (!version) return "Unknown measurement protocol";
  const known = Object.prototype.hasOwnProperty.call(PROTOCOL_LABELS, version) ? PROTOCOL_LABELS[version as MeasurementProtocolVersion] : null;
  return known ?? `Unrecognized measurement protocol (${version})`;
}

export function measurementProtocolShortLabel(version: MeasurementProtocolVersion | null): string {
  if (!version) return "Unknown";
  const known = Object.prototype.hasOwnProperty.call(PROTOCOL_SHORT_LABELS, version) ? PROTOCOL_SHORT_LABELS[version as MeasurementProtocolVersion] : null;
  return known ?? "Unrecognized";
}

export const RECOVERY_TIMEZONE_LABEL = "UTC";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** All recovery timestamps are rendered in UTC so records are unambiguous. */
export function formatRecoveryDateTime(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${DATE_TIME_FORMATTER.format(date)} ${RECOVERY_TIMEZONE_LABEL}` : "Unavailable";
}

export function formatRecoveryDate(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? DATE_FORMATTER.format(date) : "Unavailable";
}

export function formatRecoveryShortDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? SHORT_DATE_FORMATTER.format(date) : "—";
}

/** Metric values are rendered without a unit suffix; the unit is shown separately. */
export function formatRecoveryMetricValue(value: number | null, precision: number): string {
  return value === null || !Number.isFinite(value) ? "Unavailable" : formatRecoveryMetricNumber(value, precision);
}

export function formatRecoveryMetricNumber(value: number, precision: number): string {
  return value.toFixed(precision);
}

export function formatRecoverySignedValue(value: number | null, presentation: RecoveryMetricPresentation): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  if (Math.abs(value) < NUMERICAL_ZERO_EPSILON) return formatRecoveryMetricNumber(0, presentation.precision);
  return `${value > 0 ? "+" : "−"}${formatRecoveryMetricNumber(Math.abs(value), presentation.precision)}`;
}

export function formatSelfReportScore(value: number | null): string {
  return value === null ? "Not answered" : String(value);
}

export function formatSessionId(sessionId: string): string {
  return sessionId.length > 14 ? `${sessionId.slice(0, 8)}…${sessionId.slice(-4)}` : sessionId;
}

export interface RecoveryOverview {
  readonly completedSessions: number;
  readonly eligibleObservations: number;
  readonly associatedCheckIns: number;
  readonly mostRecentCompletedAt: string | null;
  readonly excludedSessions: number;
  readonly rejectedRecords: number;
}

export function buildRecoveryOverview(dataset: RecoveryDataset, participant: RecoveryParticipantDataset | null): RecoveryOverview {
  if (!participant) {
    return {
      completedSessions: 0,
      eligibleObservations: 0,
      associatedCheckIns: 0,
      mostRecentCompletedAt: null,
      excludedSessions: dataset.excludedSessions.length,
      rejectedRecords: dataset.rejectedRecords.length,
    };
  }
  return {
    completedSessions: participant.observations.length,
    eligibleObservations: participant.observations.filter((observation) => observation.eligibility.eligibleMetrics.length > 0).length,
    associatedCheckIns: participant.checkIns.filter((checkIn) => checkIn.association !== null).length,
    mostRecentCompletedAt: participant.observations.at(-1)?.completedAt ?? null,
    excludedSessions: dataset.excludedSessions.length,
    rejectedRecords: dataset.rejectedRecords.length,
  };
}

export interface RecoveryObservationOption {
  readonly sessionId: string;
  readonly label: string;
  readonly protocolLabel: string;
  readonly eligibleMetricCount: number;
}

export function buildRecoveryObservationOptions(participant: RecoveryParticipantDataset): readonly RecoveryObservationOption[] {
  return participant.observations.map((observation) => ({
    sessionId: observation.sessionId,
    label: `${formatRecoveryDateTime(observation.completedAt)} · ${formatSessionId(observation.sessionId)}`,
    protocolLabel: measurementProtocolShortLabel(observation.measurementProtocolVersion),
    eligibleMetricCount: observation.eligibility.eligibleMetrics.length,
  }));
}

export interface RecoveryReferenceMetricEligibility {
  readonly metric: RecoveryMetric;
  readonly label: string;
  readonly eligible: boolean;
  readonly reason: string | null;
}

export interface RecoveryReferenceOption {
  readonly sessionId: string;
  readonly completedAt: string;
  readonly label: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion | null;
  readonly protocolLabel: string;
  readonly measurementValidityLabel: string;
  readonly protocolCompatible: boolean;
  readonly protocolExplanation: string | null;
  readonly eligibleMetricCount: number;
  readonly compatibleMetricCount: number;
  readonly metricEligibility: readonly RecoveryReferenceMetricEligibility[];
}

export function buildRecoveryReferenceOptions(participant: RecoveryParticipantDataset, current: RecoveryObservation): readonly RecoveryReferenceOption[] {
  return participant.observations
    .filter((observation) => observation.sessionId !== current.sessionId)
    .map((observation) => {
      const metricEligibility = RECOVERY_METRICS.map((metric) => {
        const value = findRecoveryMetric(observation, metric);
        const eligible = Boolean(value?.eligible && value.value !== null);
        return {
          metric,
          label: recoveryMetricPresentation(metric).label,
          eligible,
          reason: eligible ? null : value?.explanation ?? "No eligible value is available.",
        };
      });
      const protocolsCompatible = protocolsAreCompatible(current, observation);
      return {
        sessionId: observation.sessionId,
        completedAt: observation.completedAt,
        label: `${formatRecoveryDateTime(observation.completedAt)} · ${formatSessionId(observation.sessionId)}`,
        measurementProtocolVersion: observation.measurementProtocolVersion,
        protocolLabel: measurementProtocolShortLabel(observation.measurementProtocolVersion),
        measurementValidityLabel: MEASUREMENT_VALIDITY_LABELS[observation.measurementValidity],
        protocolCompatible: protocolsCompatible,
        protocolExplanation: protocolsCompatible ? null : incompatibleProtocolExplanation(current, observation),
        eligibleMetricCount: metricEligibility.filter((metric) => metric.eligible).length,
        compatibleMetricCount: protocolsCompatible ? metricEligibility.filter((metric) => metric.eligible).length : 0,
        metricEligibility,
      };
    });
}

export type RecoveryReferenceMode = "metric-specific-default" | "explicit-override" | "self-reference-rejected" | "none";

export interface RecoveryMetricView {
  readonly metric: RecoveryMetric;
  readonly presentation: RecoveryMetricPresentation;
  readonly currentValue: RecoveryMetricValue | null;
  readonly referenceValue: RecoveryMetricValue | null;
  /** "resolved" when a reference session was identified, "unavailable" when none could be confirmed. */
  readonly referenceStatus: "resolved" | "unavailable";
  readonly referenceSessionId: string | null;
  readonly referenceCompletedAt: string | null;
  readonly referenceProtocolVersion: MeasurementProtocolVersion | null;
  readonly referenceAssessmentProtocolVersion: string | null;
  readonly referenceSource: "default-earliest-eligible" | "explicit-override" | null;
  /** True only when the reference can actually be compared with the current observation. */
  readonly referenceCompatible: boolean;
  readonly referenceExplanation: string | null;
  readonly delta: MetricDelta | null;
  readonly comparisonAvailable: boolean;
  readonly explanation: string | null;
  readonly legacyTimingOnly: boolean;
}

interface ReferenceResolution {
  readonly status: "resolved" | "unavailable";
  readonly sessionId: string | null;
  readonly completedAt: string | null;
  readonly measurementProtocolVersion: MeasurementProtocolVersion | null;
  readonly assessmentProtocolVersion: string | null;
  readonly source: "default-earliest-eligible" | "explicit-override" | null;
  readonly compatible: boolean;
  readonly explanation: string | null;
}

/**
 * Resolves the reference session for one metric.
 *
 * Phase 7A remains the authority for participant ownership, metric eligibility
 * and protocol compatibility. This layer only adds two presentation-safe
 * rules: an observation without a single known measurement protocol version
 * can never be compared, so no reference is proposed for it; and an explicitly
 * chosen session keeps its identity in the interface even when Phase 7A
 * rejects it for a metric or protocol reason.
 */
function resolveReference(
  dataset: RecoveryDataset,
  participant: RecoveryParticipantDataset,
  current: RecoveryObservation,
  metric: RecoveryMetric,
  explicitReferenceSessionId: string | null,
): ReferenceResolution {
  if (explicitReferenceSessionId && explicitReferenceSessionId === current.sessionId) {
    return {
      status: "unavailable",
      sessionId: null,
      completedAt: null,
      measurementProtocolVersion: null,
      assessmentProtocolVersion: null,
      source: null,
      compatible: false,
      explanation: "The current observation cannot be selected as its own personal reference session.",
    };
  }

  const currentProtocol = current.measurementProtocolVersion;
  if (!currentProtocol) {
    return {
      status: "unavailable",
      sessionId: null,
      completedAt: null,
      measurementProtocolVersion: null,
      assessmentProtocolVersion: null,
      source: null,
      compatible: false,
      explanation: "This observation has no single known measurement protocol version (a legacy record without a per-trial measurement label, or an unrecognized protocol), so no protocol-compatible reference session can be confirmed and no comparison can be produced.",
    };
  }

  const selection = selectPersonalReferenceSession(dataset, {
    participantId: participant.participantId,
    metric,
    excludeSessionId: current.sessionId,
    ...(explicitReferenceSessionId ? { referenceSessionId: explicitReferenceSessionId } : {}),
    requiredMeasurementProtocolVersion: currentProtocol,
  });

  if (!selection.ok) {
    const chosen = explicitReferenceSessionId
      ? participant.observations.find((observation) => observation.sessionId === explicitReferenceSessionId) ?? null
      : null;
    if (!chosen) {
      return {
        status: "unavailable",
        sessionId: null,
        completedAt: null,
        measurementProtocolVersion: null,
        assessmentProtocolVersion: null,
        source: null,
        compatible: false,
        explanation: selection.message,
      };
    }
    return {
      status: "resolved",
      sessionId: chosen.sessionId,
      completedAt: chosen.completedAt,
      measurementProtocolVersion: chosen.measurementProtocolVersion,
      assessmentProtocolVersion: chosen.assessmentProtocolVersion,
      source: "explicit-override",
      compatible: false,
      explanation: selection.message,
    };
  }

  const delta = calculateMetricDelta(current, selection.reference.observation, metric);
  return {
    status: "resolved",
    sessionId: selection.reference.sessionId,
    completedAt: selection.reference.completedAt,
    measurementProtocolVersion: selection.reference.measurementProtocolVersion,
    assessmentProtocolVersion: selection.reference.assessmentProtocolVersion,
    source: selection.reference.selection,
    compatible: delta.comparisonValid,
    explanation: delta.explanation,
  };
}

export function buildRecoveryMetricViews(
  dataset: RecoveryDataset,
  participant: RecoveryParticipantDataset,
  current: RecoveryObservation,
  explicitReferenceSessionId?: string | null,
): readonly RecoveryMetricView[] {
  const explicitId = explicitReferenceSessionId ?? null;
  return RECOVERY_METRICS.map((metric) => {
    const presentation = recoveryMetricPresentation(metric);
    const currentValue = findRecoveryMetric(current, metric);
    const reference = resolveReference(dataset, participant, current, metric, explicitId);
    const referenceObservation = reference.sessionId
      ? participant.observations.find((observation) => observation.sessionId === reference.sessionId) ?? null
      : null;
    const referenceValue = referenceObservation ? findRecoveryMetric(referenceObservation, metric) : null;
    const delta = referenceObservation ? calculateMetricDelta(current, referenceObservation, metric) : null;
    const currentIneligible = !(currentValue?.eligible && currentValue.value !== null);
    return {
      metric,
      presentation,
      currentValue,
      referenceValue,
      referenceStatus: reference.status,
      referenceSessionId: reference.sessionId,
      referenceCompletedAt: reference.completedAt,
      referenceProtocolVersion: reference.measurementProtocolVersion,
      referenceAssessmentProtocolVersion: reference.assessmentProtocolVersion,
      referenceSource: reference.source,
      referenceCompatible: reference.compatible,
      referenceExplanation: reference.explanation,
      delta,
      comparisonAvailable: delta?.comparisonValid ?? false,
      explanation: currentIneligible
        ? currentValue?.explanation ?? "The current observation has no eligible value for this metric."
        : reference.explanation ?? delta?.explanation ?? null,
      legacyTimingOnly: current.measurementValidity === "legacy-origin-unverified" && !presentation.originSensitive && Boolean(currentValue?.eligible),
    };
  });
}

export interface RecoveryUnavailableMetricView {
  readonly metric: RecoveryMetric;
  readonly label: string;
  readonly reason: string;
}

export interface RecoveryQualityView {
  readonly completedAt: string;
  readonly measurementValidity: MeasurementValidity;
  readonly measurementValidityLabel: string;
  readonly validityExplanation: string | null;
  readonly assessmentProtocolVersion: string;
  readonly measurementProtocolLabel: string;
  readonly measurementVersions: readonly string[];
  readonly inputDevice: string;
  readonly timingMetricsEligible: boolean;
  readonly originSensitiveMetricsEligible: boolean;
  readonly eligibleMetrics: readonly RecoveryMetric[];
  readonly unavailableMetrics: readonly RecoveryUnavailableMetricView[];
  readonly totalTrials: number;
  readonly completedTrials: number;
  readonly invalidTrials: number;
  readonly timedOutTrials: number;
  readonly abortedTrials: number;
  readonly nonFiniteTrialCount: number;
  readonly sessionIdMismatchCount: number;
  readonly issues: readonly RecoveryDataIssue[];
  readonly missingDataExplanations: readonly string[];
  readonly legacyTimingOnly: boolean;
  readonly dataQualityValid: boolean;
}

export function buildRecoveryQualityView(observation: RecoveryObservation): RecoveryQualityView {
  const inputDeviceLabel = observation.inputDevice === "mouse"
    ? "Mouse"
    : observation.inputDevice === "trackpad"
      ? "Trackpad"
      : "Unknown input device";
  return {
    completedAt: observation.completedAt,
    measurementValidity: observation.measurementValidity,
    measurementValidityLabel: MEASUREMENT_VALIDITY_LABELS[observation.measurementValidity],
    validityExplanation: MEASUREMENT_VALIDITY_EXPLANATIONS[observation.measurementValidity],
    assessmentProtocolVersion: observation.assessmentProtocolVersion || "Unknown",
    measurementProtocolLabel: measurementProtocolLabel(observation.measurementProtocolVersion),
    measurementVersions: observation.measurementVersions,
    inputDevice: inputDeviceLabel,
    timingMetricsEligible: observation.eligibility.timingMetricsEligible,
    originSensitiveMetricsEligible: observation.eligibility.originSensitiveMetricsEligible,
    eligibleMetrics: observation.eligibility.eligibleMetrics,
    unavailableMetrics: observation.eligibility.unavailableMetrics.map((unavailable) => ({
      metric: unavailable.metric,
      label: recoveryMetricPresentation(unavailable.metric).label,
      reason: unavailable.reason,
    })),
    totalTrials: observation.dataQuality.totalTrials,
    completedTrials: observation.dataQuality.completedTrials,
    invalidTrials: observation.dataQuality.invalidTrials,
    timedOutTrials: observation.dataQuality.timedOutTrials,
    abortedTrials: observation.dataQuality.abortedTrials,
    nonFiniteTrialCount: observation.dataQuality.nonFiniteTrialCount,
    sessionIdMismatchCount: observation.dataQuality.sessionIdMismatchCount,
    issues: observation.dataQuality.issues,
    missingDataExplanations: observation.dataQuality.missingDataExplanations,
    legacyTimingOnly: observation.measurementValidity === "legacy-origin-unverified"
      && observation.eligibility.timingMetricsEligible
      && !observation.eligibility.originSensitiveMetricsEligible,
    dataQualityValid: observation.dataQuality.valid,
  };
}

export interface RecoveryTrendPoint {
  readonly observation: RecoveryObservation;
  readonly value: number;
  readonly eligibleTrialCount: number;
  readonly totalTrialCount: number;
  readonly protocolVersion: MeasurementProtocolVersion | null;
  readonly observationIndex: number;
}

export interface RecoveryTrendSegment {
  readonly protocolVersion: MeasurementProtocolVersion | null;
  readonly points: readonly RecoveryTrendPoint[];
}

export interface RecoveryTrendSeries {
  readonly metric: RecoveryMetric;
  readonly observations: readonly RecoveryObservation[];
  readonly segments: readonly RecoveryTrendSegment[];
  readonly points: readonly RecoveryTrendPoint[];
  readonly protocols: readonly (MeasurementProtocolVersion | null)[];
  readonly min: number | null;
  readonly max: number | null;
}

/**
 * Builds chronological trend segments. A new segment starts at a protocol
 * change or at any observation without an eligible value, so the chart never
 * connects across incompatible protocols or missing observations.
 */
export function buildRecoveryTrendSeries(participant: RecoveryParticipantDataset, metric: RecoveryMetric): RecoveryTrendSeries {
  const observations = participant.observations;
  const segments: RecoveryTrendSegment[] = [];
  const points: RecoveryTrendPoint[] = [];
  let currentSegment: { protocolVersion: MeasurementProtocolVersion | null; points: RecoveryTrendPoint[] } | null = null;
  let breakBeforeNext = false;

  observations.forEach((observation, observationIndex) => {
    const metricValue = findRecoveryMetric(observation, metric);
    const eligible = Boolean(metricValue?.eligible && metricValue.value !== null && Number.isFinite(metricValue.value));
    if (!eligible || !metricValue || metricValue.value === null) {
      currentSegment = null;
      breakBeforeNext = true;
      return;
    }
    const protocolVersion = observation.measurementProtocolVersion;
    if (!currentSegment || breakBeforeNext || currentSegment.protocolVersion !== protocolVersion) {
      currentSegment = { protocolVersion, points: [] };
      segments.push(currentSegment);
    }
    const point: RecoveryTrendPoint = {
      observation,
      value: metricValue.value,
      eligibleTrialCount: metricValue.eligibleTrialCount,
      totalTrialCount: metricValue.totalTrialCount,
      protocolVersion,
      observationIndex,
    };
    currentSegment.points.push(point);
    points.push(point);
    breakBeforeNext = false;
  });

  return {
    metric,
    observations,
    segments,
    points,
    protocols: [...new Set(points.map((point) => point.protocolVersion))],
    min: points.length > 0 ? Math.min(...points.map((point) => point.value)) : null,
    max: points.length > 0 ? Math.max(...points.map((point) => point.value)) : null,
  };
}

export interface RecoveryCheckInScoreView {
  readonly field: RecoveryCheckInScoreField;
  readonly label: string;
  readonly scale: string;
  readonly value: number | null;
}

export interface RecoveryCheckInHistoryEntry {
  readonly checkIn: RecoveryCheckInObservation;
  readonly contextLabel: string;
  readonly linkLabel: string;
  readonly linkExplanation: string | null;
  readonly associatedSessionId: string | null;
  readonly associatedSessionCompletedAt: string | null;
  readonly scores: readonly RecoveryCheckInScoreView[];
  readonly isPostAssessment: boolean;
  readonly isAssociated: boolean;
}

export function buildRecoveryCheckInHistory(participant: RecoveryParticipantDataset): readonly RecoveryCheckInHistoryEntry[] {
  return [...participant.checkIns]
    .sort((left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt) || left.checkInId.localeCompare(right.checkInId))
    .map((checkIn) => ({
      checkIn,
      contextLabel: CHECK_IN_CONTEXT_LABELS[checkIn.context],
      linkLabel: checkIn.association ? "Explicitly associated with a completed session" : CHECK_IN_LINK_STATE_LABELS[checkIn.linkState],
      linkExplanation: checkIn.associationExplanation,
      associatedSessionId: checkIn.association ? checkIn.assessmentSessionId ?? null : null,
      associatedSessionCompletedAt: checkIn.association
        ? participant.observations.find((observation) => observation.sessionId === checkIn.assessmentSessionId)?.completedAt ?? null
        : null,
      scores: RECOVERY_CHECK_IN_FIELDS.map((field) => ({ ...field, value: checkIn.scores[field.field] })),
      isPostAssessment: checkIn.context === "post-assessment",
      isAssociated: checkIn.association !== null,
    }));
}

export type RecoveryAlignmentCategory =
  | "both-increased"
  | "both-decreased"
  | "opposite-directions"
  | "no-observed-change"
  | "insufficient-data";

export const ALIGNMENT_CATEGORY_LABELS: Readonly<Record<RecoveryAlignmentCategory, string>> = {
  "both-increased": "Both increased",
  "both-decreased": "Both decreased",
  "opposite-directions": "Changed in opposite directions",
  "no-observed-change": "No observed change",
  "insufficient-data": "Insufficient data",
};

export interface RecoveryAlignmentRow {
  readonly rowId: string;
  readonly metric: RecoveryMetric;
  readonly scoreField: RecoveryCheckInScoreField;
  readonly scoreLabel: string;
  readonly scale: string;
  readonly currentCheckInId: string;
  readonly currentRecordedAt: string;
  readonly referenceCheckInId: string;
  readonly referenceRecordedAt: string;
  readonly currentScore: number | null;
  readonly referenceScore: number | null;
  readonly selfReportChange: number | null;
  readonly performanceChange: number | null;
  readonly category: RecoveryAlignmentCategory;
  readonly explanation: string | null;
}

export type RecoveryAlignmentStatus =
  | "available"
  | "comparison-unavailable"
  | "no-current-checkins"
  | "no-reference"
  | "no-reference-checkins";

export interface RecoveryAlignmentModel {
  readonly metric: RecoveryMetric;
  readonly status: RecoveryAlignmentStatus;
  readonly rows: readonly RecoveryAlignmentRow[];
  readonly currentCheckInCount: number;
  readonly referenceCheckInCount: number;
  readonly ignoredCheckInCount: number;
  readonly explanation: string | null;
  readonly performanceChange: number | null;
  readonly referenceSessionId: string | null;
}

/**
 * Compares explicitly associated post-assessment check-ins for the current and
 * reference sessions. Performance change is the selected metric delta; the
 * self-report change compares the same answered item in the two check-ins.
 */
export function buildRecoveryAlignment(
  participant: RecoveryParticipantDataset,
  current: RecoveryObservation,
  metricView: RecoveryMetricView,
): RecoveryAlignmentModel {
  const currentPostCheckIns = current.checkIns.filter((checkIn) => checkIn.context === "post-assessment");
  const referenceObservation = metricView.referenceSessionId
    ? participant.observations.find((observation) => observation.sessionId === metricView.referenceSessionId) ?? null
    : null;
  const referencePostCheckIns = referenceObservation?.checkIns.filter((checkIn) => checkIn.context === "post-assessment") ?? [];
  const usedCheckInIds = new Set([...currentPostCheckIns, ...referencePostCheckIns].map((checkIn) => checkIn.checkInId));
  const ignoredCheckInCount = participant.checkIns.filter((checkIn) => !usedCheckInIds.has(checkIn.checkInId)).length;

  const base = {
    metric: metricView.metric,
    currentCheckInCount: currentPostCheckIns.length,
    referenceCheckInCount: referencePostCheckIns.length,
    ignoredCheckInCount,
    performanceChange: metricView.delta?.comparisonValid ? metricView.delta.change : null,
    referenceSessionId: referenceObservation?.sessionId ?? null,
  };

  if (!metricView.comparisonAvailable) {
    return {
      ...base,
      status: "comparison-unavailable",
      rows: [],
      explanation: metricView.explanation ?? "The performance comparison is unavailable, so alignment cannot be described.",
    };
  }
  if (currentPostCheckIns.length === 0) {
    return {
      ...base,
      status: "no-current-checkins",
      rows: [],
      explanation: "The current observation has no explicitly associated post-assessment check-in.",
    };
  }
  if (!referenceObservation) {
    return {
      ...base,
      status: "no-reference",
      rows: [],
      explanation: "No eligible personal reference session is available for this metric.",
    };
  }
  if (referencePostCheckIns.length === 0) {
    return {
      ...base,
      status: "no-reference-checkins",
      rows: [],
      explanation: "The reference session has no explicitly associated post-assessment check-in.",
    };
  }

  const rows = currentPostCheckIns.flatMap((currentCheckIn) => referencePostCheckIns.flatMap((referenceCheckIn) => RECOVERY_CHECK_IN_FIELDS.map((field) => alignmentRow({
    metricView,
    field,
    currentCheckIn,
    referenceCheckIn,
  }))));

  return { ...base, status: "available", rows, explanation: null };
}

function alignmentRow(input: {
  readonly metricView: RecoveryMetricView;
  readonly field: (typeof RECOVERY_CHECK_IN_FIELDS)[number];
  readonly currentCheckIn: CheckInAssociation;
  readonly referenceCheckIn: CheckInAssociation;
}): RecoveryAlignmentRow {
  const currentScore = input.currentCheckIn.scores[input.field.field];
  const referenceScore = input.referenceCheckIn.scores[input.field.field];
  const selfReportChange = currentScore !== null && referenceScore !== null ? currentScore - referenceScore : null;
  const performanceChange = input.metricView.delta?.comparisonValid ? input.metricView.delta.change : null;
  const category = alignmentCategory(performanceChange, selfReportChange);
  return {
    rowId: `${input.metricView.metric}:${input.currentCheckIn.checkInId}:${input.referenceCheckIn.checkInId}:${input.field.field}`,
    metric: input.metricView.metric,
    scoreField: input.field.field,
    scoreLabel: input.field.label,
    scale: input.field.scale,
    currentCheckInId: input.currentCheckIn.checkInId,
    currentRecordedAt: input.currentCheckIn.recordedAt,
    referenceCheckInId: input.referenceCheckIn.checkInId,
    referenceRecordedAt: input.referenceCheckIn.recordedAt,
    currentScore,
    referenceScore,
    selfReportChange,
    performanceChange,
    category,
    explanation: alignmentExplanation(category, currentScore, referenceScore, performanceChange),
  };
}

function alignmentCategory(performanceChange: number | null, selfReportChange: number | null): RecoveryAlignmentCategory {
  if (performanceChange === null || selfReportChange === null || !Number.isFinite(performanceChange)) return "insufficient-data";
  const performanceDirection = mathematicalDirection(performanceChange);
  const selfReportDirection = mathematicalDirection(selfReportChange);
  if (performanceDirection === 0 && selfReportDirection === 0) return "no-observed-change";
  if (performanceDirection === 1 && selfReportDirection === 1) return "both-increased";
  if (performanceDirection === -1 && selfReportDirection === -1) return "both-decreased";
  if (performanceDirection !== 0 && selfReportDirection !== 0 && performanceDirection !== selfReportDirection) return "opposite-directions";
  return "insufficient-data";
}

function alignmentExplanation(category: RecoveryAlignmentCategory, currentScore: number | null, referenceScore: number | null, performanceChange: number | null): string | null {
  if (currentScore === null || referenceScore === null) return "This item was not answered in one or both check-ins.";
  if (performanceChange === null || !Number.isFinite(performanceChange)) return "The performance comparison is unavailable.";
  if (category === "insufficient-data") return "Only one measure changed; a same-direction or opposite-direction classification is not available.";
  return null;
}

export interface RecoveryDashboardOptions {
  readonly participantId?: string;
  readonly currentSessionId?: string;
  readonly referenceSessionId?: string | null;
  readonly focusMetric?: RecoveryMetric;
}

export type RecoveryParticipantResolution =
  | { readonly status: "resolved"; readonly participantId: string }
  | { readonly status: "empty"; readonly message: string }
  | { readonly status: "not-found"; readonly message: string }
  | { readonly status: "ambiguous"; readonly participantIds: readonly string[]; readonly message: string };

export const BROWSER_PARTICIPANT_ID = "browser-participant";

/**
 * Resolves the single browser-local participant profile.
 *
 * The established browser profile is preferred. Otherwise a single profile
 * with completed observations is used. Profiles are never merged, and an
 * ambiguous set of profiles is reported instead of being resolved silently.
 */
export function resolveRecoveryParticipant(dataset: RecoveryDataset, participantId?: string): RecoveryParticipantDataset | null {
  return resolveRecoveryParticipantResolution(dataset, participantId).participant;
}

export function resolveRecoveryParticipantResolution(
  dataset: RecoveryDataset,
  participantId?: string,
): { readonly participant: RecoveryParticipantDataset | null; readonly resolution: RecoveryParticipantResolution } {
  if (participantId) {
    const participant = dataset.participants.find((candidate) => candidate.participantId === participantId) ?? null;
    return participant
      ? { participant, resolution: { status: "resolved", participantId } }
      : {
        participant: null,
        resolution: { status: "not-found", message: `No browser-local participant profile exists for ${participantId}.` },
      };
  }

  const browserProfile = dataset.participants.find((participant) => participant.participantId === BROWSER_PARTICIPANT_ID);
  if (browserProfile) return { participant: browserProfile, resolution: { status: "resolved", participantId: browserProfile.participantId } };

  const observationBearing = dataset.participants.filter((participant) => participant.observations.length > 0);
  if (observationBearing.length === 1) {
    return { participant: observationBearing[0], resolution: { status: "resolved", participantId: observationBearing[0].participantId } };
  }
  if (observationBearing.length > 1) {
    const participantIds = observationBearing.map((participant) => participant.participantId);
    return {
      participant: null,
      resolution: {
        status: "ambiguous",
        participantIds,
        message: `Several browser-local participant profiles contain completed observations (${participantIds.join(", ")}). This research prototype does not merge or manage multiple participant profiles, so no profile is chosen automatically.`,
      },
    };
  }
  if (dataset.participants.length === 1) {
    return { participant: dataset.participants[0], resolution: { status: "resolved", participantId: dataset.participants[0].participantId } };
  }
  if (dataset.participants.length > 1) {
    const participantIds = dataset.participants.map((participant) => participant.participantId);
    return {
      participant: null,
      resolution: {
        status: "ambiguous",
        participantIds,
        message: `Several browser-local participant profiles exist (${participantIds.join(", ")}) and none contains a completed observation. This research prototype does not merge or manage multiple participant profiles.`,
      },
    };
  }
  return {
    participant: null,
    resolution: { status: "empty", message: "This browser profile contains no assessment sessions or check-in records." },
  };
}

export interface RecoveryDashboardModel {
  readonly dataset: RecoveryDataset;
  readonly participant: RecoveryParticipantDataset | null;
  readonly participantResolution: RecoveryParticipantResolution;
  readonly overview: RecoveryOverview;
  readonly current: RecoveryObservation | null;
  readonly currentOptions: readonly RecoveryObservationOption[];
  readonly referenceOptions: readonly RecoveryReferenceOption[];
  readonly referenceMode: RecoveryReferenceMode;
  readonly explicitReferenceSessionId: string | null;
  readonly focusMetric: RecoveryMetric;
  readonly metricViews: readonly RecoveryMetricView[];
  readonly trendSeries: readonly RecoveryTrendSeries[];
  readonly checkIns: readonly RecoveryCheckInHistoryEntry[];
  readonly alignment: RecoveryAlignmentModel | null;
  readonly quality: RecoveryQualityView | null;
}

export function buildRecoveryDashboardModel(dataset: RecoveryDataset, options: RecoveryDashboardOptions = {}): RecoveryDashboardModel {
  const { participant, resolution } = resolveRecoveryParticipantResolution(dataset, options.participantId);
  const overview = buildRecoveryOverview(dataset, participant);
  if (!participant) {
    return {
      dataset,
      participant: null,
      participantResolution: resolution,
      overview,
      current: null,
      currentOptions: [],
      referenceOptions: [],
      referenceMode: "none",
      explicitReferenceSessionId: options.referenceSessionId ?? null,
      focusMetric: defaultFocusMetric(null),
      metricViews: [],
      trendSeries: [],
      checkIns: [],
      alignment: null,
      quality: null,
    };
  }

  const current = participant.observations.find((observation) => observation.sessionId === options.currentSessionId) ?? participant.observations.at(-1) ?? null;
  const referenceSessionId = options.referenceSessionId ?? null;
  const referenceMode: RecoveryReferenceMode = !current
    ? "none"
    : referenceSessionId === current.sessionId
      ? "self-reference-rejected"
      : referenceSessionId
        ? "explicit-override"
        : "metric-specific-default";
  const focusMetric = options.focusMetric ?? defaultFocusMetric(current);
  const metricViews = current ? buildRecoveryMetricViews(dataset, participant, current, referenceSessionId) : [];
  const focusView = metricViews.find((view) => view.metric === focusMetric) ?? metricViews[0] ?? null;

  return {
    dataset,
    participant,
    participantResolution: resolution,
    overview,
    current,
    currentOptions: buildRecoveryObservationOptions(participant),
    referenceOptions: current ? buildRecoveryReferenceOptions(participant, current) : [],
    referenceMode,
    explicitReferenceSessionId: referenceSessionId,
    focusMetric,
    metricViews,
    trendSeries: RECOVERY_METRICS.map((metric) => buildRecoveryTrendSeries(participant, metric)),
    checkIns: buildRecoveryCheckInHistory(participant),
    alignment: current && focusView ? buildRecoveryAlignment(participant, current, focusView) : null,
    quality: current ? buildRecoveryQualityView(current) : null,
  };
}

const PREFERRED_FOCUS_METRICS: readonly RecoveryMetric[] = [
  "directional-error-mean",
  "adaptation-change",
  "reaction-time-mean",
  "movement-time-mean",
  "washout-aftereffect",
  "trajectory-deviation-mean",
  "correction-count-mean",
  "peak-velocity-time-mean",
];

export function defaultFocusMetric(current: RecoveryObservation | null): RecoveryMetric {
  if (!current) return PREFERRED_FOCUS_METRICS[0];
  return PREFERRED_FOCUS_METRICS.find((metric) => {
    const value = findRecoveryMetric(current, metric);
    return Boolean(value?.eligible && value.value !== null);
  }) ?? RECOVERY_METRICS[0];
}

function protocolsAreCompatible(current: RecoveryObservation, candidate: RecoveryObservation): boolean {
  return current.measurementProtocolVersion !== null
    && current.measurementProtocolVersion === candidate.measurementProtocolVersion
    && current.assessmentProtocolVersion === candidate.assessmentProtocolVersion;
}

function incompatibleProtocolExplanation(current: RecoveryObservation, candidate: RecoveryObservation): string {
  if (current.measurementProtocolVersion === null) {
    return "The current observation has no single known measurement protocol, so no protocol-compatible reference can be confirmed.";
  }
  if (candidate.measurementProtocolVersion === null) {
    return `This session has no single known measurement protocol, so it cannot be compared with the current observation (${measurementProtocolShortLabel(current.measurementProtocolVersion)}).`;
  }
  if (current.measurementProtocolVersion !== candidate.measurementProtocolVersion) {
    return `This session uses ${measurementProtocolShortLabel(candidate.measurementProtocolVersion)}, but the current observation uses ${measurementProtocolShortLabel(current.measurementProtocolVersion)}. Measurement protocols are never pooled for a comparison.`;
  }
  return `This session's assessment protocol (${candidate.assessmentProtocolVersion || "missing"}) differs from the current observation's (${current.assessmentProtocolVersion || "missing"}). The comparison is unavailable.`;
}

const NUMERICAL_ZERO_EPSILON = 1e-9;

function mathematicalDirection(value: number): -1 | 0 | 1 {
  if (Math.abs(value) < NUMERICAL_ZERO_EPSILON) return 0;
  return value > 0 ? 1 : -1;
}
