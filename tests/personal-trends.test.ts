import assert from "node:assert/strict";
import test from "node:test";
import { buildSelfReportTrendSeries } from "@/lib/analytics/personal-trends";
import type { RecoveryCheckInObservation } from "@/types/recovery";
import type { SelfReportedScore } from "@/types/checkin";

function checkIn(checkInId: string, recordedAt: string, fatigue: SelfReportedScore | null): RecoveryCheckInObservation {
  return {
    checkInId,
    participantId: "browser-participant",
    recordedAt,
    context: "general",
    scores: {
      dizzinessOrDisorientation: null,
      balanceOrCoordinationDifficulty: null,
      nausea: null,
      visualDiscomfort: null,
      fatigue,
      movementConfidence: null,
    },
    provenance: "browser-user-generated",
    interpretation: "self-report-not-an-objective-vestibular-measurement",
    linkState: "no-explicit-session-identifier",
    association: null,
    associationExplanation: "No explicit session association is stored.",
  };
}

test("self-report trend keeps a single item chronological and preserves unanswered gaps and zero scores", () => {
  const series = buildSelfReportTrendSeries([
    checkIn("later", "2026-06-03T12:00:00.000Z", 0),
    checkIn("middle", "2026-06-02T12:00:00.000Z", null),
    checkIn("earlier", "2026-06-01T12:00:00.000Z", 7),
  ], "fatigue");

  assert.deepEqual(series.points.map((point) => [point.checkInId, point.value]), [
    ["earlier", 7],
    ["middle", null],
    ["later", 0],
  ]);
  assert.equal(series.label, "Fatigue");
  assert.equal(series.polarity, "higher-is-worse");
  assert.equal(series.points[2]?.value, 0, "an explicit zero remains distinct from an unanswered null");
});

test("equal and invalid timestamps are ordered deterministically without changing records", () => {
  const invalid = checkIn("invalid", "not-a-date", 3);
  const second = checkIn("b", "2026-06-01T12:00:00.000Z", 2);
  const first = checkIn("a", "2026-06-01T12:00:00.000Z", 1);
  const series = buildSelfReportTrendSeries([invalid, second, first], "fatigue");

  assert.deepEqual(series.observations.map((observation) => observation.checkInId), ["a", "b", "invalid"]);
  assert.equal(invalid.recordedAt, "not-a-date");
});
