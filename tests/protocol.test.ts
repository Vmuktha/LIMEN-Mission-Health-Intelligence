import assert from "node:assert/strict";
import test from "node:test";
import { createAssessmentProtocol, DEFAULT_ASSESSMENT_PROTOCOL } from "@/lib/assessment/protocol";
import { createBalancedTargetSequence, createPlannedTrials } from "@/lib/assessment/trial-engine";

const deterministicRandom = () => 0.5;

test("default protocol has documented phase counts, total, and current version", () => {
  assert.deepEqual(DEFAULT_ASSESSMENT_PROTOCOL.phases.map((phase) => phase.trialCount), [16, 32, 16, 16]);
  assert.equal(DEFAULT_ASSESSMENT_PROTOCOL.phases.reduce((total, phase) => total + phase.trialCount, 0), 80);
  assert.equal(DEFAULT_ASSESSMENT_PROTOCOL.version, "0.3.0");
});

test("planned trials are balanced in every phase and phase indices are contiguous", () => {
  const trials = createPlannedTrials("protocol-session", DEFAULT_ASSESSMENT_PROTOCOL, deterministicRandom);
  let expectedIndex = 0;
  for (const phase of DEFAULT_ASSESSMENT_PROTOCOL.phases) {
    const phaseTrials = trials.filter((trial) => trial.phase === phase.phase);
    assert.equal(phaseTrials.length, phase.trialCount);
    for (const direction of DEFAULT_ASSESSMENT_PROTOCOL.targetDirections) assert.equal(phaseTrials.filter((trial) => trial.targetDirection === direction).length, phase.trialCount / 4);
    assert.deepEqual(phaseTrials.map((trial) => trial.index), Array.from({ length: phase.trialCount }, (_, offset) => expectedIndex + offset));
    expectedIndex += phase.trialCount;
  }
});

test("configured valid counts remain balanced despite randomized order", () => {
  const protocol = createAssessmentProtocol({ baselineTrials: 8, adaptationTrials: 12, lateAdaptationTrials: 4, washoutTrials: 8 });
  const sequence = createBalancedTargetSequence(8, deterministicRandom);
  for (const direction of protocol.targetDirections) assert.equal(sequence.filter((value) => value === direction).length, 2);
  assert.equal(createPlannedTrials("configured", protocol, deterministicRandom).length, 32);
});

test("invalid protocol and sequence counts are rejected", () => {
  for (const invalidCount of [0, -4, 2, 4.5]) assert.throws(() => createAssessmentProtocol({ baselineTrials: invalidCount }), /positive trial count balanced/);
  assert.throws(() => createBalancedTargetSequence(6, deterministicRandom), /positive multiple of four/);
});
