export type MissionPhase = "preflight" | "inflight" | "postflight" | "reconditioning";
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
