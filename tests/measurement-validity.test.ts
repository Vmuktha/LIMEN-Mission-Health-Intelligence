import assert from "node:assert/strict";
import test from "node:test";
import { allowsOriginSensitiveMetrics, allowsTimingMetrics, isCorrectedOriginTrial, measurementProtocolsAreComparable, measurementProtocolVersionsForTrials, measurementValidityForSession, measurementValidityForTrials } from "@/lib/assessment/measurement-validity";
import type { TrialRecord } from "@/types/trial";
import { assessmentSession, completedTrial, legacyTrial } from "./test-fixtures";

const V2 = "0.2.0-actual-pointer-origin" as const;
const V3 = "0.3.0-actual-pointer-origin-hidden-cursor" as const;

function v3Trial(id = "v3") {
  return completedTrial({ id, measurementProtocolVersion: V3 });
}

test("empty trial collections are explicitly no-trials rather than legacy", () => {
  assert.equal(measurementValidityForTrials([]), "no-trials");
  assert.equal(allowsTimingMetrics("no-trials"), false);
  assert.equal(allowsOriginSensitiveMetrics("no-trials"), false);
});

test("v0.2.0 and v0.3.0 are each corrected but never one pooled comparable group", () => {
  const v2 = completedTrial();
  const v3 = v3Trial();
  assert.equal(isCorrectedOriginTrial(v2), true);
  assert.equal(isCorrectedOriginTrial(v3), true);
  assert.deepEqual([...measurementProtocolVersionsForTrials([v2, v3])].sort(), [V2, V3].sort());
  assert.equal(measurementValidityForTrials([v2]), "corrected-actual-origin");
  assert.equal(measurementValidityForTrials([v3]), "corrected-actual-origin");
  assert.equal(measurementValidityForTrials([v2, v3]), "mixed-measurement-protocols");
  assert.equal(allowsTimingMetrics("mixed-measurement-protocols"), false);
  assert.equal(allowsOriginSensitiveMetrics("mixed-measurement-protocols"), false);
});

test("legacy, non-finite, unpositioned, and unknown records are handled conservatively", () => {
  const legacy = legacyTrial();
  const nonFinite = completedTrial({ actualStartPosition: { x: Number.NaN, y: 0 } });
  const unpositioned = completedTrial({ positioningCompletedAt: undefined });
  const noVersion = { ...completedTrial(), measurementProtocolVersion: undefined };
  assert.equal(isCorrectedOriginTrial(legacy), false);
  assert.equal(isCorrectedOriginTrial(nonFinite), false);
  assert.equal(isCorrectedOriginTrial(unpositioned), false);
  assert.equal(isCorrectedOriginTrial(noVersion), false);
  assert.equal(measurementValidityForTrials([legacy]), "legacy-origin-unverified");
  assert.equal(allowsTimingMetrics("legacy-origin-unverified"), true);
  assert.equal(allowsOriginSensitiveMetrics("legacy-origin-unverified"), false);
  assert.equal(measurementValidityForTrials([nonFinite]), "inconsistent-origin-provenance");
  assert.equal(allowsTimingMetrics("inconsistent-origin-provenance"), true);
  assert.equal(allowsOriginSensitiveMetrics("inconsistent-origin-provenance"), false);
  assert.equal(measurementValidityForTrials([noVersion]), "unknown-protocol");
  assert.equal(allowsTimingMetrics("unknown-protocol"), false);
  assert.equal(allowsOriginSensitiveMetrics("unknown-protocol"), false);
  assert.equal(measurementValidityForTrials([completedTrial(), legacy]), "mixed-measurement-protocols");
});

test("protocol comparison requires two verified-origin trials with identical explicit versions", () => {
  const v2a = completedTrial();
  const v2b = completedTrial({ id: "v2b" });
  const v3a = v3Trial("v3a");
  const v3b = v3Trial("v3b");
  assert.equal(measurementProtocolsAreComparable(v2a, v2b), true);
  assert.equal(measurementProtocolsAreComparable(v3a, v3b), true);
  assert.equal(measurementProtocolsAreComparable(v2a, v3a), false);
  assert.equal(measurementProtocolsAreComparable(legacyTrial(), legacyTrial({ id: "legacy-2" })), false);
  assert.equal(measurementProtocolsAreComparable(v2a, legacyTrial()), false);
  assert.equal(measurementProtocolsAreComparable(undefined, undefined), false);
});

test("session validity cross-checks stored protocol metadata against trial-level versions", () => {
  const v2 = completedTrial();
  const v3 = v3Trial();
  assert.equal(measurementValidityForSession(assessmentSession([v2], "0.2.0")), "corrected-actual-origin");
  assert.equal(measurementValidityForSession(assessmentSession([v3], "0.3.0")), "corrected-actual-origin");
  assert.equal(measurementValidityForSession(assessmentSession([legacyTrial()], "0.1.0")), "legacy-origin-unverified");
  assert.equal(measurementValidityForSession(assessmentSession([v2], "0.3.0")), "inconsistent-session-protocol");
  assert.equal(measurementValidityForSession(assessmentSession([v2], "  ")), "inconsistent-session-protocol");
  assert.equal(measurementValidityForSession(assessmentSession([v2, v3], "0.3.0")), "mixed-measurement-protocols");
  assert.equal(measurementValidityForSession(assessmentSession([], "0.3.0")), "no-trials");
});

test("unrecognized stored measurement labels are unknown rather than legacy", () => {
  const future: TrialRecord = { ...completedTrial(), measurementProtocolVersion: "0.4.0-future-protocol" as unknown as TrialRecord["measurementProtocolVersion"] };
  assert.equal(measurementValidityForTrials([future]), "unknown-protocol");
  assert.equal(measurementValidityForSession(assessmentSession([future], "0.4.0")), "unknown-protocol");
  assert.equal(allowsTimingMetrics("unknown-protocol"), false);
  assert.equal(allowsOriginSensitiveMetrics("unknown-protocol"), false);
});

test("historical unversioned trials are legacy only when the stored session is v0.1.0", () => {
  const unversioned = { ...completedTrial(), measurementProtocolVersion: undefined };
  assert.equal(measurementValidityForSession(assessmentSession([unversioned], "0.1.0")), "legacy-origin-unverified");
  assert.equal(measurementValidityForSession(assessmentSession([unversioned], "0.2.0")), "unknown-protocol");
  assert.equal(measurementValidityForSession(assessmentSession([unversioned], "0.3.0")), "unknown-protocol");
});
