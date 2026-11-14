import type { AssessmentCondition, InputDevice } from "./assessment";
import type { CheckInContext, CheckInScoreField, SelfReportedScore } from "./checkin";
import type { MissionPhase } from "./mission";
import type { MeasurementProtocolVersion } from "./trial";
import type { MeasurementValidity, TrialMeasurementProtocolKey } from "@/lib/assessment/measurement-validity";

/**
 * Recovery metrics keep their source metric identity. They are descriptive
 * within-person summaries, never a composite readiness or recovery score.
 */
export type RecoveryMetric =
  | "reaction-time-mean"
  | "movement-time-mean"
  | "directional-error-mean"
  | "trajectory-deviation-mean"
  | "correction-count-mean"
  | "peak-velocity-time-mean"
  | "adaptation-change"
  | "washout-aftereffect";

export type RecoveryMetricUnit = "milliseconds" | "degrees" | "css-pixels" | "count";

export interface RecoveryMetricValue {
  readonly metric: RecoveryMetric;
  readonly value: number | null;
  readonly unit: RecoveryMetricUnit;
  /** True only when a finite value was derived from at least one eligible trial. */
  readonly eligible: boolean;
  readonly eligibleTrialCount: number;
  /** Total recorded trials in the session, including trials excluded from this metric. */
  readonly totalTrialCount: number;
  readonly measurementProtocolVersion: MeasurementProtocolVersion | null;
  readonly measurementVersions: readonly TrialMeasurementProtocolKey[];
  readonly explanation: string | null;
  readonly signConvention?: "positive-clockwise";
}

export interface RecoveryMetricUnavailability {
  readonly metric: RecoveryMetric;
  readonly reason: string;
}

/** Metric-specific eligibility; a session may be usable for some metrics only. */
export interface RecoveryEligibility {
  readonly measurementValidity: MeasurementValidity;
  readonly timingMetricsEligible: boolean;
  readonly originSensitiveMetricsEligible: boolean;
  readonly eligibleMetrics: readonly RecoveryMetric[];
  readonly unavailableMetrics: readonly RecoveryMetricUnavailability[];
}

export type RecoveryDataIssueCode =
  | "malformed-trial"
  | "non-finite-value"
  | "non-finite-timestamp"
  | "trial-session-id-mismatch"
  | "missing-trial-field"
  | "unknown-measurement-protocol"
  | "mixed-measurement-protocols"
  | "inconsistent-origin-provenance"
  | "inconsistent-session-protocol"
  | "legacy-origin-unverified"
  | "no-trials"
  | "no-eligible-trial-values"
  | "invalid-session-record"
  | "invalid-checkin-record";

export interface RecoveryDataIssue {
  readonly code: RecoveryDataIssueCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly trialId?: string;
}

/**
 * Reliability information for one assessment observation. A completed session
 * is not automatically a valid comparison source.
 */
export interface RecoveryDataQuality {
  readonly valid: boolean;
  readonly totalTrials: number;
  readonly completedTrials: number;
  readonly invalidTrials: number;
  readonly timedOutTrials: number;
  readonly abortedTrials: number;
  readonly nonFiniteTrialCount: number;
  readonly sessionIdMismatchCount: number;
  readonly issues: readonly RecoveryDataIssue[];
  readonly missingDataExplanations: readonly string[];
}

export type RecoveryCheckInScoreField = CheckInScoreField;

/** Omitted self-report answers stay null; they are never converted to zero. */
export type RecoveryCheckInScores = Readonly<Record<RecoveryCheckInScoreField, SelfReportedScore | null>>;

/**
 * A check-in is associated only through an explicit assessment-session
 * identifier. Timestamp proximity is never used to infer a relationship.
 */
export interface CheckInAssociation {
  readonly checkInId: string;
  readonly assessmentSessionId: string;
  readonly context: CheckInContext;
  readonly recordedAt: string;
  readonly missionPhase?: MissionPhase;
  readonly scores: RecoveryCheckInScores;
  readonly freeTextNote?: string;
  readonly provenance: "browser-user-generated";
  readonly interpretation: "self-report-not-an-objective-vestibular-measurement";
  readonly associationSource: "explicit-assessment-session-identifier";
}

export type CheckInLinkState =
  | "associated-with-completed-session"
  | "no-explicit-session-identifier"
  | "session-not-found"
  | "session-not-completed"
  | "participant-mismatch";

export interface RecoveryCheckInObservation {
  readonly checkInId: string;
  readonly participantId: string;
  readonly recordedAt: string;
  readonly context: CheckInContext;
  readonly missionPhase?: MissionPhase;
  readonly scores: RecoveryCheckInScores;
  readonly freeTextNote?: string;
  readonly provenance: "browser-user-generated";
  readonly interpretation: "self-report-not-an-objective-vestibular-measurement";
  readonly linkState: CheckInLinkState;
  readonly assessmentSessionId?: string;
  readonly association: CheckInAssociation | null;
  readonly associationExplanation: string | null;
}

/** One completed assessment session, recomputed from raw trials at analysis time. */
export interface RecoveryObservation {
  readonly sessionId: string;
  readonly participantId: string;
  readonly createdAt: string;
  readonly completedAt: string;
  readonly status: "completed";
  readonly assessmentProtocolVersion: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion | null;
  readonly measurementVersions: readonly TrialMeasurementProtocolKey[];
  readonly inputDevice: InputDevice;
  readonly conditions: readonly AssessmentCondition[];
  readonly measurementValidity: MeasurementValidity;
  readonly eligibility: RecoveryEligibility;
  readonly dataQuality: RecoveryDataQuality;
  readonly metrics: readonly RecoveryMetricValue[];
  readonly checkIns: readonly CheckInAssociation[];
  readonly provenance: "browser-user-generated";
  readonly simulated: false;
  readonly interpretation: "descriptive-only-not-clinical-recovery";
}

export interface RecoveryParticipantDataset {
  readonly participantId: string;
  /** One browser-local profile; this is not a verified human identity. */
  readonly profileKind: "browser-local-participant-profile";
  readonly observations: readonly RecoveryObservation[];
  readonly checkIns: readonly RecoveryCheckInObservation[];
  readonly unassociatedCheckIns: readonly RecoveryCheckInObservation[];
}

export type RecoveryExcludedSessionReason =
  | "not-completed"
  | "missing-completion-timestamp"
  | "invalid-completion-timestamp";

export interface RecoveryExcludedSession {
  readonly sessionId: string;
  readonly participantId: string;
  readonly status: string;
  readonly completedAt: string | null;
  readonly reason: RecoveryExcludedSessionReason;
  readonly explanation: string;
}

export interface RecoveryRejectedRecord {
  readonly kind: "assessment-session" | "check-in";
  readonly recordId: string | null;
  readonly reason: string;
}

export interface RecoveryDataset {
  readonly profileKind: "browser-local-participant-profile";
  readonly participants: readonly RecoveryParticipantDataset[];
  readonly rejectedRecords: readonly RecoveryRejectedRecord[];
  readonly excludedSessions: readonly RecoveryExcludedSession[];
  readonly loadedSessionCount: number;
  readonly loadedCheckInCount: number;
  readonly interpretation: "descriptive-only-not-clinical-recovery";
}

export type ReferenceSelectionSource = "default-earliest-eligible" | "explicit-override";

/**
 * An explicit within-person comparison reference. It is not a clinical
 * baseline and carries no expectation that earlier means "healthy".
 */
export interface PersonalReferenceSession {
  readonly participantId: string;
  readonly sessionId: string;
  readonly completedAt: string;
  readonly selection: ReferenceSelectionSource;
  readonly assessmentProtocolVersion: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion | null;
  readonly measurementValidity: MeasurementValidity;
  readonly observation: RecoveryObservation;
  readonly interpretation: "personal-reference-not-clinical-baseline";
}

/**
 * Signed change is always `currentValue - referenceValue`. Direction is not
 * labelled as improvement or deterioration because that depends on the metric.
 */
export interface MetricDelta {
  readonly metric: RecoveryMetric;
  readonly unit: RecoveryMetricUnit;
  readonly participantId: string;
  readonly referenceSessionId: string;
  readonly currentSessionId: string;
  readonly referenceValue: number | null;
  readonly currentValue: number | null;
  readonly change: number | null;
  readonly changeFormula: "currentValue - referenceValue";
  readonly comparisonValid: boolean;
  readonly measurementVersion: MeasurementProtocolVersion | null;
  readonly referenceMeasurementVersion: MeasurementProtocolVersion | null;
  readonly currentMeasurementVersion: MeasurementProtocolVersion | null;
  readonly referenceEligibleTrialCount: number;
  readonly referenceTotalTrialCount: number;
  readonly currentEligibleTrialCount: number;
  readonly currentTotalTrialCount: number;
  readonly explanation: string | null;
  readonly interpretation: "descriptive-only-not-clinical-recovery";
}
