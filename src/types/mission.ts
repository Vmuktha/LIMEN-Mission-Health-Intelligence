/**
 * Mission phases are an explicitly recorded vocabulary. LIMEN never derives a
 * phase from a timestamp, a date, or a fictional mission schedule.
 *
 * The canonical phases are the Stage 4 closed vocabulary. The three legacy
 * values are retained so that check-ins and recovery records written before
 * Stage 4 remain valid and readable. New records should use canonical phases;
 * `custom` requires a separately recorded `customPhaseLabel`.
 */
export type MissionPhase =
  | "preflight"
  | "launch"
  | "ascent"
  | "early-orbit"
  | "inflight-operations"
  | "eva-preparation"
  | "eva"
  | "return"
  | "landing"
  | "postflight-recovery"
  | "custom"
  // Legacy values retained for backwards compatibility with stored records.
  | "inflight"
  | "postflight"
  | "reconditioning";

export type GravityEnvironment = "earth-1g" | "microgravity" | "gravity-transition" | "unknown";

export interface MissionProfile {
  readonly missionId: string;
  readonly missionPhase: MissionPhase;
  readonly gravityEnvironment: GravityEnvironment;
  readonly phaseLabel: string;
}

export interface RecoveryTimelineEntry {
  readonly label: string;
  readonly missionPhase: MissionPhase;
  readonly gravityEnvironment: GravityEnvironment;
  readonly relativeDay: number | null;
  readonly description: string;
}

/** An interface-only profile used to demonstrate future views. It is never astronaut data. */
export interface AstronautDemoProfile {
  readonly id: string;
  readonly displayName: string;
  readonly mission: MissionProfile;
  readonly recoveryTimeline: readonly RecoveryTimelineEntry[];
  readonly provenance: "simulated-demo";
  readonly simulated: true;
}
