import type { SimulationScenario } from "@/types/simulation";
import type { SimulationSessionAnalysis } from "./analysis";

export interface SimulationAlertSource {
  readonly id: string;
  readonly label: string;
  readonly timestamp: string;
  readonly href: string;
}

export interface SimulationAlert {
  readonly id: string;
  readonly title: string;
  readonly ruleId: string;
  readonly ruleVersion: "1.0.0";
  readonly condition: string;
  readonly value: string;
  readonly previousValue?: string;
  readonly currentValue?: string;
  readonly timestamp: string;
  readonly sources: readonly SimulationAlertSource[];
  readonly explanation: string;
  readonly limitations: string;
}

/** Deterministic, simulation-only examples; these rules do not write or call operational observation services. */
export function buildSimulationAlerts(scenario: SimulationScenario, analysis: readonly SimulationSessionAnalysis[]): readonly SimulationAlert[] {
  const alerts: SimulationAlert[] = [];
  const scored = [...scenario.checkIns]
    .filter((record) => record.scores.dizzinessOrDisorientation !== undefined)
    .sort((left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt));
  const current = scored.at(-1);
  const previous = scored.at(-2);
  const currentScore = current?.scores.dizzinessOrDisorientation;
  const previousScore = previous?.scores.dizzinessOrDisorientation;

  if (current && previous && currentScore !== undefined && previousScore !== undefined && currentScore !== previousScore) {
    alerts.push({
      id: `self-report-change:${previous.id}:${current.id}`,
      title: "A self-report changed between recorded check-ins",
      ruleId: "SIM-SELF-REPORT-CHANGE",
      ruleVersion: "1.0.0",
      condition: "The two latest answered dizziness/disorientation reports have different recorded values.",
      value: `${previousScore} → ${currentScore} on a 0–10 scale`,
      previousValue: `${previousScore} / 10`,
      currentValue: `${currentScore} / 10`,
      timestamp: current.recordedAt,
      sources: [previous, current].map((record) => ({ id: record.id, label: `Check-in · ${record.relativeDay < 0 ? `D${record.relativeDay}` : `D+${record.relativeDay}`}`, timestamp: record.recordedAt, href: `/simulation/check-ins?checkin=${encodeURIComponent(record.id)}` })),
      explanation: "This deterministic demonstration compares the two latest records that explicitly contain this item. The values remain subjective self-reports; no assessment is linked by timestamp proximity.",
      limitations: "A change is not a diagnosis, severity classification, clinical alert, recommendation, or evidence of causation.",
    });
  }

  const ineligible = analysis.find((session) => !session.originSensitiveEligible);
  if (ineligible) {
    const trial = ineligible.session.trials.find((record) => !record.positioningCompletedAt);
    alerts.push({
      id: `measurement-unavailable:${ineligible.session.id}`,
      title: "Origin-sensitive measurement unavailable",
      ruleId: "SIM-MEASUREMENT-AVAILABILITY",
      ruleVersion: "1.0.0",
      condition: "The accepted Aster-1 fixture does not contain a positioning-completion timestamp required by the existing eligibility rule.",
      value: "Not eligible · not zero",
      timestamp: ineligible.session.completedAt,
      sources: [{ id: ineligible.session.id, label: ineligible.session.label, timestamp: ineligible.session.completedAt, href: `/simulation/assessments?session=${encodeURIComponent(ineligible.session.id)}` }, ...(trial ? [{ id: trial.id, label: "Raw trial", timestamp: trial.targetPresentedAt, href: `/simulation/assessments?session=${encodeURIComponent(ineligible.session.id)}&trial=${trial.index}` }] : [])],
      explanation: "Timing values remain available where eligible. Directional error, trajectory deviation, correction behaviour, and related origin-dependent measures remain withheld by the shared calculation eligibility gate.",
      limitations: "This notice describes fixture completeness only. It does not assess a person, imply a health state, or change the accepted raw record.",
    });
  }
  return alerts;
}
