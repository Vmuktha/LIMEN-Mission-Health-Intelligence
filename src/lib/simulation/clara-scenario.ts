import { DEFAULT_ASSESSMENT_PROTOCOL } from "@/lib/assessment/protocol";
import { createPlannedTrials } from "@/lib/assessment/trial-engine";
import type { SimulationAssessmentSession, SimulationCheckIn, SimulationMissionPhase, SimulationPhase, SimulationScenario, SimulationTrial } from "@/types/simulation";
import type { SelfReportedScore } from "@/types/checkin";
import type { CursorCoordinate, CursorTrajectoryPoint } from "@/types/trial";

export const CLARA_REYES_SCENARIO_ID = "aurora-2-clara-reyes" as const;
export const CLARA_REYES_SCENARIO_VERSION = "1.0.0" as const;
export const CLARA_REYES_GENERATOR_VERSION = "1.0.0" as const;
export const CLARA_REYES_SEED = 63122027;

const provenance = "synthetic-scenario" as const;
const missionId = "mission-aurora-2";
const crewId = "crew-clara-reyes";
const launchAt = "2029-04-18T09:00:00.000Z";
const dayMs = 86_400_000;
const origin: CursorCoordinate = { x: 400, y: 300 };
const radius = 120;
const vectors = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } } as const;

const sessionSpecs = [
  { key: "s0-preflight", label: "Preflight baseline", phaseId: "phase-preflight", day: -7, reactionOffset: 0, movementOffset: 0, curvature: 1.5 },
  { key: "s1-early-orbit", label: "Early orbit", phaseId: "phase-early-orbit", day: 2, reactionOffset: 62, movementOffset: 24, curvature: 8 },
  { key: "s2-orbit-day-8", label: "Established orbit · day 8", phaseId: "phase-inflight", day: 8, reactionOffset: 38, movementOffset: 17, curvature: 6 },
  { key: "s3-late-orbit", label: "Late orbit", phaseId: "phase-inflight", day: 21, reactionOffset: 20, movementOffset: 9, curvature: 3 },
  { key: "s4-postflight-day-1", label: "Postflight · day 1", phaseId: "phase-postflight", day: 29, reactionOffset: 74, movementOffset: 33, curvature: 9 },
  { key: "s5-postflight-day-14", label: "Postflight · day 14", phaseId: "phase-postflight", day: 42, reactionOffset: 28, movementOffset: 12, curvature: 4 },
] as const;

function atDay(day: number, minuteOffset = 0): string {
  return new Date(Date.parse(launchAt) + day * dayMs + minuteOffset * 60_000).toISOString();
}

function makePhase(id: string, label: string, phase: SimulationMissionPhase, startDay: number, endDay: number, startMinutes = 0, endMinutes = 0): SimulationPhase {
  return { id, label, phase, startedAt: atDay(startDay, startMinutes), endedAt: atDay(endDay, endMinutes), relativeStartDay: startDay, relativeEndDay: endDay, provenance };
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}

function randomFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function makeSession(spec: (typeof sessionSpecs)[number]): SimulationAssessmentSession {
  const id = `aurora-${spec.key}`;
  const completedAt = atDay(spec.day, 60);
  const random = randomFrom(hash(`${CLARA_REYES_SEED}:${id}`));
  const trials: SimulationTrial[] = createPlannedTrials(id, DEFAULT_ASSESSMENT_PROTOCOL, random).map((plan) => {
    const presentedAtMs = Date.parse(completedAt) - 80 * 5_000 + plan.index * 5_000;
    const reactionMs = 235 + spec.reactionOffset + Math.floor(random() * 71) + (plan.phase === "early-adaptation" ? 24 : 0);
    const movementMs = 365 + spec.movementOffset + Math.floor(random() * 91);
    const side = random() < 0.5 ? -1 : 1;
    const phaseCurvature = plan.phase === "early-adaptation" ? 3.1 : plan.phase === "late-adaptation" ? 1.2 : plan.phase === "de-adaptation" ? -1.4 : 0;
    const curvature = side * (spec.curvature + phaseCurvature + random() * 1.4);
    const direction = vectors[plan.targetDirection];
    const perpendicular = { x: -direction.y, y: direction.x };
    const target = { direction: plan.targetDirection, x: origin.x + direction.x * radius, y: origin.y + direction.y * radius };
    const targetPresentedAt = new Date(presentedAtMs).toISOString();
    const movementOnsetAt = new Date(presentedAtMs + reactionMs).toISOString();
    const movementCompletedAt = new Date(presentedAtMs + reactionMs + movementMs).toISOString();
    const trajectory: readonly CursorTrajectoryPoint[] = [0.2, 0.4, 0.6, 0.8, 1].map((progress) => ({
      x: origin.x + direction.x * radius * progress + perpendicular.x * curvature * Math.sin(Math.PI * progress),
      y: origin.y + direction.y * radius * progress + perpendicular.y * curvature * Math.sin(Math.PI * progress),
      elapsedMs: reactionMs + movementMs * progress,
    }));
    return {
      id: plan.id,
      sessionId: id,
      index: plan.index,
      phase: plan.phase,
      rotationCondition: plan.rotationCondition,
      target,
      startPosition: origin,
      actualStartPosition: origin,
      positioningCompletedAt: new Date(presentedAtMs - 30_000).toISOString(),
      measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor",
      targetPresentedAt,
      movementOnsetAt,
      movementCompletedAt,
      trajectory,
      outcome: "completed",
      provenance,
    };
  });
  return {
    id,
    missionId,
    crewMemberId: crewId,
    phaseId: spec.phaseId,
    label: spec.label,
    completedAt,
    relativeDay: spec.day,
    inputDevice: "mouse",
    protocolVersion: DEFAULT_ASSESSMENT_PROTOCOL.version,
    measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor",
    trials,
    provenance,
  };
}

export function getClaraReyesScenario(): SimulationScenario {
  const phases: readonly SimulationPhase[] = [
    makePhase("phase-preflight", "Preflight", "preflight", -7, 0),
    makePhase("phase-launch", "Launch", "launch", 0, 0, 0, 18),
    makePhase("phase-ascent", "Ascent and orbital insertion", "ascent", 0, 0, 18, 92),
    makePhase("phase-early-orbit", "Early orbit", "early-orbit", 0.064, 6),
    makePhase("phase-inflight", "In-flight operations", "inflight-operations", 6, 27),
    makePhase("phase-return", "Deorbit preparation and return", "return", 27, 28),
    makePhase("phase-landing", "Landing", "landing", 28, 28.0105),
    makePhase("phase-postflight", "Postflight follow-up", "postflight-recovery", 28.0105, 42.625),
  ];
  const assessmentSessions = sessionSpecs.map(makeSession);
  const sessionId = (key: string) => `aurora-${key}`;
  type CheckInFixture = readonly [number, SimulationCheckIn["context"], string | undefined, readonly [SelfReportedScore, SelfReportedScore, SelfReportedScore, SelfReportedScore, SelfReportedScore, SelfReportedScore]];
  const checkInFixtures: readonly CheckInFixture[] = [
    [-7, "general", undefined, [1, 1, 0, 1, 2, 8]],
    [0, "general", undefined, [1, 1, 1, 1, 3, 8]],
    [2, "post-assessment", sessionId("s1-early-orbit"), [5, 4, 3, 2, 6, 5]],
    [8, "post-assessment", sessionId("s2-orbit-day-8"), [4, 3, 2, 2, 5, 6]],
    [14, "general", undefined, [3, 3, 2, 1, 4, 7]],
    [21, "post-assessment", sessionId("s3-late-orbit"), [2, 2, 1, 1, 4, 7]],
    [28, "general", undefined, [3, 3, 1, 2, 5, 6]],
    [29, "post-assessment", sessionId("s4-postflight-day-1"), [4, 4, 2, 3, 7, 5]],
    [42, "post-assessment", sessionId("s5-postflight-day-14"), [2, 2, 1, 1, 3, 7]],
  ];
  const checkIns: readonly SimulationCheckIn[] = checkInFixtures.map(([relativeDay, context, sessionReference, scores], index) => {
    const [dizziness, balance, nausea, visual, fatigue, confidence] = scores;
    return {
      id: `aurora-c${index}`,
      missionId,
      crewMemberId: crewId,
      phaseId: relativeDay < 0 ? "phase-preflight" : relativeDay === 0 ? "phase-launch" : relativeDay <= 6 ? "phase-early-orbit" : relativeDay <= 27 ? "phase-inflight" : "phase-postflight",
      recordedAt: atDay(relativeDay, relativeDay === 0 ? -60 : 90),
      relativeDay,
      context,
      ...(sessionReference ? { assessmentSessionId: sessionReference } : {}),
      scores: { dizzinessOrDisorientation: dizziness, balanceOrCoordinationDifficulty: balance, nausea, visualDiscomfort: visual, fatigue, movementConfidence: confidence },
      interpretation: "fictional-self-report-not-an-objective-measurement",
      provenance,
    };
  });
  return {
    manifest: {
      schemaVersion: 1,
      scenarioId: CLARA_REYES_SCENARIO_ID,
      scenarioVersion: CLARA_REYES_SCENARIO_VERSION,
      generatorVersion: CLARA_REYES_GENERATOR_VERSION,
      seed: CLARA_REYES_SEED,
      title: "Aurora-2 · Clara Reyes",
      fictionNotice: "fictional-demonstration-not-real-telemetry",
      timeZone: "UTC",
      protocolVersion: DEFAULT_ASSESSMENT_PROTOCOL.version,
      measurementProtocolVersion: "0.3.0-actual-pointer-origin-hidden-cursor",
    },
    mission: { id: missionId, title: "Aurora-2", crewIds: [crewId], launchAt, landingAt: atDay(28), missionDurationDays: 28, provenance },
    crew: [{ id: crewId, displayName: "Dr. Clara Reyes", missionRole: "Flight engineer", fictional: true, provenance }],
    phases,
    events: [
      { id: "aurora-event-launch", title: "Launch", description: "Aurora-2 begins its fictional mission.", occurredAt: launchAt, phaseId: "phase-launch", provenance },
      { id: "aurora-event-orbit-insertion", title: "Orbit insertion", description: "The fictional vehicle reaches its planned orbital phase.", occurredAt: atDay(0, 92), phaseId: "phase-ascent", provenance },
      { id: "aurora-event-deorbit-preparation", title: "Deorbit preparation", description: "The crew begins the scenario return sequence.", occurredAt: atDay(27), phaseId: "phase-return", provenance },
      { id: "aurora-event-landing", title: "Landing", description: "Aurora-2 concludes its fictional flight.", occurredAt: atDay(28), phaseId: "phase-landing", provenance },
    ],
    transitions: [
      { id: "aurora-transition-preflight-launch", fromPhaseId: "phase-preflight", toPhaseId: "phase-launch", occurredAt: launchAt, provenance },
      { id: "aurora-transition-ascent-orbit", fromPhaseId: "phase-ascent", toPhaseId: "phase-early-orbit", occurredAt: atDay(0, 92), provenance },
      { id: "aurora-transition-orbit-return", fromPhaseId: "phase-inflight", toPhaseId: "phase-return", occurredAt: atDay(27), provenance },
      { id: "aurora-transition-return-landing", fromPhaseId: "phase-return", toPhaseId: "phase-landing", occurredAt: atDay(28), provenance },
      { id: "aurora-transition-landing-postflight", fromPhaseId: "phase-landing", toPhaseId: "phase-postflight", occurredAt: atDay(28, 15), provenance },
    ],
    assessmentSessions,
    checkIns,
  };
}
