import assert from "node:assert/strict";
import test from "node:test";
import { calculateTrialMeasurements } from "../src/lib/assessment/metrics";
import { allowsOriginSensitiveMetrics, allowsTimingMetrics, measurementValidityForTrials } from "../src/lib/assessment/measurement-validity";
import { analyzeSimulationScenario, asCalculationTrial, summarizeRawTrialCounts } from "../src/lib/simulation/analysis";
import { getAsterOneScenario, validateSimulationScenario } from "../src/lib/simulation/scenario";

test("Aster-1 keeps its accepted deterministic inventory and missing positioning evidence", () => {
  const scenario = getAsterOneScenario();
  const inventory = summarizeRawTrialCounts(scenario);
  assert.deepEqual(inventory, { sessionCount: 6, trialCount: 480, completedTrialCount: 480, trajectoryPointCount: 2400, checkInCount: 9 });
  assert.equal(validateSimulationScenario(scenario).valid, true);
  assert.ok(scenario.assessmentSessions.every((session) => session.trials.length === 80));
  assert.ok(scenario.assessmentSessions.every((session) => session.trials.every((trial) => !("positioningCompletedAt" in trial))));
  assert.equal(scenario.manifest.measurementProtocolVersion, "0.3.0-actual-pointer-origin-hidden-cursor");
  assert.ok(scenario.assessmentSessions.flatMap((session) => session.trials).every((trial) => Number.isFinite(trial.actualStartPosition.x) && Number.isFinite(trial.actualStartPosition.y)));
});

test("simulation calculations receive the unmodified trial objects and preserve eligibility gates", () => {
  const scenario = getAsterOneScenario();
  const session = scenario.assessmentSessions[0];
  assert.ok(session);
  const trial = session.trials[0];
  assert.ok(trial);
  assert.equal(asCalculationTrial(trial), trial);
  const serializedBefore = JSON.stringify(scenario);
  const analysis = analyzeSimulationScenario(scenario);
  assert.equal(JSON.stringify(scenario), serializedBefore);

  const rawTrials = session.trials.map(asCalculationTrial);
  const validity = measurementValidityForTrials(rawTrials);
  assert.equal(validity, "inconsistent-origin-provenance");
  assert.equal(allowsTimingMetrics(validity), true);
  assert.equal(allowsOriginSensitiveMetrics(validity), false);

  const measurements = calculateTrialMeasurements(asCalculationTrial(trial));
  assert.equal(measurements.reactionTime.valid, true);
  assert.equal(measurements.movementTime.valid, true);
  assert.equal(measurements.directionalError.valid, false);
  assert.equal(measurements.directionalError.value, null);
  assert.equal(measurements.trajectoryDeviation.valid, false);
  assert.equal(measurements.trajectoryDeviation.value, null);
  assert.equal(measurements.correctionBehaviour.valid, false);
  assert.equal(measurements.correctionBehaviour.correctionCount, null);

  assert.equal(analysis.length, 6);
  assert.ok(analysis.every((item) => item.meanReactionTimeMs !== null && Number.isFinite(item.meanReactionTimeMs)));
  assert.ok(analysis.every((item) => item.meanMovementTimeMs !== null && Number.isFinite(item.meanMovementTimeMs)));
  assert.ok(analysis.every((item) => !item.originSensitiveEligible));
  assert.ok(analysis.every((item) => item.meanDirectionalErrorDegrees === null));
  assert.ok(analysis.every((item) => item.meanTrajectoryDeviationCssPixels === null));
  assert.ok(analysis.every((item) => item.meanCorrectionCount === null));
  assert.ok(analysis.every((item) => item.adaptation.directionalErrorChangeDegrees === null));
  assert.ok(analysis.every((item) => item.aftereffect.signedAftereffectDegrees === null));
});

test("synthetic check-ins keep their explicit assessment links and self-report separation", () => {
  const scenario = getAsterOneScenario();
  const sessions = new Set(scenario.assessmentSessions.map((session) => session.id));
  for (const checkIn of scenario.checkIns) {
    if (checkIn.assessmentSessionId) assert.ok(sessions.has(checkIn.assessmentSessionId));
    assert.equal(checkIn.interpretation, "fictional-self-report-not-an-objective-measurement");
    assert.equal(checkIn.provenance, "synthetic-scenario");
  }
  assert.equal(scenario.checkIns.filter((checkIn) => checkIn.assessmentSessionId).length, 5);
});
