import type { MissionPhase } from "@/types/mission";

/** Canonical Stage 4 closed vocabulary. */
export const CANONICAL_MISSION_PHASES: readonly MissionPhase[] = [
  "preflight",
  "launch",
  "ascent",
  "early-orbit",
  "inflight-operations",
  "eva-preparation",
  "eva",
  "return",
  "landing",
  "postflight-recovery",
  "custom",
];

/**
 * Values accepted by pre-Stage-4 records. They remain readable but are not
 * offered as canonical phases for new mission-context records.
 */
export const LEGACY_MISSION_PHASES: readonly MissionPhase[] = ["inflight", "postflight", "reconditioning"];

/** Every phase value accepted by stored-record validation. */
export const ACCEPTED_MISSION_PHASES: readonly MissionPhase[] = [...CANONICAL_MISSION_PHASES, ...LEGACY_MISSION_PHASES];

export const MISSION_PHASE_LABELS: Readonly<Record<MissionPhase, string>> = {
  preflight: "Preflight",
  launch: "Launch",
  ascent: "Ascent",
  "early-orbit": "Early orbit",
  "inflight-operations": "Inflight operations",
  "eva-preparation": "EVA preparation",
  eva: "EVA",
  return: "Return",
  landing: "Landing",
  "postflight-recovery": "Postflight recovery",
  custom: "Custom phase",
  inflight: "Inflight (legacy label)",
  postflight: "Postflight (legacy label)",
  reconditioning: "Reconditioning (legacy label)",
};

export function isCanonicalMissionPhase(value: unknown): value is MissionPhase {
  return typeof value === "string" && CANONICAL_MISSION_PHASES.includes(value as MissionPhase);
}

export function isAcceptedMissionPhase(value: unknown): value is MissionPhase {
  return typeof value === "string" && ACCEPTED_MISSION_PHASES.includes(value as MissionPhase);
}

export function isLegacyMissionPhase(value: unknown): value is MissionPhase {
  return typeof value === "string" && LEGACY_MISSION_PHASES.includes(value as MissionPhase);
}

export function missionPhaseLabel(phase: MissionPhase | null | undefined): string | null {
  return phase ? MISSION_PHASE_LABELS[phase] : null;
}
