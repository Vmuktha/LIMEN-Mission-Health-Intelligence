/**
 * Mission-context records.
 *
 * A mission context is a manually recorded frame of reference for the crew's
 * current mission phase and the events that were explicitly observed. It is not
 * telemetry, not a live mission schedule, and not an inference engine. Every
 * record carries its own source and provenance, and a phase is only ever the
 * value a user explicitly selected.
 */

import type { MissionPhase } from "./mission";

/** Earth orbit, lunar, deep space, or an explicitly configured profile. */
export type MissionProfileKind = "earth-orbit" | "lunar" | "deep-space" | "configurable";

/** How a mission record entered LIMEN. */
export type MissionRecordSource = "manual-entry" | "imported-record" | "simulated-demo";

/** Provenance of a mission record. No record is presented as real unless it is user-entered. */
export type MissionRecordProvenance = "browser-user-generated" | "simulated-demo";

export interface MissionContext {
  readonly id: string;
  readonly missionId: string;
  readonly missionName: string;
  readonly profile: MissionProfileKind;
  /** Explicitly selected; never inferred from a timestamp or schedule. */
  readonly phase: MissionPhase;
  /** Required only when `phase` is `custom`. */
  readonly customPhaseLabel?: string;
  /** When the phase above was explicitly recorded. */
  readonly phaseRecordedAt: string;
  readonly operationalContext?: string;
  readonly source: MissionRecordSource;
  readonly provenance: MissionRecordProvenance;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly interpretation: "mission-context-not-telemetry";
}

export interface MissionEvent {
  readonly id: string;
  readonly missionContextId: string;
  readonly missionId: string;
  /** The timestamp the user says the event occurred at. */
  readonly occurredAt: string;
  readonly description: string;
  readonly operationalContext?: string;
  /** Explicitly supplied phase at the time of recording; never derived from `occurredAt`. */
  readonly phase?: MissionPhase;
  readonly source: MissionRecordSource;
  readonly provenance: MissionRecordProvenance;
  readonly recordedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly interpretation: "manually-recorded-mission-event";
}

export interface MissionEventDraft {
  readonly id: string;
  readonly missionContextId: string;
  readonly missionId: string;
  readonly occurredAt: string;
  readonly description: string;
  readonly operationalContext?: string;
  readonly phase?: MissionPhase;
  readonly source: MissionRecordSource;
  readonly provenance: MissionRecordProvenance;
  readonly recordedAt?: string;
}

export interface MissionContextDraft {
  readonly id: string;
  readonly missionId: string;
  readonly missionName: string;
  readonly profile: MissionProfileKind;
  readonly phase: MissionPhase;
  readonly customPhaseLabel?: string;
  readonly phaseRecordedAt?: string;
  readonly operationalContext?: string;
  readonly source: MissionRecordSource;
  readonly provenance: MissionRecordProvenance;
  readonly createdAt?: string;
}

export interface MissionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
