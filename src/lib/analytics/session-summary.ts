import { calculateAdaptationSummary } from "@/lib/analytics/adaptation";
import { calculateTrialMeasurements, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { allowsOriginSensitiveMetrics, allowsTimingMetrics, measurementValidityForSession, type MeasurementValidity } from "@/lib/assessment/measurement-validity";
import { calculateWashoutAftereffect } from "@/lib/analytics/aftereffects";
import type { AssessmentSession } from "@/types/assessment";
import type { TrialPhase } from "@/types/trial";

export interface AssessmentResultsSummary {
  readonly measurementValidity: MeasurementValidity;
  readonly totalTrials: number;
  readonly completedTrials: number;
  readonly invalidTrials: number;
  readonly incompleteTrials: number;
  readonly meanReactionTimeMs: number | null;
  readonly meanMovementTimeMs: number | null;
  /** Mean of the trial-level initial directional errors across all phases. */
  readonly meanDirectionalErrorDegrees: number | null;
  readonly meanTrajectoryDeviationCssPixels: number | null;
  readonly meanCorrectionCount: number | null;
  readonly adaptationDirectionalErrorChangeDegrees: number | null;
  /** Signed washout minus baseline directional error; positive is clockwise. */
  readonly signedWashoutAftereffectDegrees: number | null;
  readonly phaseSummaries: AssessmentSession["phaseSummaries"];
}

/**
 * Descriptive aggregation of an already completed browser session; never a
 * readiness score. Derived summaries are recomputed from the raw trial records
 * at analysis/display time so historical stored summaries cannot mask valid
 * timing data. The stored session is never mutated.
 */
export function summarizeAssessmentResults(session: AssessmentSession): AssessmentResultsSummary {
  const measurementValidity = measurementValidityForSession(session);
  const timingEligible = allowsTimingMetrics(measurementValidity);
  const originEligible = allowsOriginSensitiveMetrics(measurementValidity);
  const measurements = session.trials.map(calculateTrialMeasurements);
  const values = <T extends { readonly value: number | null; readonly valid: boolean }>(items: readonly T[]) => items.flatMap((item) => item.valid && item.value !== null ? [item.value] : []);
  const correctionCounts = measurements.flatMap((measurement) => measurement.correctionBehaviour.valid && measurement.correctionBehaviour.correctionCount !== null ? [measurement.correctionBehaviour.correctionCount] : []);
  const average = (items: readonly number[]) => items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : null;
  const aftereffect = calculateWashoutAftereffect(session.trials);
  const adaptation = calculateAdaptationSummary(session.trials);
  const phaseSummaries = phasesForSummary(session).map((phase) => summarizePhaseMetrics(session.trials, phase, { allowTiming: timingEligible, allowDirectional: originEligible }));
  return {
    measurementValidity,
    totalTrials: session.trials.length,
    completedTrials: session.trials.filter((trial) => trial.outcome === "completed").length,
    invalidTrials: session.trials.filter((trial) => trial.outcome === "invalid").length,
    incompleteTrials: session.trials.filter((trial) => trial.outcome === "timed-out" || trial.outcome === "aborted").length,
    meanReactionTimeMs: timingEligible ? average(values(measurements.map((measurement) => measurement.reactionTime))) : null,
    meanMovementTimeMs: timingEligible ? average(values(measurements.map((measurement) => measurement.movementTime))) : null,
    meanDirectionalErrorDegrees: originEligible ? average(values(measurements.map((measurement) => measurement.directionalError))) : null,
    meanTrajectoryDeviationCssPixels: originEligible ? average(values(measurements.map((measurement) => measurement.trajectoryDeviation))) : null,
    meanCorrectionCount: originEligible ? average(correctionCounts) : null,
    adaptationDirectionalErrorChangeDegrees: originEligible ? adaptation.directionalErrorChangeDegrees : null,
    signedWashoutAftereffectDegrees: originEligible ? aftereffect.signedAftereffectDegrees : null,
    phaseSummaries,
  };
}

/** Preserve the stored phase structure, then include any phase present only in raw trials. */
function phasesForSummary(session: AssessmentSession): readonly TrialPhase[] {
  return [...new Set([...session.phaseSummaries.map((summary) => summary.phase), ...session.trials.map((trial) => trial.phase)])];
}
