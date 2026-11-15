import { calculateAdaptationSummary } from "@/lib/analytics/adaptation";
import { calculateWashoutAftereffect } from "@/lib/analytics/aftereffects";
import { calculateTrialMeasurements, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { allowsOriginSensitiveMetrics, allowsTimingMetrics, measurementValidityForTrials } from "@/lib/assessment/measurement-validity";
import type { TrialRecord, TrialPhase } from "@/types/trial";
import type { SimulationAssessmentSession, SimulationScenario, SimulationTrial } from "@/types/simulation";

export const SIMULATION_TRIAL_PHASES: readonly TrialPhase[] = ["baseline", "early-adaptation", "late-adaptation", "de-adaptation"];

/**
 * A read-only structural view lets the existing pure calculation functions
 * inspect the fixture without converting, saving, or augmenting its raw trials.
 * In particular, positioningCompletedAt remains absent, so the operational
 * eligibility gate correctly withholds origin-sensitive values.
 */
export function asCalculationTrial(trial: SimulationTrial): TrialRecord {
  return trial;
}

export interface SimulationSessionAnalysis {
  readonly session: SimulationAssessmentSession;
  readonly measurementValidity: ReturnType<typeof measurementValidityForTrials>;
  readonly timingEligible: boolean;
  readonly originSensitiveEligible: boolean;
  readonly completedTrials: number;
  readonly phaseSummaries: readonly ReturnType<typeof summarizePhaseMetrics>[];
  readonly meanReactionTimeMs: number | null;
  readonly meanMovementTimeMs: number | null;
  readonly meanDirectionalErrorDegrees: number | null;
  readonly meanTrajectoryDeviationCssPixels: number | null;
  readonly meanCorrectionCount: number | null;
  readonly adaptation: ReturnType<typeof calculateAdaptationSummary>;
  readonly aftereffect: ReturnType<typeof calculateWashoutAftereffect>;
}

export function analyzeSimulationSession(session: SimulationAssessmentSession): SimulationSessionAnalysis {
  const trials = session.trials.map(asCalculationTrial);
  const measurementValidity = measurementValidityForTrials(trials);
  const timingEligible = allowsTimingMetrics(measurementValidity);
  const originSensitiveEligible = allowsOriginSensitiveMetrics(measurementValidity);
  const measurements = trials.map(calculateTrialMeasurements);
  const average = (values: readonly (number | null)[]) => {
    const eligible = values.filter((value): value is number => value !== null && Number.isFinite(value));
    return eligible.length ? eligible.reduce((sum, value) => sum + value, 0) / eligible.length : null;
  };
  return {
    session,
    measurementValidity,
    timingEligible,
    originSensitiveEligible,
    completedTrials: session.trials.filter((trial) => trial.outcome === "completed").length,
    phaseSummaries: SIMULATION_TRIAL_PHASES.map((phase) => summarizePhaseMetrics(trials, phase)),
    meanReactionTimeMs: timingEligible ? average(measurements.map(({ reactionTime }) => reactionTime.valid ? reactionTime.value : null)) : null,
    meanMovementTimeMs: timingEligible ? average(measurements.map(({ movementTime }) => movementTime.valid ? movementTime.value : null)) : null,
    meanDirectionalErrorDegrees: originSensitiveEligible ? average(measurements.map(({ directionalError }) => directionalError.valid ? directionalError.value : null)) : null,
    meanTrajectoryDeviationCssPixels: originSensitiveEligible ? average(measurements.map(({ trajectoryDeviation }) => trajectoryDeviation.valid ? trajectoryDeviation.value : null)) : null,
    meanCorrectionCount: originSensitiveEligible ? average(measurements.map(({ correctionBehaviour }) => correctionBehaviour.valid ? correctionBehaviour.correctionCount : null)) : null,
    adaptation: calculateAdaptationSummary(trials),
    aftereffect: calculateWashoutAftereffect(trials),
  };
}

export function analyzeSimulationScenario(scenario: SimulationScenario): readonly SimulationSessionAnalysis[] {
  return scenario.assessmentSessions.map(analyzeSimulationSession);
}

export function summarizeRawTrialCounts(scenario: SimulationScenario) {
  const trials = scenario.assessmentSessions.flatMap(({ trials: sessionTrials }) => sessionTrials);
  return {
    sessionCount: scenario.assessmentSessions.length,
    trialCount: trials.length,
    completedTrialCount: trials.filter(({ outcome }) => outcome === "completed").length,
    trajectoryPointCount: trials.reduce((sum, trial) => sum + trial.trajectory.length, 0),
    checkInCount: scenario.checkIns.length,
  };
}
