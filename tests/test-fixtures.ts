import type { AssessmentSession } from "@/types/assessment";
import type { CursorTrajectoryPoint, TrialPhase, TrialRecord } from "@/types/trial";

export function completedTrial(overrides: Partial<TrialRecord> = {}): TrialRecord {
  const trajectory: readonly CursorTrajectoryPoint[] = overrides.trajectory ?? [{ x: 0, y: -10, elapsedMs: 100 }];
  return {
    id: "trial-1",
    sessionId: "session-1",
    index: 0,
    phase: "baseline",
    rotationCondition: "none",
    target: { direction: "up", x: 0, y: -10 },
    startPosition: { x: 0, y: 0 },
    designatedStartPosition: { x: 0, y: 0 },
    actualStartPosition: { x: 0, y: 0 },
    positioningCompletedAt: "2026-01-01T00:00:00.000Z",
    measurementProtocolVersion: "0.2.0-actual-pointer-origin",
    targetPresentedAt: "2026-01-01T00:00:00.000Z",
    movementOnsetAt: "2026-01-01T00:00:00.100Z",
    movementCompletedAt: "2026-01-01T00:00:00.300Z",
    trajectory,
    outcome: "completed",
    ...overrides,
  };
}

/** A homogeneous legacy record with no verified actual origin or positioning timestamp. */
export function legacyTrial(overrides: Partial<TrialRecord> = {}): TrialRecord {
  return completedTrial({
    measurementProtocolVersion: "0.1.0-legacy-origin-unverified",
    actualStartPosition: undefined,
    positioningCompletedAt: undefined,
    ...overrides,
  });
}

export function withPhase(trial: TrialRecord, phase: TrialPhase, index: number): TrialRecord {
  return { ...trial, id: `${phase}-${index}`, phase, index };
}

export function assessmentSession(trials: readonly TrialRecord[], protocolVersion = "0.2.0", overrides: Partial<Omit<AssessmentSession, "trials">> = {}): AssessmentSession {
  return {
    metadata: { sessionId: "session-1", participantId: "browser-participant", createdAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T00:10:00.000Z", inputDevice: "mouse", protocolVersion, provenance: "browser-user-generated", simulated: false },
    status: "completed",
    conditions: ["normal-feedback", "clockwise-45-degree-feedback-rotation"],
    trials,
    phaseSummaries: [],
    adaptationSummary: null,
    baselineComparisons: [],
    neuralActivityMeasured: false,
    clinicalDiagnosticStatus: "not-a-clinical-diagnosis",
    ...overrides,
  };
}
