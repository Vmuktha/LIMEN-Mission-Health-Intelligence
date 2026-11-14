/**
 * Signal Concordance: a transparent comparison of explicitly linked records.
 *
 * Boundaries:
 * - a check-in is used only when its ID is supplied AND its stored
 *   `assessmentSessionId` points at the session being compared;
 * - v0.2.0 and v0.3.0 are never pooled;
 * - missing values stay missing;
 * - no composite score, diagnosis, prediction, or causal claim is produced;
 * - same-sign co-observation is a mathematical direction, not agreement in
 *   valence when the two measures have different polarity.
 */

import { EXTENDED_CHECK_IN_FIELDS, checkInFieldDefinition } from "@/lib/checkin/record";
import { findRecoveryMetric } from "@/lib/analytics/recovery";
import type { SymptomCheckInRecord } from "@/types/checkin";
import type {
  ConcordanceAvailability,
  ConcordanceCheckInRef,
  ConcordanceDirection,
  ConcordanceLink,
  ConcordanceLinkClassification,
  ConcordanceMissionPhaseContext,
  ConcordancePerformanceComparison,
  ConcordancePerformanceMetric,
  ConcordanceProtocolStatus,
  ConcordanceSelfReportComparison,
  ConcordanceTemporalRelation,
  SignalConcordanceInput,
  SignalConcordanceResult,
} from "@/types/concordance";
import type { MissionPhase } from "@/types/mission";
import type { RecoveryObservation } from "@/types/recovery";

const EPSILON = 1e-9;

interface MetricDefinition {
  readonly label: string;
  readonly definition: string;
  readonly unit: "milliseconds" | "degrees";
  readonly signConvention: "positive-clockwise" | "positive-is-longer";
}

const METRIC_DEFINITIONS: Readonly<Record<ConcordancePerformanceMetric, MetricDefinition>> = {
  "movement-time-mean": {
    label: "Movement time",
    definition: "Arithmetic mean of eligible trial movement times.",
    unit: "milliseconds",
    signConvention: "positive-is-longer",
  },
  "directional-error-mean": {
    label: "Directional error",
    definition: "Arithmetic mean of eligible signed trial directional errors.",
    unit: "degrees",
    signConvention: "positive-clockwise",
  },
  "adaptation-change": {
    label: "Adaptation change",
    definition: "Late-adaptation mean directional error minus early-adaptation mean directional error.",
    unit: "degrees",
    signConvention: "positive-clockwise",
  },
  "washout-aftereffect": {
    label: "Washout aftereffect",
    definition: "Initial washout mean directional error minus baseline mean directional error.",
    unit: "degrees",
    signConvention: "positive-clockwise",
  },
};

const PERFORMANCE_LIMITATION = "A signed change is descriptive for this metric only. It is not an improvement, deterioration, diagnosis, or prediction.";
const SELF_REPORT_LIMITATION = "A self-report change is subjective and is not an objective sensor, vestibular, neurological, or clinical measurement.";

type CheckInResolution =
  | { readonly status: "valid"; readonly record: SymptomCheckInRecord; readonly ref: ConcordanceCheckInRef }
  | { readonly status: "not-supplied" | "not-found" | "participant-mismatch" | "different-session"; readonly explanation: string };

/**
 * Builds the concordance result. Callers must provide explicit session and
 * check-in identifiers; anything else stays unavailable.
 */
export function buildSignalConcordance(input: SignalConcordanceInput): SignalConcordanceResult {
  const current = findObservation(input, input.currentSessionId);
  const reference = findObservation(input, input.referenceSessionId);
  const protocol = compareProtocols(current, reference);
  const currentCheckIn = resolveCheckIn(input, input.currentCheckInId, input.currentSessionId, current);
  const referenceCheckIn = resolveCheckIn(input, input.referenceCheckInId, input.referenceSessionId, reference);
  const selfReference = current.sessionId === reference.sessionId;

  const performanceComparisons = (Object.keys(METRIC_DEFINITIONS) as ConcordancePerformanceMetric[]).map((metric) =>
    comparePerformanceMetric(metric, current, reference, protocol, selfReference),
  );
  const selfReportComparisons = EXTENDED_CHECK_IN_FIELDS.map((definition) =>
    compareSelfReport(definition, currentCheckIn, referenceCheckIn),
  );

  return {
    participantId: current.participantId,
    current: observationRef(current),
    reference: observationRef(reference),
    protocol,
    missionPhaseContext: buildMissionPhaseContext(input, currentCheckIn, referenceCheckIn),
    performanceComparisons,
    selfReportComparisons,
    links: buildLinks(performanceComparisons, selfReportComparisons),
    interpretation: "descriptive-co-observation-not-causal-not-diagnostic",
    limitations: [
      "Comparisons are co-observations of explicitly linked records, not causal relationships.",
      "A metric without an eligible, protocol-compatible reference is reported as unavailable rather than substituted.",
      "v0.2.0 and v0.3.0 are never pooled or compared directly.",
      "Self-report items are never averaged across opposite polarity, and no composite score is computed.",
      "Mission phase is used only when explicitly recorded; it is never inferred from a timestamp.",
    ],
  };
}

function findObservation(input: SignalConcordanceInput, sessionId: string): RecoveryObservation {
  const observation = input.participant.observations.find((candidate) => candidate.sessionId === sessionId);
  if (!observation) throw new Error(`No completed observation with explicit session ID '${sessionId}' belongs to this participant.`);
  return observation;
}

function compareProtocols(current: RecoveryObservation, reference: RecoveryObservation): ConcordanceProtocolStatus {
  const sameAssessment = current.assessmentProtocolVersion === reference.assessmentProtocolVersion;
  const bothKnown = current.measurementProtocolVersion !== null && reference.measurementProtocolVersion !== null;
  const sameMeasurement = bothKnown && current.measurementProtocolVersion === reference.measurementProtocolVersion;
  const compatible = sameAssessment && sameMeasurement;
  let explanation: string | null = null;
  if (!sameAssessment) explanation = "Assessment protocol versions differ, so the observations are not compared.";
  else if (!bothKnown) explanation = "The measurement protocol version is unknown for at least one observation, so compatibility cannot be established.";
  else if (!sameMeasurement) explanation = `Measurement protocols '${current.measurementProtocolVersion}' and '${reference.measurementProtocolVersion}' are never pooled or compared directly.`;
  return {
    compatible,
    sourceAssessmentProtocol: current.assessmentProtocolVersion,
    referenceAssessmentProtocol: reference.assessmentProtocolVersion,
    sourceMeasurementProtocol: current.measurementProtocolVersion,
    referenceMeasurementProtocol: reference.measurementProtocolVersion,
    explanation,
  };
}

function observationRef(observation: RecoveryObservation) {
  return {
    sessionId: observation.sessionId,
    participantId: observation.participantId,
    completedAt: observation.completedAt,
    assessmentProtocolVersion: observation.assessmentProtocolVersion,
    measurementProtocolVersion: observation.measurementProtocolVersion,
  } as const;
}

function comparePerformanceMetric(
  metric: ConcordancePerformanceMetric,
  current: RecoveryObservation,
  reference: RecoveryObservation,
  protocol: ConcordanceProtocolStatus,
  selfReference: boolean,
): ConcordancePerformanceComparison {
  const definition = METRIC_DEFINITIONS[metric];
  const sourceMetric = findRecoveryMetric(current, metric);
  const referenceMetric = findRecoveryMetric(reference, metric);
  const sourceValue = sourceMetric?.eligible ? sourceMetric.value : null;
  const referenceValue = referenceMetric?.eligible ? referenceMetric.value : null;

  let availability: ConcordanceAvailability;
  let missingDataStatus: ConcordancePerformanceComparison["missingDataStatus"];
  let missingDataExplanation: string | null = null;

  if (selfReference) {
    availability = "self-reference-rejected";
    missingDataStatus = "explicit-link-missing";
    missingDataExplanation = "A session cannot be compared with itself as its own personal reference.";
  } else if (!protocol.compatible) {
    availability = "incompatible-protocol";
    missingDataStatus = "protocol-incompatible";
    missingDataExplanation = protocol.explanation;
  } else if (sourceValue === null) {
    availability = "missing-data";
    missingDataStatus = "missing";
    missingDataExplanation = `The current observation has no eligible ${definition.label.toLowerCase()} value.`;
  } else if (referenceValue === null) {
    availability = "insufficient-reference";
    missingDataStatus = "insufficient-reference";
    missingDataExplanation = `The reference observation has no eligible ${definition.label.toLowerCase()} value.`;
  } else {
    availability = "available";
    missingDataStatus = "none";
  }

  const change = availability === "available" && sourceValue !== null && referenceValue !== null ? sourceValue - referenceValue : null;
  return {
    metric,
    label: definition.label,
    definition: definition.definition,
    unit: definition.unit,
    signConvention: definition.signConvention,
    polarity: "no-inherent-valence",
    source: observationRef(current),
    reference: observationRef(reference),
    sourceValue,
    referenceValue,
    change,
    changeFormula: "currentValue - referenceValue",
    direction: directionOf(change),
    availability,
    protocolCompatibility: protocol,
    method: "identical-protocol-current-minus-reference",
    missingDataStatus,
    missingDataExplanation,
    interpretationLimit: PERFORMANCE_LIMITATION,
  };
}

function resolveCheckIn(
  input: SignalConcordanceInput,
  checkInId: string | undefined,
  sessionId: string,
  observation: RecoveryObservation,
): CheckInResolution {
  if (!checkInId) return { status: "not-supplied", explanation: "No explicit check-in identifier was supplied. Timestamp proximity is never used to select a check-in." };
  const record = input.checkIns.find((candidate) => candidate.id === checkInId);
  if (!record) return { status: "not-found", explanation: `No check-in with explicit identifier '${checkInId}' was supplied.` };
  if (record.participantId !== observation.participantId) return { status: "participant-mismatch", explanation: "The check-in belongs to a different browser-local participant profile." };
  if (record.assessmentSessionId !== sessionId) {
    return {
      status: "different-session",
      explanation: `The check-in explicitly references '${record.assessmentSessionId ?? "no session"}', not '${sessionId}'. It is not reassigned by timestamp.`,
    };
  }
  return {
    status: "valid",
    record,
    ref: {
      checkInId: record.id,
      recordedAt: record.recordedAt,
      context: record.context,
      associationSource: "explicit-assessment-session-identifier",
      temporalRelation: temporalRelation(record.recordedAt, observation.completedAt),
      missionPhase: record.missionPhase ?? null,
    },
  };
}

function temporalRelation(recordedAt: string, completedAt: string): ConcordanceTemporalRelation {
  const checkInTime = Date.parse(recordedAt);
  const sessionTime = Date.parse(completedAt);
  if (!Number.isFinite(checkInTime) || !Number.isFinite(sessionTime)) return "unknown";
  if (checkInTime === sessionTime) return "same-timestamp";
  return checkInTime < sessionTime ? "recorded-before-session" : "recorded-after-session";
}

function compareSelfReport(
  definition: (typeof EXTENDED_CHECK_IN_FIELDS)[number],
  current: CheckInResolution,
  reference: CheckInResolution,
): ConcordanceSelfReportComparison {
  const sourceValue = current.status === "valid" ? current.record[definition.field] ?? null : null;
  const referenceValue = reference.status === "valid" ? reference.record[definition.field] ?? null : null;

  let availability: ConcordanceAvailability;
  let explanation: string | null = null;

  if (current.status !== "valid" || reference.status !== "valid") {
    availability = "not-explicitly-linked";
    explanation = current.status !== "valid" ? current.explanation : reference.status !== "valid" ? reference.explanation : null;
  } else if (sourceValue === null || referenceValue === null) {
    availability = "missing-data";
    explanation = sourceValue === null && referenceValue === null
      ? "The item was not answered in either explicitly linked check-in."
      : sourceValue === null
        ? "The item was not answered in the current check-in."
        : "The item was not answered in the reference check-in.";
  } else {
    availability = "available";
  }

  const change = availability === "available" && sourceValue !== null && referenceValue !== null ? sourceValue - referenceValue : null;
  const fieldDefinition = checkInFieldDefinition(definition.field);
  return {
    field: definition.field,
    label: fieldDefinition.label,
    scale: fieldDefinition.scale,
    polarity: fieldDefinition.polarity,
    construct: fieldDefinition.construct,
    sourceCheckIn: current.status === "valid" ? current.ref : null,
    referenceCheckIn: reference.status === "valid" ? reference.ref : null,
    sourceValue,
    referenceValue,
    change,
    changeFormula: "currentValue - referenceValue",
    direction: directionOf(change),
    availability,
    explanation,
    interpretationLimit: SELF_REPORT_LIMITATION,
  };
}

function buildMissionPhaseContext(
  input: SignalConcordanceInput,
  current: CheckInResolution,
  reference: CheckInResolution,
): ConcordanceMissionPhaseContext {
  const currentCheckInPhase: MissionPhase | null = current.status === "valid" ? current.record.missionPhase ?? null : null;
  const contextPhase: MissionPhase | null = input.missionContext?.phase ?? null;
  const referencePhase: MissionPhase | null = reference.status === "valid" ? reference.record.missionPhase ?? null : null;

  const currentPhase = currentCheckInPhase ?? contextPhase;
  const currentPhaseSource = currentCheckInPhase
    ? "explicit-check-in" as const
    : contextPhase
      ? "explicit-mission-context" as const
      : "not-recorded" as const;
  const referencePhaseSource = referencePhase ? "explicit-check-in" as const : "not-recorded" as const;

  if (currentCheckInPhase && contextPhase && currentCheckInPhase !== contextPhase) {
    return {
      currentPhase,
      referencePhase,
      currentPhaseSource,
      referencePhaseSource,
      relation: "conflicting-explicit-records",
      explanation: `The linked check-in records '${currentCheckInPhase}' while the mission context records '${contextPhase}'. LIMEN does not choose between explicit records.`,
    };
  }
  if (!currentPhase || !referencePhase) {
    return {
      currentPhase,
      referencePhase,
      currentPhaseSource,
      referencePhaseSource,
      relation: "unknown",
      explanation: "At least one phase was not explicitly recorded, so no phase relationship is stated.",
    };
  }
  return {
    currentPhase,
    referencePhase,
    currentPhaseSource,
    referencePhaseSource,
    relation: currentPhase === referencePhase ? "same-phase" : "different-phase",
    explanation: currentPhase === referencePhase ? "Both records explicitly name the same mission phase." : "The records explicitly name different mission phases.",
  };
}

function buildLinks(
  performance: readonly ConcordancePerformanceComparison[],
  selfReport: readonly ConcordanceSelfReportComparison[],
): readonly ConcordanceLink[] {
  return performance.flatMap((metric) =>
    selfReport.map((item) => ({
      metric: metric.metric,
      field: item.field,
      classification: classifyLink(metric.change, item.change, metric.availability, item.availability),
      performanceChange: metric.change,
      selfReportChange: item.change,
      explanation: linkExplanation(metric, item),
      interpretation: "direction-only-co-observation-not-causal" as const,
    })),
  );
}

function classifyLink(
  performanceChange: number | null,
  selfReportChange: number | null,
  performanceAvailability: ConcordanceAvailability,
  selfReportAvailability: ConcordanceAvailability,
): ConcordanceLinkClassification {
  if (performanceAvailability !== "available" || selfReportAvailability !== "available") return "unavailable";
  if (performanceChange === null || selfReportChange === null) return "unavailable";
  if (Math.abs(performanceChange) <= EPSILON && Math.abs(selfReportChange) <= EPSILON) return "no-observed-change";
  if (Math.abs(performanceChange) <= EPSILON || Math.abs(selfReportChange) <= EPSILON) return "unavailable";
  return Math.sign(performanceChange) === Math.sign(selfReportChange) ? "co-occurrence" : "divergence";
}

function linkExplanation(metric: ConcordancePerformanceComparison, item: ConcordanceSelfReportComparison): string {
  if (metric.availability !== "available") return `Unavailable: ${metric.missingDataExplanation ?? "the performance comparison is unavailable."}`;
  if (item.availability !== "available") return `Unavailable: ${item.explanation ?? "the self-report comparison is unavailable."}`;
  if (metric.change === null || item.change === null) return "Unavailable: a change value is missing.";
  const performanceZero = Math.abs(metric.change) <= EPSILON;
  const selfReportZero = Math.abs(item.change) <= EPSILON;
  if (performanceZero && selfReportZero) return "No observed change in either measure. This does not establish stability.";
  if (performanceZero || selfReportZero) return "Only one measure changed, so no same/opposite classification is forced.";
  return Math.sign(metric.change) === Math.sign(item.change)
    ? "The two changes have the same mathematical direction. This is co-observation only, not agreement in valence or a causal relationship."
    : "The two changes have opposite mathematical directions. This is co-observation only, not disagreement in valence or a causal relationship.";
}

function directionOf(change: number | null): ConcordanceDirection {
  if (change === null || !Number.isFinite(change)) return "unavailable";
  if (Math.abs(change) <= EPSILON) return "no-observed-change";
  return change > 0 ? "increased" : "decreased";
}
