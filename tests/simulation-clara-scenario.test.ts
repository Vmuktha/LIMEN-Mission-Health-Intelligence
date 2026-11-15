import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzeSimulationScenario } from "@/lib/simulation/analysis";
import { getClaraReyesScenario, CLARA_REYES_SEED } from "@/lib/simulation/clara-scenario";
import { getAsterOneScenario, validateSimulationScenario } from "@/lib/simulation/scenario";

test("Clara has a separately versioned, deterministic, protocol-balanced synthetic fixture", () => {
  const scenario = getClaraReyesScenario();
  assert.deepEqual(getClaraReyesScenario(), scenario);
  assert.equal(scenario.manifest.scenarioId, "aurora-2-clara-reyes");
  assert.equal(scenario.manifest.scenarioVersion, "1.0.0");
  assert.equal(scenario.manifest.generatorVersion, "1.0.0");
  assert.equal(scenario.manifest.seed, CLARA_REYES_SEED);
  assert.deepEqual(validateSimulationScenario(scenario), { valid: true, issues: [] });
  assert.equal(scenario.assessmentSessions.length, 6);
  assert.equal(scenario.assessmentSessions.reduce((sum, session) => sum + session.trials.length, 0), 480);
  assert.equal(scenario.assessmentSessions.reduce((sum, session) => sum + session.trials.reduce((trialSum, trial) => trialSum + trial.trajectory.length, 0), 0), 2400);
  assert.ok(scenario.assessmentSessions.every((session) => session.trials.every((trial) => trial.positioningCompletedAt && Number.isFinite(Date.parse(trial.positioningCompletedAt)))));
  assert.ok(scenario.assessmentSessions.every((session) => session.trials.every((trial) => trial.provenance === "synthetic-scenario")));
  assert.equal(scenario.checkIns.length, 9);
  assert.ok(scenario.checkIns.every((checkIn) => !checkIn.assessmentSessionId || scenario.assessmentSessions.some((session) => session.id === checkIn.assessmentSessionId)));
});

test("Clara's complete origin evidence enables only the shared eligible origin-sensitive calculations", () => {
  const analysis = analyzeSimulationScenario(getClaraReyesScenario());
  assert.equal(analysis.length, 6);
  assert.ok(analysis.every((session) => session.timingEligible));
  assert.ok(analysis.every((session) => session.originSensitiveEligible));
  assert.ok(analysis.every((session) => session.meanDirectionalErrorDegrees !== null));
  assert.ok(analysis.every((session) => session.meanTrajectoryDeviationCssPixels !== null));
  assert.ok(analysis.every((session) => session.meanCorrectionCount !== null));
});

test("Clara's records remain distinct from accepted Aster-1 raw records", () => {
  const aster = getAsterOneScenario();
  const clara = getClaraReyesScenario();
  const asterIds = new Set(aster.assessmentSessions.flatMap((session) => session.trials.map((trial) => trial.id)));
  assert.ok(clara.assessmentSessions.flatMap((session) => session.trials).every((trial) => !asterIds.has(trial.id)));
  assert.ok(aster.assessmentSessions.every((session) => session.trials.every((trial) => !("positioningCompletedAt" in trial))));
  assert.notDeepEqual(clara, aster);
});

test("Clara's fixture provider cannot read or write operational storage or make network requests", () => {
  for (const file of ["src/lib/simulation/clara-scenario.ts", "src/lib/simulation/profiles.ts"]) {
    const source = readFileSync(file, "utf8");
    for (const forbidden of [/@\/lib\/storage/, /indexedDB/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /@\/lib\/observations/]) {
      assert.doesNotMatch(source, forbidden, `${file} must remain isolated`);
    }
  }
});
