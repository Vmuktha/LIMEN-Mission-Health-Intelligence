/**
 * Signal Concordance contracts.
 *
 * The engine compares explicitly linked observations. It never infers a link
 * from timestamp proximity, never pools protocol versions, and never produces a
 * composite score or causal statement.
 */

import type { MissionPhase } from "./mission";
import type { ExtendedCheckInScoreField, SymptomCheckInRecord } from "./checkin";
import type { RecoveryMetric, RecoveryMetricUnit, RecoveryObservation, RecoveryParticipantDataset } from "./recovery";
import type { MissionContext } from "./mission-context";

export type ConcordancePerformanceMetric =
  | "movement-time-mean"
  | "directional-error-mean"
  | "adaptation-change"
  | "washout-aftereffect";

export const CONCORDANCE_PERFORMANCE_METRICS: readonly ConcordancePerformanceMetric[] = [
  "movement-time-mean",
  "directional-error-mean",
  "adaptation-change",
  "washout-aftereffect",
];

export type ConcordanceAvailability =
  | "available"
  | "insufficient-reference"
  | "incompatible-protocol"
  | "missing-data"
  | "not-explicitly-linked"
  | "self-reference-rejected";

export type ConcordanceDirection = "increased" | "decreased" | "no-observed-change" | "unavailable";

export type ConcordanceSignConvention = "positive-clockwise" | "positive-is-longer" | "not-applicable";

export type ConcordanceMetricPolarity = "higher-is-better" | "higher-is-worse" | "no-inherent-valence";

export type ConcordanceLinkClassification = "co-occurrence" | "divergence" | "no-observed-change" | "unavailable";

export type ConcordanceTemporalRelation = "recorded-before-session" | "recorded-after-session" | "same-timestamp" | "unknown";

export interface ConcordanceObservationRef {
  readonly sessionId: string;
  readonly participantId: string;
  readonly completedAt: string;
  readonly assessmentProtocolVersion: string;
  readonly measurementProtocolVersion: string | null;
}

export interface ConcordanceProtocolStatus {
  readonly compatible: boolean;
  readonly sourceAssessmentProtocol: string;
  readonly referenceAssessmentProtocol: string;
  readonly sourceMeasurementProtocol: string | null;
  readonly referenceMeasurementProtocol: string | null;
  readonly explanation: string | null;
}

export interface ConcordancePerformanceComparison {
  readonly metric: ConcordancePerformanceMetric;
  readonly label: string;
  readonly definition: string;
  readonly unit: RecoveryMetricUnit;
  readonly signConvention: ConcordanceSignConvention;
  readonly polarity: ConcordanceMetricPolarity;
  readonly source: ConcordanceObservationRef;
  readonly reference: ConcordanceObservationRef;
  readonly sourceValue: number | null;
  readonly referenceValue: number | null;
  readonly change: number | null;
  readonly changeFormula: "currentValue - referenceValue";
  readonly direction: ConcordanceDirection;
  readonly availability: ConcordanceAvailability;
  readonly protocolCompatibility: ConcordanceProtocolStatus;
  readonly method: "identical-protocol-current-minus-reference";
  readonly missingDataStatus: "none" | "missing" | "insufficient-reference" | "protocol-incompatible" | "explicit-link-missing";
  readonly missingDataExplanation: string | null;
  readonly interpretationLimit: string;
}

export interface ConcordanceCheckInRef {
  readonly checkInId: string;
  readonly recordedAt: string;
  readonly context: "pre-assessment" | "post-assessment" | "general";
  readonly associationSource: "explicit-assessment-session-identifier";
  readonly temporalRelation: ConcordanceTemporalRelation;
  readonly missionPhase: MissionPhase | null;
}

export interface ConcordanceSelfReportComparison {
  readonly field: ExtendedCheckInScoreField;
  readonly label: string;
  readonly scale: string;
  readonly polarity: ConcordanceMetricPolarity;
  readonly construct: string;
  readonly sourceCheckIn: ConcordanceCheckInRef | null;
  readonly referenceCheckIn: ConcordanceCheckInRef | null;
  readonly sourceValue: number | null;
  readonly referenceValue: number | null;
  readonly change: number | null;
  readonly changeFormula: "currentValue - referenceValue";
  readonly direction: ConcordanceDirection;
  readonly availability: ConcordanceAvailability;
  readonly explanation: string | null;
  readonly interpretationLimit: string;
}

export interface ConcordanceLink {
  readonly metric: ConcordancePerformanceMetric;
  readonly field: ExtendedCheckInScoreField;
  readonly classification: ConcordanceLinkClassification;
  readonly performanceChange: number | null;
  readonly selfReportChange: number | null;
  readonly explanation: string;
  readonly interpretation: "direction-only-co-observation-not-causal";
}

export type ConcordanceMissionPhaseRelation = "same-phase" | "different-phase" | "unknown" | "conflicting-explicit-records";

export interface ConcordanceMissionPhaseContext {
  readonly currentPhase: MissionPhase | null;
  readonly referencePhase: MissionPhase | null;
  readonly currentPhaseSource: "explicit-check-in" | "explicit-mission-context" | "not-recorded";
  readonly referencePhaseSource: "explicit-check-in" | "not-recorded";
  readonly relation: ConcordanceMissionPhaseRelation;
  readonly explanation: string;
}

export interface SignalConcordanceInput {
  readonly participant: RecoveryParticipantDataset;
  readonly currentSessionId: string;
  readonly referenceSessionId: string;
  /** Stored check-ins, including Stage 4 items. Never inferred from timestamps. */
  readonly checkIns: readonly SymptomCheckInRecord[];
  /** Explicit only. Omit to leave self-report comparison unavailable. */
  readonly currentCheckInId?: string;
  readonly referenceCheckInId?: string;
  /** Explicit, already-recorded mission context. Never inferred from timestamps. */
  readonly missionContext?: MissionContext | null;
}

export interface SignalConcordanceResult {
  readonly participantId: string;
  readonly current: ConcordanceObservationRef;
  readonly reference: ConcordanceObservationRef;
  readonly protocol: ConcordanceProtocolStatus;
  readonly missionPhaseContext: ConcordanceMissionPhaseContext;
  readonly performanceComparisons: readonly ConcordancePerformanceComparison[];
  readonly selfReportComparisons: readonly ConcordanceSelfReportComparison[];
  readonly links: readonly ConcordanceLink[];
  readonly interpretation: "descriptive-co-observation-not-causal-not-diagnostic";
  readonly limitations: readonly string[];
}

/** Inputs are accepted as stored observations; the engine never mutates them. */
export type ConcordanceObservationSource = RecoveryObservation;
export type ConcordancePerformanceMetricName = Extract<RecoveryMetric, ConcordancePerformanceMetric>;
