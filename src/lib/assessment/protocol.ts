import type { RotationCondition, TargetDirection, TrialPhase } from "@/types/trial";

/**
 * Shortened browser demonstration protocol inspired by, but not a reproduction
 * of, the visuomotor-rotation work reported by Tays et al. (2025).
 */
export interface AssessmentProtocol {
  readonly id: string;
  readonly version: string;
  readonly rotationDegreesClockwise: number;
  readonly targetDirections: readonly TargetDirection[];
  readonly phases: readonly ProtocolPhase[];
}

export interface ProtocolPhase {
  readonly phase: TrialPhase;
  readonly label: "Baseline" | "Adaptation" | "Late adaptation" | "Washout";
  readonly trialCount: number;
  readonly rotationCondition: RotationCondition;
}

export interface ProtocolOverrides {
  readonly baselineTrials?: number;
  readonly adaptationTrials?: number;
  readonly lateAdaptationTrials?: number;
  readonly washoutTrials?: number;
}

const TARGET_DIRECTIONS = ["up", "right", "down", "left"] as const;

/**
 * v0.3.0 hides the native browser cursor during active interaction so that
 * only the transformed feedback cursor is visible. It retains the v0.2.0
 * actual-pointer-origin procedure and is not directly comparable with v0.2.0
 * sessions for origin-sensitive metrics.
 */
export const CURRENT_PROTOCOL_VERSION = "0.3.0";
export const CURRENT_MEASUREMENT_PROTOCOL_VERSION = "0.3.0-actual-pointer-origin-hidden-cursor" as const;

export function createAssessmentProtocol(overrides: ProtocolOverrides = {}): AssessmentProtocol {
  const rotationDegreesClockwise = 45;
  const phases: readonly ProtocolPhase[] = [
    { phase: "baseline", label: "Baseline", trialCount: overrides.baselineTrials ?? 16, rotationCondition: "none" },
    { phase: "early-adaptation", label: "Adaptation", trialCount: overrides.adaptationTrials ?? 32, rotationCondition: "clockwise-45-degrees" },
    { phase: "late-adaptation", label: "Late adaptation", trialCount: overrides.lateAdaptationTrials ?? 16, rotationCondition: "clockwise-45-degrees" },
    { phase: "de-adaptation", label: "Washout", trialCount: overrides.washoutTrials ?? 16, rotationCondition: "none" },
  ];

  for (const protocolPhase of phases) {
    if (!Number.isInteger(protocolPhase.trialCount) || protocolPhase.trialCount <= 0 || protocolPhase.trialCount % TARGET_DIRECTIONS.length !== 0) {
      throw new Error("Each phase must have a positive trial count balanced across the four target directions.");
    }
  }
  return { id: "limen-browser-adaptation", version: CURRENT_PROTOCOL_VERSION, rotationDegreesClockwise, targetDirections: TARGET_DIRECTIONS, phases };
}

export const DEFAULT_ASSESSMENT_PROTOCOL = createAssessmentProtocol();
