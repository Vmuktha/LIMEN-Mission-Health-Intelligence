import { DEFAULT_ASSESSMENT_PROTOCOL } from "@/lib/assessment/protocol";
import { createPlannedTrials } from "@/lib/assessment/trial-engine";
import type { SimulationAssessmentSession, SimulationMissionPhase, SimulationPhase, SimulationScenario, SimulationTrial } from "@/types/simulation";
import type { CursorCoordinate, CursorTrajectoryPoint, TrialPhase } from "@/types/trial";

export const ASTER_ONE_SCENARIO_ID = "aster-1-mara-venn" as const;
export const ASTER_ONE_SCENARIO_VERSION = "1.0.0" as const;
export const SIMULATION_GENERATOR_VERSION = "1.0.0" as const;
export const ASTER_ONE_SEED = 4102028;

const PROVENANCE = "synthetic-scenario" as const;
const CREW_ID = "crew-mara-venn";
const MISSION_ID = "mission-aster-1";
const LAUNCH_AT = "2028-06-10T09:00:00.000Z";
const TRIAL_INTERVAL_MS = 5_000;
const ORIGIN: CursorCoordinate = { x: 400, y: 300 };
const TARGET_RADIUS = 120;
const DIRECTION_VECTOR = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
} as const;

interface SessionSpec {
  readonly id: string;
  readonly label: string;
  readonly phaseId: string;
  readonly relativeDay: number;
  readonly completedAt: string;
  /** Authored synthetic timing offset; it is not a physiological prediction. */
  readonly timingOffsetMs: number;
  /** Authored synthetic path curvature in CSS pixels, not a clinical parameter. */
  readonly pathCurvaturePx: number;
}

const SESSION_SPECS: readonly SessionSpec[] = [
  { id: "aster-s0-preflight", label: "Preflight baseline", phaseId: "phase-preflight", relativeDay: -7, completedAt: "2028-06-03T09:00:00.000Z", timingOffsetMs: 0, pathCurvaturePx: 1.5 },
  { id: "aster-s1-early-orbit", label: "Early orbit", phaseId: "phase-early-orbit", relativeDay: 2, completedAt: "2028-06-12T10:00:00.000Z", timingOffsetMs: 35, pathCurvaturePx: 6 },
  { id: "aster-s2-orbit-day-8", label: "Established orbit · day 8", phaseId: "phase-inflight", relativeDay: 8, completedAt: "2028-06-18T10:00:00.000Z", timingOffsetMs: 16, pathCurvaturePx: 3.5 },
  { id: "aster-s3-late-orbit", label: "Late orbit", phaseId: "phase-inflight", relativeDay: 21, completedAt: "2028-07-01T10:00:00.000Z", timingOffsetMs: 8, pathCurvaturePx: 2 },
  { id: "aster-s4-postflight-day-1", label: "Postflight · day 1", phaseId: "phase-postflight", relativeDay: 29, completedAt: "2028-07-09T09:00:00.000Z", timingOffsetMs: 42, pathCurvaturePx: 5 },
  { id: "aster-s5-postflight-day-14", label: "Postflight · day 14", phaseId: "phase-postflight", relativeDay: 42, completedAt: "2028-07-22T09:00:00.000Z", timingOffsetMs: 12, pathCurvaturePx: 2.5 },
];

const CHECK_IN_SPECS: SimulationScenario["checkIns"] = [
  { id: "aster-c0-preflight", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-preflight", recordedAt: "2028-06-03T09:30:00.000Z", relativeDay: -7, context: "general", scores: { dizzinessOrDisorientation: 1, balanceOrCoordinationDifficulty: 1, nausea: 0, visualDiscomfort: 1, fatigue: 2, movementConfidence: 8 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c1-launch", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-launch", recordedAt: "2028-06-10T08:00:00.000Z", relativeDay: 0, context: "general", scores: { dizzinessOrDisorientation: 1, balanceOrCoordinationDifficulty: 1, nausea: 1, visualDiscomfort: 1, fatigue: 3, movementConfidence: 8 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c2-early-orbit", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-early-orbit", recordedAt: "2028-06-12T10:30:00.000Z", relativeDay: 2, context: "post-assessment", assessmentSessionId: "aster-s1-early-orbit", scores: { dizzinessOrDisorientation: 4, balanceOrCoordinationDifficulty: 3, nausea: 2, visualDiscomfort: 2, fatigue: 5, movementConfidence: 6 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c3-orbit-day-8", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-inflight", recordedAt: "2028-06-18T10:30:00.000Z", relativeDay: 8, context: "post-assessment", assessmentSessionId: "aster-s2-orbit-day-8", scores: { dizzinessOrDisorientation: 2, balanceOrCoordinationDifficulty: 2, nausea: 1, visualDiscomfort: 2, fatigue: 4, movementConfidence: 7 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c4-orbit-day-14", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-inflight", recordedAt: "2028-06-24T10:00:00.000Z", relativeDay: 14, context: "general", scores: { dizzinessOrDisorientation: 2, balanceOrCoordinationDifficulty: 2, nausea: 1, visualDiscomfort: 1, fatigue: 3, movementConfidence: 7 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c5-late-orbit", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-inflight", recordedAt: "2028-07-01T10:30:00.000Z", relativeDay: 21, context: "post-assessment", assessmentSessionId: "aster-s3-late-orbit", scores: { dizzinessOrDisorientation: 2, balanceOrCoordinationDifficulty: 1, nausea: 1, visualDiscomfort: 1, fatigue: 4, movementConfidence: 8 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c6-return-prep", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-return", recordedAt: "2028-07-08T07:30:00.000Z", relativeDay: 28, context: "general", scores: { dizzinessOrDisorientation: 2, balanceOrCoordinationDifficulty: 2, nausea: 1, visualDiscomfort: 1, fatigue: 5, movementConfidence: 7 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c7-postflight-day-1", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-postflight", recordedAt: "2028-07-09T09:30:00.000Z", relativeDay: 29, context: "post-assessment", assessmentSessionId: "aster-s4-postflight-day-1", scores: { dizzinessOrDisorientation: 3, balanceOrCoordinationDifficulty: 3, nausea: 1, visualDiscomfort: 2, fatigue: 6, movementConfidence: 6 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
  { id: "aster-c8-postflight-day-14", missionId: MISSION_ID, crewMemberId: CREW_ID, phaseId: "phase-postflight", recordedAt: "2028-07-22T09:30:00.000Z", relativeDay: 42, context: "post-assessment", assessmentSessionId: "aster-s5-postflight-day-14", scores: { dizzinessOrDisorientation: 1, balanceOrCoordinationDifficulty: 1, nausea: 0, visualDiscomfort: 1, fatigue: 2, movementConfidence: 8 }, interpretation: "fictional-self-report-not-an-objective-measurement", provenance: PROVENANCE },
];

export function getAsterOneScenario(): SimulationScenario {
  const phases: readonly SimulationPhase[] = [
    phase("phase-preflight", "Preflight", "preflight", "2028-06-03T00:00:00.000Z", LAUNCH_AT, -7, 0),
    phase("phase-launch", "Launch", "launch", LAUNCH_AT, "2028-06-10T09:18:00.000Z", 0, 0.0125),
    phase("phase-ascent", "Ascent and orbital insertion", "ascent", "2028-06-10T09:18:00.000Z", "2028-06-10T10:32:00.000Z", 0.0125, 0.064),
    phase("phase-early-orbit", "Early orbit", "early-orbit", "2028-06-10T10:32:00.000Z", "2028-06-16T09:00:00.000Z", 0.064, 6),
    phase("phase-inflight", "In-flight operations", "inflight-operations", "2028-06-16T09:00:00.000Z", "2028-07-07T09:00:00.000Z", 6, 27),
    phase("phase-return", "Deorbit preparation and return", "return", "2028-07-07T09:00:00.000Z", "2028-07-08T09:00:00.000Z", 27, 28),
    phase("phase-landing", "Landing", "landing", "2028-07-08T09:00:00.000Z", "2028-07-08T09:15:00.000Z", 28, 28.0105),
    phase("phase-postflight", "Postflight follow-up", "postflight-recovery", "2028-07-08T09:15:00.000Z", "2028-07-22T23:59:59.000Z", 28.0105, 42.625),
  ];

  const assessmentSessions = SESSION_SPECS.map((spec) => createAssessmentSession(spec));
  return {
    manifest: {
      schemaVersion: 1,
      scenarioId: ASTER_ONE_SCENARIO_ID,
      scenarioVersion: ASTER_ONE_SCENARIO_VERSION,
      generatorVersion: SIMULATION_GENERATOR_VERSION,
      seed: ASTER_ONE_SEED,
      title: "Aster-1 · Mara Venn",
      fictionNotice: "fictional-demonstration-not-real-telemetry",
      timeZone: "UTC",
      protocolVersion: DEFAULT_ASSESSMENT_PROTOCOL.version,
      measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor",
    },
    mission: { id: MISSION_ID, title: "Aster-1", crewIds: [CREW_ID], launchAt: LAUNCH_AT, landingAt: "2028-07-08T09:00:00.000Z", missionDurationDays: 28, provenance: PROVENANCE },
    crew: [{ id: CREW_ID, displayName: "Dr. Mara Venn", missionRole: "Mission specialist", fictional: true, provenance: PROVENANCE }],
    phases,
    events: [
      { id: "event-launch", title: "Launch", description: "Aster-1 begins its fictional mission.", occurredAt: LAUNCH_AT, phaseId: "phase-launch", provenance: PROVENANCE },
      { id: "event-orbit-insertion", title: "Orbit insertion", description: "The fictional vehicle reaches its planned orbital phase.", occurredAt: "2028-06-10T10:32:00.000Z", phaseId: "phase-ascent", provenance: PROVENANCE },
      { id: "event-deorbit-preparation", title: "Deorbit preparation", description: "The crew begins the scenario's return sequence.", occurredAt: "2028-07-07T09:00:00.000Z", phaseId: "phase-return", provenance: PROVENANCE },
      { id: "event-landing", title: "Landing", description: "Aster-1 concludes its fictional flight.", occurredAt: "2028-07-08T09:00:00.000Z", phaseId: "phase-landing", provenance: PROVENANCE },
    ],
    transitions: [
      { id: "transition-preflight-launch", fromPhaseId: "phase-preflight", toPhaseId: "phase-launch", occurredAt: LAUNCH_AT, provenance: PROVENANCE },
      { id: "transition-ascent-orbit", fromPhaseId: "phase-ascent", toPhaseId: "phase-early-orbit", occurredAt: "2028-06-10T10:32:00.000Z", provenance: PROVENANCE },
      { id: "transition-orbit-return", fromPhaseId: "phase-inflight", toPhaseId: "phase-return", occurredAt: "2028-07-07T09:00:00.000Z", provenance: PROVENANCE },
      { id: "transition-return-landing", fromPhaseId: "phase-return", toPhaseId: "phase-landing", occurredAt: "2028-07-08T09:00:00.000Z", provenance: PROVENANCE },
      { id: "transition-landing-postflight", fromPhaseId: "phase-landing", toPhaseId: "phase-postflight", occurredAt: "2028-07-08T09:15:00.000Z", provenance: PROVENANCE },
    ],
    assessmentSessions,
    checkIns: CHECK_IN_SPECS,
  };
}

export interface SimulationValidationResult {
  readonly valid: boolean;
  readonly issues: readonly string[];
}

export function validateSimulationScenario(scenario: SimulationScenario): SimulationValidationResult {
  const issues: string[] = [];
  const phaseIds = new Set(scenario.phases.map(({ id }) => id));
  const sessionIds = new Set(scenario.assessmentSessions.map(({ id }) => id));
  if (scenario.manifest.fictionNotice !== "fictional-demonstration-not-real-telemetry") issues.push("Scenario is missing its fictional-data declaration.");
  if (scenario.assessmentSessions.length !== 6) issues.push("Aster-1 must include exactly six assessment sessions.");
  for (const phase of scenario.phases) {
    if (!isFiniteDate(phase.startedAt) || !isFiniteDate(phase.endedAt) || Date.parse(phase.startedAt) > Date.parse(phase.endedAt)) issues.push(`Phase ${phase.id} has invalid chronological bounds.`);
  }
  for (const transition of scenario.transitions) {
    if (!phaseIds.has(transition.fromPhaseId) || !phaseIds.has(transition.toPhaseId)) issues.push(`Transition ${transition.id} references an unknown phase.`);
  }
  for (const event of scenario.events) {
    if (!phaseIds.has(event.phaseId) || !isFiniteDate(event.occurredAt)) issues.push(`Event ${event.id} has an invalid phase or timestamp.`);
  }
  for (const session of scenario.assessmentSessions) issues.push(...validateSession(session, phaseIds));
  for (const checkIn of scenario.checkIns) {
    if (!phaseIds.has(checkIn.phaseId) || !isFiniteDate(checkIn.recordedAt)) issues.push(`Check-in ${checkIn.id} has an invalid phase or timestamp.`);
    if (checkIn.assessmentSessionId && !sessionIds.has(checkIn.assessmentSessionId)) issues.push(`Check-in ${checkIn.id} references an unknown assessment session.`);
    for (const [field, score] of Object.entries(checkIn.scores)) {
      if (!Number.isInteger(score) || score < 0 || score > 10) issues.push(`Check-in ${checkIn.id} has an invalid ${field} score.`);
    }
  }
  return { valid: issues.length === 0, issues };
}

function validateSession(session: SimulationAssessmentSession, phaseIds: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  if (!phaseIds.has(session.phaseId)) issues.push(`Session ${session.id} references an unknown phase.`);
  if (!isFiniteDate(session.completedAt)) issues.push(`Session ${session.id} has an invalid completion timestamp.`);
  const protocolPhases = DEFAULT_ASSESSMENT_PROTOCOL.phases;
  if (session.trials.length !== 80) issues.push(`Session ${session.id} must contain exactly 80 raw trials.`);
  let nextIndex = 0;
  for (const protocolPhase of protocolPhases) {
    const phaseTrials = session.trials.filter((trial) => trial.phase === protocolPhase.phase);
    if (phaseTrials.length !== protocolPhase.trialCount) issues.push(`Session ${session.id} phase ${protocolPhase.phase} must contain ${protocolPhase.trialCount} trials.`);
    for (const direction of DEFAULT_ASSESSMENT_PROTOCOL.targetDirections) {
      if (phaseTrials.filter((trial) => trial.target.direction === direction).length !== protocolPhase.trialCount / 4) {
        issues.push(`Session ${session.id} phase ${protocolPhase.phase} is not balanced across ${direction} targets.`);
      }
    }
    for (const trial of phaseTrials) {
      if (trial.index !== nextIndex) issues.push(`Session ${session.id} trial indices are not contiguous and ordered.`);
      nextIndex += 1;
      if (trial.sessionId !== session.id || trial.provenance !== PROVENANCE) issues.push(`Trial ${trial.id} has mismatched session identity or provenance.`);
      if (trial.phase !== protocolPhase.phase || trial.rotationCondition !== protocolPhase.rotationCondition) issues.push(`Trial ${trial.id} does not match the protocol phase condition.`);
      if (!isFiniteDate(trial.targetPresentedAt) || !isFiniteDate(trial.movementOnsetAt) || !isFiniteDate(trial.movementCompletedAt)) issues.push(`Trial ${trial.id} has an invalid timestamp.`);
      if (!(Date.parse(trial.targetPresentedAt) <= Date.parse(trial.movementOnsetAt) && Date.parse(trial.movementOnsetAt) <= Date.parse(trial.movementCompletedAt))) issues.push(`Trial ${trial.id} timestamps are not monotonic.`);
      if (![trial.target.x, trial.target.y, trial.startPosition.x, trial.startPosition.y, trial.actualStartPosition.x, trial.actualStartPosition.y].every(Number.isFinite)) issues.push(`Trial ${trial.id} contains a non-finite coordinate.`);
      if (trial.trajectory.length < 2 || trial.trajectory.some((point, index) => ![point.x, point.y, point.elapsedMs].every(Number.isFinite) || point.elapsedMs < 0 || (index > 0 && point.elapsedMs < (trial.trajectory[index - 1]?.elapsedMs ?? 0)))) issues.push(`Trial ${trial.id} has an invalid raw trajectory.`);
    }
  }
  return issues;
}

function createAssessmentSession(spec: SessionSpec): SimulationAssessmentSession {
  const random = seededRandom(hashString(`${ASTER_ONE_SEED}:${spec.id}`));
  const planned = createPlannedTrials(spec.id, DEFAULT_ASSESSMENT_PROTOCOL, random);
  const trials = planned.map((plan): SimulationTrial => {
    const trialTime = Date.parse(spec.completedAt) - 80 * TRIAL_INTERVAL_MS + plan.index * TRIAL_INTERVAL_MS;
    const reactionMs = 220 + spec.timingOffsetMs + Math.floor(random() * 61) + (plan.phase === "early-adaptation" ? 18 : 0);
    const movementMs = 340 + Math.floor(random() * 101) + Math.round(spec.timingOffsetMs * 0.4);
    const side = random() < 0.5 ? -1 : 1;
    const phaseCurvature = curvatureForPhase(plan.phase);
    const curvature = side * (spec.pathCurvaturePx + phaseCurvature + random() * 1.25);
    const direction = DIRECTION_VECTOR[plan.targetDirection];
    const perpendicular = { x: -direction.y, y: direction.x };
    const target = { direction: plan.targetDirection, x: ORIGIN.x + direction.x * TARGET_RADIUS, y: ORIGIN.y + direction.y * TARGET_RADIUS };
    const targetPresentedAt = new Date(trialTime).toISOString();
    const movementOnsetAt = new Date(trialTime + reactionMs).toISOString();
    const movementCompletedAt = new Date(trialTime + reactionMs + movementMs).toISOString();
    const trajectory: readonly CursorTrajectoryPoint[] = [0.2, 0.4, 0.6, 0.8, 1].map((progress) => ({
      x: ORIGIN.x + direction.x * TARGET_RADIUS * progress + perpendicular.x * curvature * Math.sin(Math.PI * progress),
      y: ORIGIN.y + direction.y * TARGET_RADIUS * progress + perpendicular.y * curvature * Math.sin(Math.PI * progress),
      elapsedMs: reactionMs + movementMs * progress,
    }));
    return {
      id: plan.id,
      sessionId: plan.sessionId,
      index: plan.index,
      phase: plan.phase,
      rotationCondition: plan.rotationCondition,
      target,
      startPosition: ORIGIN,
      actualStartPosition: ORIGIN,
      measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor",
      targetPresentedAt,
      movementOnsetAt,
      movementCompletedAt,
      trajectory,
      outcome: "completed",
      provenance: PROVENANCE,
    };
  });
  return {
    id: spec.id,
    missionId: MISSION_ID,
    crewMemberId: CREW_ID,
    phaseId: spec.phaseId,
    label: spec.label,
    completedAt: spec.completedAt,
    relativeDay: spec.relativeDay,
    inputDevice: "mouse",
    protocolVersion: DEFAULT_ASSESSMENT_PROTOCOL.version,
    measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor",
    trials,
    provenance: PROVENANCE,
  };
}

function phase(id: string, label: string, phaseValue: SimulationMissionPhase, startedAt: string, endedAt: string, relativeStartDay: number, relativeEndDay: number): SimulationPhase {
  return { id, label, phase: phaseValue, startedAt, endedAt, relativeStartDay, relativeEndDay, provenance: PROVENANCE };
}

function curvatureForPhase(phaseValue: TrialPhase): number {
  switch (phaseValue) {
    case "baseline": return 0;
    case "early-adaptation": return 2.5;
    case "late-adaptation": return 0.8;
    case "de-adaptation": return -1.2;
  }
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32: a small, seeded PRNG used only to make the synthetic fixture reproducible. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function isFiniteDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
