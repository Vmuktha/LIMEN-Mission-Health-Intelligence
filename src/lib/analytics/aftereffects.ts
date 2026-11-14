import { calculateDirectionalError, summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { allowsOriginSensitiveMetrics, measurementValidityForTrials } from "@/lib/assessment/measurement-validity";
import type { AftereffectSummary } from "@/types/metrics";
import type { TrialRecord } from "@/types/trial";

/**
 * Compares baseline to the first N ordered de-adaptation (washout) trials.
 * The window is based on trial order, before invalid trials are excluded.
 */
export function calculateWashoutAftereffect(trials: readonly TrialRecord[], initialWashoutTrialWindow = 4): AftereffectSummary {
  if (!Number.isInteger(initialWashoutTrialWindow) || initialWashoutTrialWindow <= 0) throw new Error("Initial washout trial window must be a positive integer.");
  if (!allowsOriginSensitiveMetrics(measurementValidityForTrials(trials))) return { baselineMeanDirectionalErrorDegrees: null, initialWashoutMeanDirectionalErrorDegrees: null, signedAftereffectDegrees: null, magnitudeDegrees: null, validBaselineTrialCount: 0, validWashoutTrialCount: 0, initialWashoutTrialWindow };
  const baseline = summarizePhaseMetrics(trials, "baseline");
  const orderedWashout = trials.filter((trial) => trial.phase === "de-adaptation").sort((left, right) => left.index - right.index).slice(0, initialWashoutTrialWindow);
  const washoutValues = orderedWashout.flatMap((trial) => {
    const measurement = calculateDirectionalError(trial);
    return measurement.valid && measurement.value !== null ? [measurement.value] : [];
  });
  const initialWashoutMeanDirectionalErrorDegrees = washoutValues.length === 0 ? null : washoutValues.reduce((sum, value) => sum + value, 0) / washoutValues.length;
  const signedAftereffectDegrees = baseline.meanDirectionalErrorDegrees === null || initialWashoutMeanDirectionalErrorDegrees === null ? null : initialWashoutMeanDirectionalErrorDegrees - baseline.meanDirectionalErrorDegrees;
  return { baselineMeanDirectionalErrorDegrees: baseline.meanDirectionalErrorDegrees, initialWashoutMeanDirectionalErrorDegrees, signedAftereffectDegrees, magnitudeDegrees: signedAftereffectDegrees === null ? null : Math.abs(signedAftereffectDegrees), validBaselineTrialCount: baseline.validTrialCount, validWashoutTrialCount: washoutValues.length, initialWashoutTrialWindow };
}
