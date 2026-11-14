import { calculateDirectionalError, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { allowsOriginSensitiveMetrics, allowsTimingMetrics, measurementValidityForTrials } from "@/lib/assessment/measurement-validity";
import type { AdaptationSummary } from "@/types/metrics";
import type { TrialRecord } from "@/types/trial";

export interface TrialDirectionalErrorTrend {
  readonly trialId: string;
  readonly index: number;
  readonly phase: "early-adaptation" | "late-adaptation";
  readonly directionErrorDegrees: number | null;
  readonly eligible: boolean;
}

/** Preserves trial order and retains ineligible trials as null rather than zero. */
export function calculateAdaptationDirectionalErrorTrend(trials: readonly TrialRecord[]): readonly TrialDirectionalErrorTrend[] {
  const collectionEligible = allowsOriginSensitiveMetrics(measurementValidityForTrials(trials));
  return trials.filter((trial): trial is TrialRecord & { readonly phase: "early-adaptation" | "late-adaptation" } => trial.phase === "early-adaptation" || trial.phase === "late-adaptation").map((trial) => {
    const directionalError = collectionEligible ? calculateDirectionalError(trial) : { value: null, valid: false };
    return { trialId: trial.id, index: trial.index, phase: trial.phase, directionErrorDegrees: directionalError.value, eligible: directionalError.valid };
  });
}

/**
 * Late minus early mean signed directional error; it is descriptive, not a
 * readiness prediction. Gating uses the whole supplied collection so protocols
 * cannot be compared merely because each phase is internally homogeneous.
 */
export function calculateAdaptationSummary(trials: readonly TrialRecord[]): AdaptationSummary {
  const validity = measurementValidityForTrials(trials);
  const eligibility = { allowTiming: allowsTimingMetrics(validity), allowDirectional: allowsOriginSensitiveMetrics(validity) };
  const earlyAdaptation = summarizePhaseMetrics(trials, "early-adaptation", eligibility);
  const lateAdaptation = summarizePhaseMetrics(trials, "late-adaptation", eligibility);
  const directionalErrorChangeDegrees = earlyAdaptation.meanDirectionalErrorDegrees === null || lateAdaptation.meanDirectionalErrorDegrees === null ? null : lateAdaptation.meanDirectionalErrorDegrees - earlyAdaptation.meanDirectionalErrorDegrees;
  return { earlyAdaptation, lateAdaptation, directionalErrorChangeDegrees };
}
