import assert from "node:assert/strict";
import test from "node:test";
import { summarizePhaseMetrics } from "@/lib/assessment/metrics";
import { completedTrial, withPhase } from "./test-fixtures";

test("baseline summaries remain descriptive and retain valid-trial counts", () => {
  const summary = summarizePhaseMetrics([withPhase(completedTrial(), "baseline", 0)], "baseline");
  assert.equal(summary.validTrialCount, 1);
  assert.equal(summary.meanDirectionalErrorDegrees, 0);
});
