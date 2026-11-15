import type { CheckInContext, CheckInScoreField, SelfReportedScore } from "./checkin";
import type { TrialPhase, RotationCondition, CursorCoordinate, CursorTrajectoryPoint, TargetPosition, TrialOutcome, MeasurementProtocolVersion } from "./trial";

export type SimulationProvenance = "synthetic-scenario";
export type SimulationMissionPhase = "preflight" | "launch" | "ascent" | "early-orbit" | "inflight-operations" | "return" | "landing" | "postflight-recovery";

export interface SimulationManifest {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly generatorVersion: string;
  readonly seed: number;
  readonly title: string;
  readonly fictionNotice: "fictional-demonstration-not-real-telemetry";
  readonly timeZone: "UTC";
  readonly protocolVersion: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion;
}

export interface SimulationCrewMember {
  readonly id: string;
  readonly displayName: string;
  readonly missionRole: string;
  readonly fictional: true;
  readonly provenance: SimulationProvenance;
}

export interface SimulationMission {
  readonly id: string;
  readonly title: string;
  readonly crewIds: readonly string[];
  readonly launchAt: string;
  readonly landingAt: string;
  readonly missionDurationDays: number;
  readonly provenance: SimulationProvenance;
}

export interface SimulationPhase {
  readonly id: string;
  readonly label: string;
  readonly phase: SimulationMissionPhase;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly relativeStartDay: number;
  readonly relativeEndDay: number;
  readonly provenance: SimulationProvenance;
}

export interface SimulationMissionEvent {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: string;
  readonly phaseId: string;
  readonly provenance: SimulationProvenance;
}

export interface SimulationMissionTransition {
  readonly id: string;
  readonly fromPhaseId: string;
  readonly toPhaseId: string;
  readonly occurredAt: string;
  readonly provenance: SimulationProvenance;
}

/** A simulation-owned raw trial; it is intentionally not an operational TrialRecord. */
export interface SimulationTrial {
  readonly id: string;
  readonly sessionId: string;
  readonly index: number;
  readonly phase: TrialPhase;
  readonly rotationCondition: RotationCondition;
  readonly target: TargetPosition;
  readonly startPosition: CursorCoordinate;
  readonly actualStartPosition: CursorCoordinate;
  /** Present in independently versioned fixtures only when positioning completion was recorded. */
  readonly positioningCompletedAt?: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion;
  readonly targetPresentedAt: string;
  readonly movementOnsetAt: string;
  readonly movementCompletedAt: string;
  readonly trajectory: readonly CursorTrajectoryPoint[];
  readonly outcome: TrialOutcome;
  readonly provenance: SimulationProvenance;
}

export interface SimulationAssessmentSession {
  readonly id: string;
  readonly missionId: string;
  readonly crewMemberId: string;
  readonly phaseId: string;
  readonly label: string;
  readonly completedAt: string;
  readonly relativeDay: number;
  readonly inputDevice: "mouse";
  readonly protocolVersion: string;
  readonly measurementProtocolVersion: MeasurementProtocolVersion;
  readonly trials: readonly SimulationTrial[];
  readonly provenance: SimulationProvenance;
}

export type SimulationCheckInScores = Readonly<Partial<Record<CheckInScoreField, SelfReportedScore>>>;

export interface SimulationCheckIn {
  readonly id: string;
  readonly missionId: string;
  readonly crewMemberId: string;
  readonly phaseId: string;
  readonly recordedAt: string;
  readonly relativeDay: number;
  readonly context: CheckInContext;
  readonly assessmentSessionId?: string;
  readonly scores: SimulationCheckInScores;
  readonly interpretation: "fictional-self-report-not-an-objective-measurement";
  readonly provenance: SimulationProvenance;
}

export interface SimulationScenario {
  readonly manifest: SimulationManifest;
  readonly mission: SimulationMission;
  readonly crew: readonly SimulationCrewMember[];
  readonly phases: readonly SimulationPhase[];
  readonly events: readonly SimulationMissionEvent[];
  readonly transitions: readonly SimulationMissionTransition[];
  readonly assessmentSessions: readonly SimulationAssessmentSession[];
  readonly checkIns: readonly SimulationCheckIn[];
}
