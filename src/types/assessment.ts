import type { AdaptationSummary, BaselineComparison, PhaseMetricSummary } from "./metrics";
import type { TrialRecord } from "./trial";

export type AssessmentCondition = "normal-feedback" | "clockwise-45-degree-feedback-rotation";
export type AssessmentSessionStatus = "not-started" | "in-progress" | "paused" | "completed" | "aborted" | "incomplete";
export type InputDevice = "mouse" | "trackpad" | "unknown";

export interface AssessmentSessionMetadata {
  readonly sessionId: string;
  readonly participantId: string;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly inputDevice: InputDevice;
  readonly protocolVersion: string;
  readonly provenance: "browser-user-generated";
  readonly simulated: false;
}

export interface AssessmentSession {
  readonly metadata: AssessmentSessionMetadata;
  readonly status: AssessmentSessionStatus;
  readonly conditions: readonly AssessmentCondition[];
  readonly trials: readonly TrialRecord[];
  readonly phaseSummaries: readonly PhaseMetricSummary[];
  readonly adaptationSummary: AdaptationSummary | null;
  readonly baselineComparisons: readonly BaselineComparison[];
  /** Mouse and trackpad interaction cannot measure neural activity. */
  readonly neuralActivityMeasured: false;
  readonly clinicalDiagnosticStatus: "not-a-clinical-diagnosis";
}
