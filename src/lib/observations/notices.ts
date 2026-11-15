import { CHECK_IN_FIELDS } from "@/lib/checkin/record";
import { RECOVERY_METRICS, findRecoveryMetric } from "@/lib/analytics/recovery";
import { recoveryMetricPresentation } from "@/lib/analytics/recovery-dashboard";
import type { FollowUpRecord } from "@/types/followup";
import type { MissionEvent } from "@/types/mission-context";
import type { MissionTransition } from "@/types/transition";
import type { RecoveryParticipantDataset, RecoveryMetric } from "@/types/recovery";

export const OBSERVATION_NOTICE_MODEL_VERSION = "1.0.0" as const;

export function observationLoadErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Browser-local observation records could not be read. No new data was written.";
}

export const OBSERVATION_NOTICE_RULES = [
  { id: "mission-event-recorded.v1", meaning: "One explicitly recorded, browser-user-generated mission event; no phase or relationship is inferred." },
  { id: "mission-transition-recorded.v1", meaning: "One explicitly recorded, browser-user-generated mission phase transition; no transition is inferred from time." },
  { id: "follow-up-workflow-record.v1", meaning: "One explicitly stored, browser-user-generated follow-up workflow record; administrative status only." },
  { id: "assessment-metric-difference.v1", meaning: "Arithmetic difference for adjacent chronological completed assessments in the same browser-local participant profile, only for a shared known measurement protocol and a metric eligible with finite values in both records." },
  { id: "self-report-difference.v1", meaning: "Arithmetic difference for adjacent chronological check-ins in the same browser-local profile, same recorded context and same answered field; no link to performance is inferred." },
] as const;

export type ObservationNoticeRuleId = typeof OBSERVATION_NOTICE_RULES[number]["id"];
export interface NoticeRecordReference {
  readonly kind: "mission-event" | "mission-transition" | "follow-up" | "assessment-session" | "check-in" | "signal-concordance";
  readonly id: string;
  readonly timestamp: string;
  readonly href: string;
}
export interface ObservationNotice {
  readonly id: string;
  readonly ruleId: ObservationNoticeRuleId;
  readonly title: string;
  readonly detail: string;
  readonly timestamps: readonly { readonly label: string; readonly value: string }[];
  readonly records: readonly NoticeRecordReference[];
  readonly metric: RecoveryMetric | null;
  readonly protocol: string | null;
  readonly eligibleDenominators: readonly { readonly eligible: number; readonly total: number }[] | null;
  readonly missingness: string;
  readonly associationBasis: string;
  readonly limitations: string;
}
export interface NoticeEvidenceCounts {
  readonly eligibleAssessmentMetricPairs: number;
  readonly eligibleSelfReportPairs: number;
  readonly excludedProtocolPairs: number;
  readonly missingMetricPairs: number;
  readonly missingSelfReportPairs: number;
}
export interface ObservationNoticeResult {
  readonly modelVersion: typeof OBSERVATION_NOTICE_MODEL_VERSION;
  readonly notices: readonly ObservationNotice[];
  readonly evidenceCounts: NoticeEvidenceCounts;
  readonly insufficientEvidence: boolean;
}

export interface ObservationNoticeInput {
  readonly events: readonly MissionEvent[];
  readonly transitions: readonly MissionTransition[];
  readonly followUps: readonly FollowUpRecord[];
  readonly participants: readonly RecoveryParticipantDataset[];
}

/**
 * Version 1 is deterministic and descriptive only. It uses exact record links,
 * strict provenance filters, adjacent chronological rows, explicit same-profile
 * membership and protocol/field eligibility. It has no thresholds, status
 * classification, diagnosis, causal interpretation, or readiness score.
 */
export function buildObservationNotices(input: ObservationNoticeInput): ObservationNoticeResult {
  const notices: ObservationNotice[] = [];
  for (const event of input.events) {
    if (event.provenance !== "browser-user-generated" || event.source === "simulated-demo") continue;
    notices.push({
      id: `event:${event.id}`, ruleId: "mission-event-recorded.v1", title: "Explicitly recorded mission event",
      detail: event.description, timestamps: [{ label: "User-reported occurrence", value: event.occurredAt }, { label: "Browser record time", value: event.recordedAt }],
      records: [{ kind: "mission-event", id: event.id, timestamp: event.recordedAt, href: `/mission/events#${encodeURIComponent(event.id)}` }],
      metric: null, protocol: null, eligibleDenominators: null, missingness: "Not applicable to an event record.",
      associationBasis: "Explicit event record only; no assessment, check-in or transition association is inferred.",
      limitations: "A manually recorded event is not telemetry. Its occurrence time is user-reported and distinct from its recorded time.",
    });
  }
  for (const transition of input.transitions) {
    if (transition.provenance !== "browser-user-generated" || transition.source === "simulated-demo") continue;
    notices.push({
      id: `transition:${transition.id}`, ruleId: "mission-transition-recorded.v1", title: "Explicitly recorded mission transition",
      detail: `${transition.previousCustomPhaseLabel ?? transition.previousPhase} → ${transition.currentCustomPhaseLabel ?? transition.currentPhase}`,
      timestamps: [{ label: "User-reported transition time", value: transition.occurredAt }, { label: "Browser record time", value: transition.recordedAt }],
      records: [{ kind: "mission-transition", id: transition.id, timestamp: transition.recordedAt, href: `/mission/transitions#${encodeURIComponent(transition.id)}` }],
      metric: null, protocol: null, eligibleDenominators: null, missingness: "Not applicable to a transition record.",
      associationBasis: "The transition explicitly names its previous and current phase; no assessment or check-in association is inferred.",
      limitations: "A manually recorded transition is not telemetry. Occurrence time is user-reported and does not establish when another record occurred relative to it.",
    });
  }
  for (const followUp of input.followUps) {
    if (followUp.provenance !== "browser-user-generated" || followUp.source === "simulated-demo") continue;
    notices.push({
      id: `follow-up:${followUp.id}`, ruleId: "follow-up-workflow-record.v1", title: "Recorded follow-up workflow",
      detail: `${followUp.status.replaceAll("-", " ")} · ${followUp.reason}`,
      timestamps: [{ label: "Workflow created", value: followUp.createdAt }, { label: "Workflow updated", value: followUp.updatedAt }],
      records: [
        { kind: "follow-up", id: followUp.id, timestamp: followUp.updatedAt, href: `/observations#${encodeURIComponent(`follow-up:${followUp.id}`)}` },
        { kind: followUp.relatedObservation.kind === "check-in" ? "check-in" : followUp.relatedObservation.kind === "assessment-session" ? "assessment-session" : followUp.relatedObservation.kind, id: followUp.relatedObservation.id, timestamp: followUp.createdAt, href: followUp.relatedObservation.kind === "check-in" ? `/personal-trends#check-in-${encodeURIComponent(followUp.relatedObservation.id)}` : followUp.relatedObservation.kind === "assessment-session" ? `/personal-trends#assessment-${encodeURIComponent(followUp.relatedObservation.id)}` : followUp.relatedObservation.kind === "mission-event" ? `/mission/events#${encodeURIComponent(followUp.relatedObservation.id)}` : "/concordance" },
      ],
      metric: null, protocol: null, eligibleDenominators: null, missingness: "Not applicable to a workflow record.",
      associationBasis: `Explicit stored relationship: ${followUp.relatedObservation.kind} ${followUp.relatedObservation.id}.`,
      limitations: "Workflow status is administrative only. It is not a clinical action, escalation, medical advice or a health state.",
    });
  }

  const evidenceCounts: { eligibleAssessmentMetricPairs: number; eligibleSelfReportPairs: number; excludedProtocolPairs: number; missingMetricPairs: number; missingSelfReportPairs: number } = {
    eligibleAssessmentMetricPairs: 0, eligibleSelfReportPairs: 0, excludedProtocolPairs: 0, missingMetricPairs: 0, missingSelfReportPairs: 0,
  };
  for (const participant of input.participants) {
    const observations = [...participant.observations].filter(isFiniteTimestamp).sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.sessionId.localeCompare(b.sessionId));
    for (let index = 1; index < observations.length; index += 1) {
      const previous = observations[index - 1]; const current = observations[index];
      if (!previous || !current) continue;
      if (!previous.measurementProtocolVersion || previous.measurementProtocolVersion !== current.measurementProtocolVersion) { evidenceCounts.excludedProtocolPairs += 1; continue; }
      for (const metric of RECOVERY_METRICS) {
        const before = findRecoveryMetric(previous, metric); const after = findRecoveryMetric(current, metric);
        if (!before?.eligible || before.value === null || !Number.isFinite(before.value) || !after?.eligible || after.value === null || !Number.isFinite(after.value)) { evidenceCounts.missingMetricPairs += 1; continue; }
        evidenceCounts.eligibleAssessmentMetricPairs += 1;
        const presentation = recoveryMetricPresentation(metric);
        const change = after.value - before.value;
        notices.push({
          id: `assessment-difference:${participant.participantId}:${previous.sessionId}:${current.sessionId}:${metric}`,
          ruleId: "assessment-metric-difference.v1", title: `Observed ${presentation.shortLabel.toLowerCase()} difference`,
          detail: `${formatNumber(before.value, presentation.precision)} → ${formatNumber(after.value, presentation.precision)} ${presentation.unitLabel} (current − previous: ${formatSigned(change, presentation.precision)} ${presentation.unitLabel}).`,
          timestamps: [{ label: "Earlier assessment completed", value: previous.completedAt }, { label: "Later assessment completed", value: current.completedAt }],
          records: [
            { kind: "assessment-session", id: previous.sessionId, timestamp: previous.completedAt, href: `/personal-trends#assessment-${encodeURIComponent(previous.sessionId)}` },
            { kind: "assessment-session", id: current.sessionId, timestamp: current.completedAt, href: `/personal-trends#assessment-${encodeURIComponent(current.sessionId)}` },
          ],
          metric, protocol: current.measurementProtocolVersion,
          eligibleDenominators: [
            { eligible: before.eligibleTrialCount, total: before.totalTrialCount },
            { eligible: after.eligibleTrialCount, total: after.totalTrialCount },
          ],
          missingness: `${before.eligibleTrialCount}/${before.totalTrialCount} and ${after.eligibleTrialCount}/${after.totalTrialCount} eligible/total trials, respectively. Other metric or trial values may be missing or ineligible.`,
          associationBasis: `Both records belong to the same browser-local participant profile (${participant.participantId}); timestamps order the pair only. No mission event or check-in association is inferred.`,
          limitations: "Arithmetic difference only. No threshold or direction is labelled favourable or unfavourable; this is not a causal, clinical, recovery or readiness interpretation.",
        });
      }
    }
    const checkIns = [...participant.checkIns].filter((item) => Number.isFinite(Date.parse(item.recordedAt))).sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.checkInId.localeCompare(b.checkInId));
    for (let index = 1; index < checkIns.length; index += 1) {
      const previous = checkIns[index - 1]; const current = checkIns[index];
      if (!previous || !current || previous.context !== current.context) continue;
      for (const field of CHECK_IN_FIELDS) {
        const before = previous.scores[field.field]; const after = current.scores[field.field];
        if (before === null || after === null || !Number.isFinite(before) || !Number.isFinite(after)) { evidenceCounts.missingSelfReportPairs += 1; continue; }
        evidenceCounts.eligibleSelfReportPairs += 1;
        notices.push({
          id: `self-report-difference:${participant.participantId}:${previous.checkInId}:${current.checkInId}:${field.field}`,
          ruleId: "self-report-difference.v1", title: `Observed self-report difference · ${field.label.toLowerCase()}`,
          detail: `${before}/10 → ${after}/10 (current − previous: ${formatSigned(after - before, 0)}).`,
          timestamps: [{ label: "Earlier check-in recorded", value: previous.recordedAt }, { label: "Later check-in recorded", value: current.recordedAt }],
          records: [
            { kind: "check-in", id: previous.checkInId, timestamp: previous.recordedAt, href: `/personal-trends#check-in-${encodeURIComponent(previous.checkInId)}` },
            { kind: "check-in", id: current.checkInId, timestamp: current.recordedAt, href: `/personal-trends#check-in-${encodeURIComponent(current.checkInId)}` },
          ],
          metric: null, protocol: null, eligibleDenominators: [{ eligible: 2, total: 2 }], missingness: `Both ${field.label.toLowerCase()} answers are present; other unanswered fields are excluded and not imputed.`,
          associationBasis: `Same browser-local participant profile (${participant.participantId}), same explicitly recorded check-in context (${current.context}); chronological order only. No performance or mission-event association is inferred.`,
          limitations: "Self-report values are subjective observations. Difference is arithmetic only; no threshold or health interpretation is applied.",
        });
      }
    }
  }
  notices.sort((left, right) => Date.parse(left.timestamps.at(-1)?.value ?? "") - Date.parse(right.timestamps.at(-1)?.value ?? "") || left.id.localeCompare(right.id));
  return { modelVersion: OBSERVATION_NOTICE_MODEL_VERSION, notices, evidenceCounts, insufficientEvidence: notices.length === 0 };
}

function isFiniteTimestamp<T extends { readonly completedAt: string }>(value: T): boolean { return Number.isFinite(Date.parse(value.completedAt)); }
function formatNumber(value: number, precision: number): string { return value.toFixed(precision); }
function formatSigned(value: number, precision: number): string { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(precision)}`; }
