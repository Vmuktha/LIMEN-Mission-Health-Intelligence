import { calculateAdaptationSummary } from "@/lib/analytics/adaptation";
import { summarizePhaseMetrics } from "@/lib/assessment/metrics";
import type { TrialEngineState } from "@/lib/assessment/trial-engine";
import type { AssessmentSession, InputDevice } from "@/types/assessment";

/**
 * Builds the persisted session record from a completed engine state. Keeping
 * this pure makes the final-trial pause and exactly-once persistence guards
 * testable without a React test renderer.
 */
export function buildCompletedAssessmentSession(completed: TrialEngineState, createdAt: string, inputDevice: InputDevice, completedAt = new Date().toISOString()): AssessmentSession {
  if (completed.status !== "completed") throw new Error("Only a completed assessment can be saved as a session.");
  return {
    metadata: {
      sessionId: completed.sessionId,
      participantId: "browser-participant",
      createdAt,
      completedAt,
      inputDevice,
      protocolVersion: completed.protocol.version,
      provenance: "browser-user-generated",
      simulated: false,
    },
    status: "completed",
    conditions: ["normal-feedback", "clockwise-45-degree-feedback-rotation"],
    trials: completed.records,
    phaseSummaries: completed.protocol.phases.map((phase) => summarizePhaseMetrics(completed.records, phase.phase)),
    adaptationSummary: calculateAdaptationSummary(completed.records),
    baselineComparisons: [],
    neuralActivityMeasured: false,
    clinicalDiagnosticStatus: "not-a-clinical-diagnosis",
  };
}

/** A completed session may be persisted only once and only with a creation timestamp. */
export function canPersistCompletedSession(completed: TrialEngineState | null, alreadyPersisted: boolean, createdAt: string | null): boolean {
  return completed !== null && completed.status === "completed" && !alreadyPersisted && createdAt !== null && createdAt.length > 0;
}
