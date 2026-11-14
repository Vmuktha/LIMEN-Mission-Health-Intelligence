/**
 * Explicitly recorded mission transitions and the Mission Transition Review.
 *
 * A transition is a source record: the user states which phase they moved from
 * and which phase they moved to. It is never inferred from a timestamp, a date,
 * or the passage of time.
 *
 * The Mission Transition Review is a derived organisation of existing records.
 * It is assembled on demand and is not persisted as a second source of truth.
 */

import type { MissionPhase } from "./mission";

export type MissionTransitionSource = "manual-entry" | "simulated-demo";
export type MissionTransitionProvenance = "browser-user-generated" | "simulated-demo";

/** A transition the user explicitly recorded. */
export interface MissionTransition {
  readonly id: string;
  readonly missionContextId: string;
  readonly missionId: string;
  readonly previousPhase: MissionPhase;
  readonly currentPhase: MissionPhase;
  readonly previousCustomPhaseLabel?: string;
  readonly currentCustomPhaseLabel?: string;
  /** When the user says the transition occurred. */
  readonly occurredAt: string;
  /** When the transition was recorded. */
  readonly recordedAt: string;
  readonly note?: string;
  readonly source: MissionTransitionSource;
  readonly provenance: MissionTransitionProvenance;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly interpretation: "explicitly-recorded-mission-transition-not-inferred";
}

export interface MissionTransitionDraft {
  readonly id: string;
  readonly missionContextId: string;
  readonly missionId: string;
  readonly previousPhase: MissionPhase;
  readonly currentPhase: MissionPhase;
  readonly previousCustomPhaseLabel?: string;
  readonly currentCustomPhaseLabel?: string;
  readonly occurredAt: string;
  readonly note?: string;
  readonly source: MissionTransitionSource;
  readonly provenance: MissionTransitionProvenance;
  readonly recordedAt?: string;
}

export interface MissionTransitionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/* ── Mission Transition Review ──────────────────────────────────────────── */

export type TransitionReviewCategory = "observed" | "reported" | "measured" | "compared" | "unavailable" | "follow-up";

export type TransitionRecordKind =
  | "mission-context"
  | "mission-transition"
  | "mission-event"
  | "check-in"
  | "assessment-session"
  | "follow-up"
  | "evidence-record";

/** Every included record states where it came from. */
export interface TransitionReviewSourceRef {
  readonly kind: TransitionRecordKind;
  readonly id: string;
  readonly source: string;
  readonly provenance: string;
  readonly recordedAt: string | null;
}

export interface TransitionReviewObservedItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly occurredAt: string | null;
  readonly phaseLabel: string | null;
  readonly phaseBasis: "explicit-event-phase" | "explicit-transition-phase" | "not-recorded";
  readonly source: TransitionReviewSourceRef;
}

export type TransitionCheckInLinkBasis =
  | "explicit-mission-context"
  | "explicit-phase-match"
  | "explicit-session-link";

export interface TransitionReviewReportedItem {
  readonly id: string;
  readonly recordedAt: string;
  readonly context: string;
  readonly missionPhaseLabel: string | null;
  readonly linkBasis: TransitionCheckInLinkBasis;
  readonly linkExplanation: string;
  readonly assessmentSessionId: string | null;
  readonly answeredFields: number;
  readonly totalFields: number;
  readonly hasFreeTextNote: boolean;
  readonly source: TransitionReviewSourceRef;
}

export interface TransitionReviewMeasuredItem {
  readonly sessionId: string;
  readonly completedAt: string;
  readonly assessmentProtocolVersion: string;
  readonly measurementProtocolVersion: string | null;
  readonly measurementValidity: string;
  readonly eligibleMetricCount: number;
  readonly totalMetricCount: number;
  readonly linkBasis: TransitionCheckInLinkBasis;
  readonly linkExplanation: string;
  readonly source: TransitionReviewSourceRef;
}

export interface TransitionReviewComparedItem {
  readonly id: string;
  readonly currentSessionId: string;
  readonly referenceSessionId: string;
  readonly protocolCompatible: boolean;
  readonly protocolExplanation: string | null;
  readonly currentCheckInId: string | null;
  readonly referenceCheckInId: string | null;
  readonly availableMetricCount: number;
  readonly unavailableMetricCount: number;
  readonly selfReportAvailableCount: number;
  readonly coOccurrenceCount: number;
  readonly divergenceCount: number;
  readonly noObservedChangeCount: number;
  readonly unavailableLinkCount: number;
  readonly source: TransitionReviewSourceRef;
}

export interface TransitionReviewUnavailableItem {
  readonly id: string;
  readonly category: string;
  readonly expected: string;
  readonly explanation: string;
}

export interface TransitionReviewFollowUpItem {
  readonly id: string;
  readonly status: string;
  readonly reason: string;
  readonly dueDate: string | null;
  readonly relatedKind: string;
  readonly relatedId: string;
  readonly referralRequested: boolean;
  readonly updatedAt: string;
  readonly noteCount: number;
  readonly source: TransitionReviewSourceRef;
}

export interface TransitionReviewEvidenceItem {
  readonly id: string;
  readonly title: string;
  readonly evidenceKind: string;
  readonly availability: string;
  readonly studyDesign: string;
  readonly sampleSize: number | null;
  readonly limitations: readonly string[];
  readonly officialUrl: string | null;
  readonly association: "external-research-evidence-not-a-mission-measurement";
}

export interface MissionTransitionReview {
  readonly transition: MissionTransition;
  readonly contextId: string | null;
  readonly contextName: string | null;
  readonly previousPhaseLabel: string;
  readonly currentPhaseLabel: string;
  readonly generatedAt: string;
  readonly observed: readonly TransitionReviewObservedItem[];
  readonly reported: readonly TransitionReviewReportedItem[];
  readonly measured: readonly TransitionReviewMeasuredItem[];
  readonly compared: readonly TransitionReviewComparedItem[];
  readonly unavailable: readonly TransitionReviewUnavailableItem[];
  readonly followUp: readonly TransitionReviewFollowUpItem[];
  readonly evidence: readonly TransitionReviewEvidenceItem[];
  readonly sourceIdentifiers: readonly string[];
  readonly limitations: readonly string[];
  readonly interpretation: "descriptive-organisation-not-health-score-not-causal";
}
