import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_ASSESSMENT_PROTOCOL } from "@/lib/assessment/protocol";
import { ASTER_ONE_SEED, getAsterOneScenario, validateSimulationScenario } from "@/lib/simulation/scenario";

const expectedPhaseCounts = [16, 32, 16, 16];
const expectedSessions = [
  ["aster-s0-preflight", "Preflight baseline", -7, "phase-preflight"],
  ["aster-s1-early-orbit", "Early orbit", 2, "phase-early-orbit"],
  ["aster-s2-orbit-day-8", "Established orbit · day 8", 8, "phase-inflight"],
  ["aster-s3-late-orbit", "Late orbit", 21, "phase-inflight"],
  ["aster-s4-postflight-day-1", "Postflight · day 1", 29, "phase-postflight"],
  ["aster-s5-postflight-day-14", "Postflight · day 14", 42, "phase-postflight"],
] as const;

test("Aster-1 manifest declares the fictional scenario, seed, and preserved protocol", () => {
  const scenario = getAsterOneScenario();
  assert.equal(scenario.manifest.scenarioId, "aster-1-mara-venn");
  assert.equal(scenario.manifest.scenarioVersion, "1.0.0");
  assert.equal(scenario.manifest.generatorVersion, "1.0.0");
  assert.equal(scenario.manifest.seed, ASTER_ONE_SEED);
  assert.equal(scenario.manifest.fictionNotice, "fictional-demonstration-not-real-telemetry");
  assert.equal(scenario.manifest.protocolVersion, DEFAULT_ASSESSMENT_PROTOCOL.version);
  assert.equal(scenario.manifest.measurementProtocolVersion, "0.3.0-actual-pointer-origin-hidden-cursor");
  assert.deepEqual(scenario.assessmentSessions.map(({ id, label, relativeDay, phaseId }) => [id, label, relativeDay, phaseId]), expectedSessions);
});

test("all six sessions retain 80 raw trials and balanced direction counts in every protocol phase", () => {
  const scenario = getAsterOneScenario();
  assert.equal(scenario.assessmentSessions.length, 6);
  for (const session of scenario.assessmentSessions) {
    assert.equal(session.trials.length, 80, session.id);
    let expectedIndex = 0;
    for (let phaseIndex = 0; phaseIndex < DEFAULT_ASSESSMENT_PROTOCOL.phases.length; phaseIndex += 1) {
      const phase = DEFAULT_ASSESSMENT_PROTOCOL.phases[phaseIndex];
      assert.ok(phase);
      const trials = session.trials.filter((trial) => trial.phase === phase.phase);
      assert.equal(trials.length, expectedPhaseCounts[phaseIndex], `${session.id}/${phase.phase}`);
      assert.equal(phase.trialCount, expectedPhaseCounts[phaseIndex]);
      for (const direction of DEFAULT_ASSESSMENT_PROTOCOL.targetDirections) {
        assert.equal(trials.filter((trial) => trial.target.direction === direction).length, phase.trialCount / 4, `${session.id}/${phase.phase}/${direction}`);
      }
      for (const trial of trials) {
        assert.equal(trial.index, expectedIndex++);
        assert.equal(trial.sessionId, session.id);
        assert.equal(trial.rotationCondition, phase.rotationCondition);
        assert.equal(trial.outcome, "completed");
        assert.equal(trial.provenance, "synthetic-scenario");
        assert.ok(trial.trajectory.length >= 2);
        assert.ok(Date.parse(trial.targetPresentedAt) <= Date.parse(trial.movementOnsetAt));
        assert.ok(Date.parse(trial.movementOnsetAt) <= Date.parse(trial.movementCompletedAt));
      }
    }
  }
});

test("scenario generation is deterministic across complete raw domain output", () => {
  const first = getAsterOneScenario();
  const second = getAsterOneScenario();
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
});

test("scenario records have valid explicit links, chronology, and fictional provenance", () => {
  const scenario = getAsterOneScenario();
  assert.deepEqual(validateSimulationScenario(scenario), { valid: true, issues: [] });
  assert.ok(scenario.phases.length >= 7);
  assert.ok(scenario.events.length > 0);
  assert.ok(scenario.transitions.length > 0);
  assert.ok(scenario.checkIns.length > 0);
  assert.ok(scenario.crew.every((crew) => crew.fictional && crew.provenance === "synthetic-scenario"));
  assert.ok(scenario.phases.every((phase) => phase.provenance === "synthetic-scenario"));
  assert.ok(scenario.checkIns.every((checkIn) => checkIn.provenance === "synthetic-scenario"));
});

test("scenario domain has no operational persistence, network, or observation dependencies", () => {
  const sourceFiles = ["src/lib/simulation/scenario.ts", "src/types/simulation.ts"];
  const forbidden = [
    /@\/lib\/storage/,
    /indexedDB/,
    /localStorage/,
    /sessionStorage/,
    /\bfetch\s*\(/,
    /@\/lib\/observations/,
    /\/observations/,
  ];
  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${file} must remain isolated from operational data boundaries`);
  }
});
