import { findRecoveryMetric, RECOVERY_METRICS, recoveryMetricUnit } from "@/lib/analytics/recovery";
import type {
  MetricDelta,
  PersonalReferenceSession,
  RecoveryDataset,
  RecoveryMetric,
  RecoveryMetricValue,
  RecoveryObservation,
  RecoveryParticipantDataset,
} from "@/types/recovery";
import type { MeasurementProtocolVersion } from "@/types/trial";

export type ReferenceSelectionFailureReason =
  | "no-participant"
  | "participant-required"
  | "participant-not-found"
  | "no-completed-sessions"
  | "no-eligible-session-for-metric"
  | "session-not-found"
  | "participant-mismatch"
  | "metric-not-eligible"
  | "incompatible-protocol";

export type PersonalReferenceSelection =
  | { readonly ok: true; readonly reference: PersonalReferenceSession }
  | { readonly ok: false; readonly reason: ReferenceSelectionFailureReason; readonly message: string };

export interface ReferenceSelectionOptions {
  /** Required when the local dataset contains more than one participant profile. */
  readonly participantId?: string;
  readonly metric: RecoveryMetric;
  /** Explicit override. It is validated; it is never silently replaced. */
  readonly referenceSessionId?: string;
  /** Default selection normally excludes the current observation from being its own reference. */
  readonly excludeSessionId?: string;
  /** Comparison protocol gate, normally the current observation's measurement version. */
  readonly requiredMeasurementProtocolVersion?: MeasurementProtocolVersion;
}

/**
 * Selects an explicit personal reference session for one metric. The default is
 * the earliest eligible completed observation, never the best or most recent.
 * A session may be eligible for timing metrics but not origin-sensitive ones.
 */
export function selectPersonalReferenceSession(dataset: RecoveryDataset, options: ReferenceSelectionOptions): PersonalReferenceSelection {
  const participantResult = resolveParticipant(dataset, options.participantId);
  if (!participantResult.ok) return participantResult;
  const participant = participantResult.participant;

  if (options.referenceSessionId) {
    const owner = findObservationOwner(dataset, options.referenceSessionId);
    if (!owner) return failure("session-not-found", `No completed recovery observation exists for assessment session ${options.referenceSessionId}.`);
    if (owner.participant.participantId !== participant.participantId) {
      return failure("participant-mismatch", "The requested reference session belongs to a different browser-local participant profile.");
    }
    const ineligible = ineligibilityForMetric(owner.observation, options.metric);
    if (ineligible) return failure("metric-not-eligible", ineligible);
    if (options.requiredMeasurementProtocolVersion && owner.observation.measurementProtocolVersion !== options.requiredMeasurementProtocolVersion) {
      return failure("incompatible-protocol", incompatibleProtocolMessage(owner.observation, options.requiredMeasurementProtocolVersion));
    }
    return { ok: true, reference: referenceFor(owner.observation, "explicit-override") };
  }

  if (participant.observations.length === 0) return failure("no-completed-sessions", "The browser-local participant profile has no completed assessment observations.");

  const metricEligible = participant.observations.filter((observation) => observation.sessionId !== options.excludeSessionId && isEligibleForMetric(observation, options.metric));
  const compatible = options.requiredMeasurementProtocolVersion
    ? metricEligible.filter((observation) => observation.measurementProtocolVersion === options.requiredMeasurementProtocolVersion)
    : metricEligible;

  const earliest = [...compatible].sort(compareObservationTimestamps)[0];
  if (earliest) return { ok: true, reference: referenceFor(earliest, "default-earliest-eligible") };

  if (options.requiredMeasurementProtocolVersion && metricEligible.length > 0) {
    return failure("incompatible-protocol", `No earlier eligible session shares the required measurement protocol ${options.requiredMeasurementProtocolVersion}.`);
  }
  return failure("no-eligible-session-for-metric", `No completed observation is eligible for ${options.metric}. A completed session is not automatically a valid reference session.`);
}

/**
 * Compares one metric against an explicitly supplied personal reference
 * observation. `change` is `currentValue - referenceValue`; the sign is retained
 * without an improvement/deterioration label.
 */
export function calculateMetricDelta(current: RecoveryObservation, reference: RecoveryObservation, metric: RecoveryMetric): MetricDelta {
  const currentMetric = findRecoveryMetric(current, metric);
  const referenceMetric = findRecoveryMetric(reference, metric);
  const unit = currentMetric?.unit ?? referenceMetric?.unit ?? recoveryMetricUnit(metric);
  const explanation = deltaUnavailableReason(current, reference, metric, currentMetric, referenceMetric);
  const currentValue = currentMetric?.value ?? null;
  const referenceValue = referenceMetric?.value ?? null;
  const change = explanation === null && currentValue !== null && referenceValue !== null ? currentValue - referenceValue : null;
  const finalExplanation = explanation === null && (change === null || !Number.isFinite(change))
    ? "The computed change is not a finite number and is therefore unavailable."
    : explanation;
  const comparisonValid = finalExplanation === null;
  const protocolsMatch = current.measurementProtocolVersion !== null && current.measurementProtocolVersion === reference.measurementProtocolVersion;

  return {
    metric,
    unit,
    participantId: current.participantId,
    referenceSessionId: reference.sessionId,
    currentSessionId: current.sessionId,
    referenceValue,
    currentValue,
    change: comparisonValid ? change : null,
    changeFormula: "currentValue - referenceValue",
    comparisonValid,
    measurementVersion: protocolsMatch ? current.measurementProtocolVersion : null,
    referenceMeasurementVersion: reference.measurementProtocolVersion,
    currentMeasurementVersion: current.measurementProtocolVersion,
    referenceEligibleTrialCount: referenceMetric?.eligibleTrialCount ?? 0,
    referenceTotalTrialCount: referenceMetric?.totalTrialCount ?? 0,
    currentEligibleTrialCount: currentMetric?.eligibleTrialCount ?? 0,
    currentTotalTrialCount: currentMetric?.totalTrialCount ?? 0,
    explanation: finalExplanation,
    interpretation: "descriptive-only-not-clinical-recovery",
  };
}

export function calculateRecoveryDeltas(current: RecoveryObservation, reference: RecoveryObservation): readonly MetricDelta[] {
  return RECOVERY_METRICS.map((metric) => calculateMetricDelta(current, reference, metric));
}

function deltaUnavailableReason(
  current: RecoveryObservation,
  reference: RecoveryObservation,
  metric: RecoveryMetric,
  currentMetric: RecoveryMetricValue | null,
  referenceMetric: RecoveryMetricValue | null,
): string | null {
  if (current.participantId !== reference.participantId) return "The current and reference observations belong to different browser-local participant profiles.";
  if (!currentMetric) return `The current observation does not expose ${metric}.`;
  if (!referenceMetric) return `The reference observation does not expose ${metric}.`;
  if (!referenceMetric.eligible || referenceMetric.value === null) return `Reference value is unavailable for ${metric}: ${referenceMetric.explanation ?? "No eligible value."}`;
  if (!currentMetric.eligible || currentMetric.value === null) return `Current value is unavailable for ${metric}: ${currentMetric.explanation ?? "No eligible value."}`;
  if (current.measurementProtocolVersion === null || reference.measurementProtocolVersion === null) {
    return `Both observations must expose a known measurement protocol version before ${metric} can be compared.`;
  }
  if (current.measurementProtocolVersion !== reference.measurementProtocolVersion) {
    return `Measurement protocol versions ${current.measurementProtocolVersion} and ${reference.measurementProtocolVersion} differ. v0.2.0 and v0.3.0 records are never pooled.`;
  }
  if (current.assessmentProtocolVersion !== reference.assessmentProtocolVersion) {
    return `Assessment protocol versions ${current.assessmentProtocolVersion || "(missing)"} and ${reference.assessmentProtocolVersion || "(missing)"} differ; this comparison is unavailable.`;
  }
  return null;
}

function resolveParticipant(dataset: RecoveryDataset, participantId: string | undefined): { readonly ok: true; readonly participant: RecoveryParticipantDataset } | { readonly ok: false; readonly reason: ReferenceSelectionFailureReason; readonly message: string } {
  if (participantId) {
    const participant = dataset.participants.find((candidate) => candidate.participantId === participantId);
    return participant
      ? { ok: true, participant }
      : { ok: false, reason: "participant-not-found", message: `No browser-local participant profile exists for ${participantId}.` };
  }
  if (dataset.participants.length === 1) return { ok: true, participant: dataset.participants[0] };
  if (dataset.participants.length === 0) return { ok: false, reason: "no-participant", message: "No browser-local participant profile has any recovery observations." };
  return { ok: false, reason: "participant-required", message: "More than one browser-local participant profile is present; an explicit participant ID is required." };
}

function findObservationOwner(dataset: RecoveryDataset, sessionId: string): { readonly participant: RecoveryParticipantDataset; readonly observation: RecoveryObservation } | null {
  for (const participant of dataset.participants) {
    const observation = participant.observations.find((candidate) => candidate.sessionId === sessionId);
    if (observation) return { participant, observation };
  }
  return null;
}

function isEligibleForMetric(observation: RecoveryObservation, metric: RecoveryMetric): boolean {
  const value = findRecoveryMetric(observation, metric);
  return Boolean(value && value.eligible && value.value !== null);
}

function ineligibilityForMetric(observation: RecoveryObservation, metric: RecoveryMetric): string | null {
  const value = findRecoveryMetric(observation, metric);
  if (!value) return `The observation does not expose ${metric}.`;
  if (!value.eligible || value.value === null) return value.explanation ?? `The observation is not eligible for ${metric}.`;
  return null;
}

function incompatibleProtocolMessage(observation: RecoveryObservation, required: MeasurementProtocolVersion): string {
  return `The requested reference session uses ${observation.measurementProtocolVersion ?? "an unknown measurement protocol"}, but ${required} is required for this comparison.`;
}

function referenceFor(observation: RecoveryObservation, selection: PersonalReferenceSession["selection"]): PersonalReferenceSession {
  return {
    participantId: observation.participantId,
    sessionId: observation.sessionId,
    completedAt: observation.completedAt,
    selection,
    assessmentProtocolVersion: observation.assessmentProtocolVersion,
    measurementProtocolVersion: observation.measurementProtocolVersion,
    measurementValidity: observation.measurementValidity,
    observation,
    interpretation: "personal-reference-not-clinical-baseline",
  };
}

function compareObservationTimestamps(left: RecoveryObservation, right: RecoveryObservation): number {
  const leftTime = Date.parse(left.completedAt);
  const rightTime = Date.parse(right.completedAt);
  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return left.sessionId.localeCompare(right.sessionId);
  if (!Number.isFinite(leftTime)) return 1;
  if (!Number.isFinite(rightTime)) return -1;
  return leftTime - rightTime || left.sessionId.localeCompare(right.sessionId);
}

function failure(reason: ReferenceSelectionFailureReason, message: string): PersonalReferenceSelection {
  return { ok: false, reason, message };
}
