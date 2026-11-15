import type { AssessmentSession } from "@/types/assessment";
import type { SymptomCheckInRecord } from "@/types/checkin";
import type { FollowUpRecord } from "@/types/followup";
import type { MissionEvent, MissionContext } from "@/types/mission-context";
import type { MissionTransition } from "@/types/transition";

export type MissionActivityKind = "mission-transition" | "mission-event" | "assessment-session" | "check-in" | "follow-up";

export interface MissionActivity {
  readonly id: string;
  readonly kind: MissionActivityKind;
  readonly title: string;
  readonly occurredAt: string | null;
  readonly recordedAt: string | null;
  readonly phase: string | null;
  readonly provenance: string;
  readonly href: string;
}

export interface MissionActivitySources {
  readonly transitions: readonly MissionTransition[];
  readonly events: readonly MissionEvent[];
  readonly assessments: readonly AssessmentSession[];
  readonly checkIns: readonly SymptomCheckInRecord[];
  readonly followUps: readonly FollowUpRecord[];
}

/** Read-only, provenance-filtered activity projection. It never associates records by time or adjacency. */
export function buildMissionActivityTimeline(sources: MissionActivitySources): readonly MissionActivity[] {
  const entries: MissionActivity[] = [
    ...sources.transitions.filter((record) => record.provenance === "browser-user-generated").map((record) => ({
      id: record.id, kind: "mission-transition" as const,
      title: `Phase transition: ${record.previousCustomPhaseLabel ?? record.previousPhase} → ${record.currentCustomPhaseLabel ?? record.currentPhase}`,
      occurredAt: record.occurredAt, recordedAt: record.recordedAt, phase: `${record.previousPhase} → ${record.currentPhase}`,
      provenance: record.provenance, href: "/mission/transitions",
    })),
    ...sources.events.filter((record) => record.provenance === "browser-user-generated").map((record) => ({
      id: record.id, kind: "mission-event" as const, title: record.description,
      occurredAt: record.occurredAt, recordedAt: record.recordedAt, phase: record.phase ?? null,
      provenance: record.provenance, href: "/mission/events",
    })),
    ...sources.assessments.filter((record) => record.metadata.provenance === "browser-user-generated" && record.metadata.simulated === false && record.status === "completed").map((record) => ({
      id: record.metadata.sessionId, kind: "assessment-session" as const, title: "Completed browser assessment",
      occurredAt: record.metadata.completedAt, recordedAt: record.metadata.createdAt, phase: null,
      provenance: record.metadata.provenance, href: "/assessment",
    })),
    ...sources.checkIns.filter((record) => record.provenance === "browser-user-generated").map((record) => ({
      id: record.id, kind: "check-in" as const, title: "Self-reported check-in",
      occurredAt: record.recordedAt, recordedAt: record.recordedAt, phase: record.missionPhase ?? null,
      provenance: record.provenance, href: "/check-in",
    })),
    ...sources.followUps.filter((record) => record.provenance === "browser-user-generated").map((record) => ({
      id: record.id, kind: "follow-up" as const, title: `Follow-up: ${record.status}`,
      occurredAt: record.updatedAt, recordedAt: record.createdAt, phase: null,
      provenance: record.provenance, href: followUpHref(record),
    })),
  ];
  return entries.sort((left, right) => {
    const leftTime = parseTime(left.occurredAt ?? left.recordedAt);
    const rightTime = parseTime(right.occurredAt ?? right.recordedAt);
    return rightTime - leftTime || left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id);
  });
}

export function latestRecordedMissionContext(contexts: readonly MissionContext[]): MissionContext | null {
  return contexts
    .filter((record) => record.provenance === "browser-user-generated")
    .slice()
    .sort((left, right) => parseTime(right.phaseRecordedAt) - parseTime(left.phaseRecordedAt) || left.id.localeCompare(right.id))[0] ?? null;
}

function followUpHref(record: FollowUpRecord): string {
  switch (record.relatedObservation.kind) {
    case "assessment-session": return "/assessment";
    case "check-in": return "/check-in";
    case "mission-event": return "/mission/events";
    case "signal-concordance": return "/concordance";
  }
}

function parseTime(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
