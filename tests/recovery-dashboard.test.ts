import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryDataset } from "@/lib/analytics/recovery";
import {
  buildRecoveryDashboardModel,
  buildRecoveryTrendSeries,
  formatRecoveryDate,
  formatRecoveryDateTime,
  formatRecoveryMetricValue,
  formatRecoverySignedValue,
  formatSelfReportScore,
  formatSessionId,
  measurementProtocolShortLabel,
  resolveRecoveryParticipantResolution,
  type RecoveryAlignmentRow,
  type RecoveryDashboardModel,
} from "@/lib/analytics/recovery-dashboard";
import { recoveryCheckIn, recoverySession, timedOutTrial, tunedTrial, V1, V2, V3 } from "./recovery-fixtures";
import type { MeasurementProtocolVersion } from "@/types/trial";

function modelFor(
  sessions: Parameters<typeof buildRecoveryDataset>[0]["sessions"],
  checkIns: Parameters<typeof buildRecoveryDataset>[0]["checkIns"] = [],
  options: Parameters<typeof buildRecoveryDashboardModel>[1] = {},
): RecoveryDashboardModel {
  return buildRecoveryDashboardModel(buildRecoveryDataset({ sessions, checkIns }), options);
}

function metricView(model: RecoveryDashboardModel, metric: RecoveryDashboardModel["metricViews"][number]["metric"]) {
  const view = model.metricViews.find((candidate) => candidate.metric === metric);
  assert.ok(view, `missing metric view ${metric}`);
  return view;
}

function alignmentRow(model: RecoveryDashboardModel, field: RecoveryAlignmentRow["scoreField"]): RecoveryAlignmentRow {
  assert.ok(model.alignment, "missing alignment model");
  const row = model.alignment.rows.find((candidate) => candidate.scoreField === field);
  assert.ok(row, `missing alignment row ${field}`);
  return row;
}

/** A legacy record whose trials carry no per-trial measurement label. */
function unlabelledLegacySession(sessionId: string, completedAt: string) {
  const session = recoverySession({ sessionId, completedAt, measurementVersion: V1, protocolVersion: "0.1.0" });
  return { ...session, trials: session.trials.map((trial) => ({ ...trial, measurementProtocolVersion: undefined })) };
}

/** A session whose trials carry a measurement label LIMEN does not recognise. */
function unrecognizedProtocolSession(sessionId: string, completedAt: string) {
  const session = recoverySession({ sessionId, completedAt, measurementVersion: V2, protocolVersion: "0.2.0" });
  const label = "9.9.9-unrecognized" as MeasurementProtocolVersion;
  return { ...session, trials: session.trials.map((trial) => ({ ...trial, measurementProtocolVersion: label })) };
}

test("an empty recovery dataset produces an empty dashboard model without fabricated observations", () => {
  const model = modelFor([]);
  assert.equal(model.participant, null);
  assert.equal(model.participantResolution.status, "empty");
  assert.equal(model.current, null);
  assert.equal(model.currentOptions.length, 0);
  assert.equal(model.referenceOptions.length, 0);
  assert.equal(model.metricViews.length, 0);
  assert.equal(model.trendSeries.length, 0);
  assert.equal(model.checkIns.length, 0);
  assert.equal(model.alignment, null);
  assert.equal(model.quality, null);
  assert.equal(model.referenceMode, "none");
  assert.equal(model.overview.completedSessions, 0);
  assert.equal(model.overview.eligibleObservations, 0);
  assert.equal(model.overview.associatedCheckIns, 0);
  assert.equal(model.overview.mostRecentCompletedAt, null);
});

test("the overview counts completed sessions, eligible observations, and associated check-ins separately", () => {
  const model = modelFor([
    recoverySession({ sessionId: "eligible", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "no-eligible-trials", completedAt: "2026-01-02T00:10:00.000Z", trials: [timedOutTrial()] }),
    recoverySession({ sessionId: "legacy", measurementVersion: V1, completedAt: "2026-01-03T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "associated", assessmentSessionId: "eligible" }),
    recoveryCheckIn({ id: "unassociated" }),
  ]);
  assert.equal(model.overview.completedSessions, 3);
  assert.equal(model.overview.eligibleObservations, 2);
  assert.equal(model.overview.associatedCheckIns, 1);
  assert.equal(model.overview.mostRecentCompletedAt, "2026-01-03T00:10:00.000Z");
  assert.equal(model.overview.excludedSessions, 0);
  assert.equal(model.overview.rejectedRecords, 0);
});

test("the default reference is metric-specific and protocol-gated, not simply the latest session", () => {
  const model = modelFor([
    recoverySession({ sessionId: "legacy-earliest", measurementVersion: V1, completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "v2-reference", measurementVersion: V2, completedAt: "2026-01-15T00:10:00.000Z" }),
    recoverySession({ sessionId: "v2-current", measurementVersion: V2, completedAt: "2026-02-01T00:10:00.000Z" }),
  ]);
  assert.equal(model.current?.sessionId, "v2-current");
  const reaction = metricView(model, "reaction-time-mean");
  assert.equal(reaction.referenceSessionId, "v2-reference");
  assert.equal(reaction.referenceSource, "default-earliest-eligible");
  assert.equal(reaction.referenceCompatible, true);
  assert.equal(reaction.comparisonAvailable, true);
  const directional = metricView(model, "directional-error-mean");
  assert.equal(directional.referenceSessionId, "v2-reference");
  assert.equal(directional.comparisonAvailable, true);
});

test("an explicit reference change propagates to all eight metric comparisons and to the alignment", () => {
  const sessions = [
    recoverySession({ sessionId: "s1", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "s2", completedAt: "2026-01-15T00:10:00.000Z" }),
    recoverySession({ sessionId: "s3", completedAt: "2026-02-01T00:10:00.000Z" }),
  ];
  const checkIns = [
    recoveryCheckIn({ id: "post-s1", context: "post-assessment", assessmentSessionId: "s1", fatigue: 2 }),
    recoveryCheckIn({ id: "post-s2", context: "post-assessment", assessmentSessionId: "s2", fatigue: 4 }),
    recoveryCheckIn({ id: "post-s3", context: "post-assessment", assessmentSessionId: "s3", fatigue: 6 }),
  ];
  const automatic = modelFor(sessions, checkIns, { currentSessionId: "s3" });
  assert.equal(automatic.referenceMode, "metric-specific-default");
  assert.equal(metricView(automatic, "directional-error-mean").referenceSessionId, "s1");
  assert.equal(automatic.alignment?.referenceSessionId, "s1");

  const overridden = modelFor(sessions, checkIns, { currentSessionId: "s3", referenceSessionId: "s2" });
  assert.equal(overridden.referenceMode, "explicit-override");
  assert.equal(overridden.metricViews.length, 8);
  for (const view of overridden.metricViews) {
    assert.equal(view.referenceSessionId, "s2");
    assert.equal(view.referenceSource, "explicit-override");
    assert.equal(view.referenceCompatible, true);
    assert.equal(view.comparisonAvailable, true);
  }
  assert.equal(overridden.alignment?.referenceSessionId, "s2");
  assert.equal(overridden.alignment?.status, "available");
});

test("the current observation cannot be its own reference", () => {
  const model = modelFor([
    recoverySession({ sessionId: "s1", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "s2", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [], { currentSessionId: "s2", referenceSessionId: "s2" });
  assert.equal(model.referenceMode, "self-reference-rejected");
  assert.ok(model.referenceOptions.every((option) => option.sessionId !== "s2"));
  for (const view of model.metricViews) {
    assert.equal(view.comparisonAvailable, false);
    assert.equal(view.delta, null);
    assert.equal(view.referenceSessionId, null);
    assert.match(view.explanation ?? "", /cannot be selected as its own/i);
  }
});

test("an explicitly selected incompatible reference keeps its identity, protocol, and reason", () => {
  const model = modelFor([
    recoverySession({ sessionId: "v2-reference", measurementVersion: V2, completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "v3-current", measurementVersion: V3, completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [], { referenceSessionId: "v2-reference" });

  const view = metricView(model, "directional-error-mean");
  assert.equal(view.referenceStatus, "resolved");
  assert.equal(view.referenceSessionId, "v2-reference");
  assert.equal(view.referenceProtocolVersion, V2);
  assert.equal(view.referenceSource, "explicit-override");
  assert.equal(view.referenceCompatible, false);
  assert.equal(view.comparisonAvailable, false);
  assert.match(view.explanation ?? "", /required for this comparison/i);

  const option = model.referenceOptions.find((candidate) => candidate.sessionId === "v2-reference");
  assert.ok(option);
  assert.equal(option.protocolCompatible, false);
  assert.equal(option.compatibleMetricCount, 0);
  assert.match(option.protocolExplanation ?? "", /never pooled/i);
});

test("a legacy observation without a per-trial measurement label never proposes a corrected reference", () => {
  const model = modelFor([
    unlabelledLegacySession("legacy-unlabelled", "2025-12-01T00:10:00.000Z"),
    recoverySession({ sessionId: "corrected", measurementVersion: V3, completedAt: "2026-01-05T00:10:00.000Z" }),
  ], [], { currentSessionId: "legacy-unlabelled" });

  assert.equal(model.current?.measurementProtocolVersion, null);
  assert.equal(model.current?.measurementValidity, "legacy-origin-unverified");
  for (const view of model.metricViews) {
    assert.equal(view.referenceStatus, "unavailable");
    assert.equal(view.referenceSessionId, null);
    assert.equal(view.referenceCompatible, false);
    assert.equal(view.comparisonAvailable, false);
  }
  const timing = metricView(model, "reaction-time-mean");
  assert.match(timing.explanation ?? "", /no single known measurement protocol version/i);
  const origin = metricView(model, "directional-error-mean");
  assert.match(origin.explanation ?? "", /verified actual-pointer origins/i);
  const option = model.referenceOptions.find((candidate) => candidate.sessionId === "corrected");
  assert.ok(option);
  assert.equal(option.protocolCompatible, false);
  assert.equal(option.compatibleMetricCount, 0);
  assert.match(option.protocolExplanation ?? "", /no single known measurement protocol/i);
});

test("an unrecognized measurement protocol never produces a reference or a comparison", () => {
  const model = modelFor([
    unrecognizedProtocolSession("unknown-protocol", "2025-12-01T00:10:00.000Z"),
    recoverySession({ sessionId: "corrected", measurementVersion: V3, completedAt: "2026-01-05T00:10:00.000Z" }),
  ], [], { currentSessionId: "unknown-protocol" });

  assert.equal(model.current?.measurementValidity, "unknown-protocol");
  assert.equal(model.quality?.measurementValidityLabel, "Unknown measurement protocol");
  for (const view of model.metricViews) {
    assert.equal(view.currentValue?.eligible, false);
    assert.equal(view.comparisonAvailable, false);
    assert.match(view.explanation ?? "", /measurement protocol|unknown-protocol|withheld/i);
  }
  assert.equal(measurementProtocolShortLabel(model.current?.measurementProtocolVersion ?? null), "Unrecognized");
});

test("missing metric values remain unavailable with an explanation, never zero", () => {
  const model = modelFor([
    recoverySession({ sessionId: "missing-current", completedAt: "2026-02-01T00:10:00.000Z", trials: [timedOutTrial()] }),
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z" }),
  ], [], { currentSessionId: "missing-current" });
  const view = metricView(model, "directional-error-mean");
  assert.equal(view.currentValue?.eligible, false);
  assert.equal(view.currentValue?.value, null);
  assert.equal(view.comparisonAvailable, false);
  assert.equal(view.delta?.change, null);
  assert.equal(view.delta?.comparisonValid, false);
  assert.ok(view.explanation && view.explanation.length > 0);
  assert.ok(model.quality?.unavailableMetrics.some((metric) => metric.metric === "directional-error-mean"));
});

test("legacy timing-only observations remain visible without implying origin-sensitive eligibility", () => {
  const model = modelFor([
    recoverySession({ sessionId: "legacy-reference", measurementVersion: V1, completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "legacy-current", measurementVersion: V1, completedAt: "2026-02-01T00:10:00.000Z" }),
  ]);
  assert.equal(model.quality?.legacyTimingOnly, true);
  assert.equal(model.quality?.measurementValidity, "legacy-origin-unverified");
  assert.equal(metricView(model, "reaction-time-mean").legacyTimingOnly, true);
  assert.equal(metricView(model, "reaction-time-mean").comparisonAvailable, true);
  assert.equal(metricView(model, "reaction-time-mean").referenceSessionId, "legacy-reference");
  assert.equal(metricView(model, "directional-error-mean").legacyTimingOnly, false);
  assert.equal(metricView(model, "directional-error-mean").comparisonAvailable, false);
  assert.equal(model.overview.eligibleObservations, 2);
});

test("reference options expose per-metric eligibility reasons and protocol compatibility", () => {
  const model = modelFor([
    recoverySession({ sessionId: "candidate", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [], { currentSessionId: "current" });
  const option = model.referenceOptions.find((candidate) => candidate.sessionId === "candidate");
  assert.ok(option);
  assert.equal(option.eligibleMetricCount, 8);
  assert.equal(option.compatibleMetricCount, 8);
  assert.equal(option.protocolCompatible, true);
  assert.equal(option.metricEligibility.length, 8);
  assert.ok(option.metricEligibility.every((metric) => metric.eligible && metric.reason === null));

  const partial = modelFor([
    recoverySession({ sessionId: "candidate", completedAt: "2026-01-01T00:10:00.000Z", trials: [timedOutTrial()] }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [], { currentSessionId: "current" });
  const partialOption = partial.referenceOptions.find((candidate) => candidate.sessionId === "candidate");
  assert.ok(partialOption);
  assert.equal(partialOption.eligibleMetricCount, 0);
  assert.equal(partialOption.compatibleMetricCount, 0);
  assert.ok(partialOption.metricEligibility.every((metric) => !metric.eligible && (metric.reason ?? "").length > 0));
});

test("check-in history includes explicitly associated records and flags orphans", () => {
  const model = modelFor([
    recoverySession({ sessionId: "session-1", completedAt: "2026-01-01T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "associated", assessmentSessionId: "session-1", recordedAt: "2026-01-02T00:00:00.000Z", fatigue: 4 }),
    recoveryCheckIn({ id: "timestamp-only", recordedAt: "2026-01-01T00:10:00.000Z" }),
    recoveryCheckIn({ id: "orphan", assessmentSessionId: "missing-session", recordedAt: "2026-01-03T00:00:00.000Z" }),
  ]);
  assert.deepEqual(model.checkIns.map((entry) => entry.checkIn.checkInId), ["timestamp-only", "associated", "orphan"]);
  const associated = model.checkIns.find((entry) => entry.checkIn.checkInId === "associated");
  assert.ok(associated);
  assert.equal(associated.isAssociated, true);
  assert.equal(associated.associatedSessionId, "session-1");
  assert.equal(associated.scores.find((score) => score.field === "fatigue")?.value, 4);
  assert.equal(associated.scores.find((score) => score.field === "nausea")?.value, null);

  const timestampOnly = model.checkIns.find((entry) => entry.checkIn.checkInId === "timestamp-only");
  assert.ok(timestampOnly);
  assert.equal(timestampOnly.isAssociated, false);
  assert.match(timestampOnly.linkExplanation ?? "", /timestamp proximity/i);

  const orphan = model.checkIns.find((entry) => entry.checkIn.checkInId === "orphan");
  assert.ok(orphan);
  assert.equal(orphan.isAssociated, false);
  assert.equal(orphan.checkIn.linkState, "session-not-found");
  assert.match(orphan.linkLabel, /not found/i);
});

test("pre-assessment check-ins are excluded from performance–self-report alignment", () => {
  const model = modelFor([
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "current-post", context: "post-assessment", assessmentSessionId: "current", fatigue: 6 }),
    recoveryCheckIn({ id: "reference-pre", context: "pre-assessment", assessmentSessionId: "reference", fatigue: 1 }),
  ], { currentSessionId: "current" });

  assert.ok(model.alignment);
  assert.equal(model.alignment.status, "no-reference-checkins");
  assert.equal(model.alignment.rows.length, 0);
  assert.match(model.alignment.explanation ?? "", /no explicitly associated post-assessment/i);
  assert.equal(model.alignment.ignoredCheckInCount, 1);
});

test("general check-ins are excluded from performance–self-report alignment but kept in the history", () => {
  const model = modelFor([
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "current-post", context: "post-assessment", assessmentSessionId: "current", fatigue: 6 }),
    recoveryCheckIn({ id: "current-general", context: "general", assessmentSessionId: "current", fatigue: 3 }),
    recoveryCheckIn({ id: "reference-post", context: "post-assessment", assessmentSessionId: "reference", fatigue: 2 }),
  ], { currentSessionId: "current" });

  assert.ok(model.alignment);
  assert.equal(model.alignment.status, "available");
  assert.equal(model.alignment.currentCheckInCount, 1);
  assert.equal(model.alignment.rows.filter((row) => row.scoreField === "fatigue").length, 1);
  assert.equal(model.alignment.ignoredCheckInCount, 1);
  const general = model.checkIns.find((entry) => entry.checkIn.checkInId === "current-general");
  assert.ok(general);
  assert.equal(general.contextLabel, "General");
  assert.equal(general.isAssociated, true);
});

test("an orphaned check-in attached to the current session never reaches the alignment", () => {
  const model = modelFor([
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "current-post", context: "post-assessment", assessmentSessionId: "current", fatigue: 6 }),
    recoveryCheckIn({ id: "current-orphan", context: "post-assessment", assessmentSessionId: "not-a-session", fatigue: 9 }),
    recoveryCheckIn({ id: "reference-post", context: "post-assessment", assessmentSessionId: "reference", fatigue: 2 }),
  ], { currentSessionId: "current" });

  assert.ok(model.alignment);
  assert.equal(model.alignment.status, "available");
  assert.equal(model.alignment.currentCheckInCount, 1);
  assert.equal(model.alignment.ignoredCheckInCount, 1);
  const orphan = model.checkIns.find((entry) => entry.checkIn.checkInId === "current-orphan");
  assert.ok(orphan);
  assert.equal(orphan.isAssociated, false);
});

test("alignment preserves multiple explicitly associated post-assessment check-ins individually", () => {
  const model = modelFor([
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "current-post-1", context: "post-assessment", assessmentSessionId: "current", recordedAt: "2026-02-01T00:20:00.000Z", fatigue: 6 }),
    recoveryCheckIn({ id: "current-post-2", context: "post-assessment", assessmentSessionId: "current", recordedAt: "2026-02-01T00:30:00.000Z", fatigue: 7 }),
    recoveryCheckIn({ id: "reference-post", context: "post-assessment", assessmentSessionId: "reference", fatigue: 2 }),
  ], { currentSessionId: "current" });

  assert.ok(model.alignment);
  assert.equal(model.alignment.status, "available");
  assert.equal(model.alignment.currentCheckInCount, 2);
  assert.equal(model.alignment.referenceCheckInCount, 1);
  const fatigueRows = model.alignment.rows.filter((row) => row.scoreField === "fatigue");
  assert.equal(fatigueRows.length, 2);
  assert.deepEqual(new Set(fatigueRows.map((row) => row.currentCheckInId)), new Set(["current-post-1", "current-post-2"]));
});

test("alignment uses mathematical direction and preserves null self-report values", () => {
  const model = modelFor([
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z", trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, directionalErrorDegrees: 0 })) }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z", trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, directionalErrorDegrees: 10 })) }),
  ], [
    recoveryCheckIn({ id: "current-post", context: "post-assessment", assessmentSessionId: "current", fatigue: 6, nausea: 1, movementConfidence: 5 }),
    recoveryCheckIn({ id: "reference-post", context: "post-assessment", assessmentSessionId: "reference", fatigue: 2, nausea: 5, movementConfidence: 5 }),
  ], { currentSessionId: "current" });

  assert.ok(model.alignment);
  assert.equal(model.alignment.status, "available");
  assert.equal(alignmentRow(model, "fatigue").category, "both-increased");
  assert.equal(alignmentRow(model, "nausea").category, "opposite-directions");
  assert.equal(alignmentRow(model, "movementConfidence").category, "insufficient-data");

  const dizziness = alignmentRow(model, "dizzinessOrDisorientation");
  assert.equal(dizziness.currentScore, null);
  assert.equal(dizziness.referenceScore, null);
  assert.equal(dizziness.selfReportChange, null);
  assert.equal(dizziness.category, "insufficient-data");
  assert.match(dizziness.explanation ?? "", /not answered/i);
});

test("alignment reports no observed change only when both measures are unchanged", () => {
  const model = modelFor([
    recoverySession({ sessionId: "reference", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "current", completedAt: "2026-02-01T00:10:00.000Z" }),
  ], [
    recoveryCheckIn({ id: "current-post", context: "post-assessment", assessmentSessionId: "current", fatigue: 4 }),
    recoveryCheckIn({ id: "reference-post", context: "post-assessment", assessmentSessionId: "reference", fatigue: 4 }),
  ], { currentSessionId: "current" });
  assert.equal(alignmentRow(model, "fatigue").category, "no-observed-change");
  assert.equal(model.alignment?.performanceChange, 0);
});

test("trend series break at missing observations and measurement protocol changes without interpolation", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "a", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "gap", completedAt: "2026-01-02T00:10:00.000Z", trials: [timedOutTrial()] }),
      recoverySession({ sessionId: "b", completedAt: "2026-01-03T00:10:00.000Z" }),
      recoverySession({ sessionId: "v3", measurementVersion: V3, completedAt: "2026-01-04T00:10:00.000Z" }),
    ],
    checkIns: [],
  });
  const participant = dataset.participants[0];
  const series = buildRecoveryTrendSeries(participant, "directional-error-mean");
  assert.deepEqual(series.points.map((point) => point.observation.sessionId), ["a", "b", "v3"]);
  assert.equal(series.segments.length, 3);
  assert.deepEqual(series.segments.map((segment) => segment.points.map((point) => point.observation.sessionId)), [["a"], ["b"], ["v3"]]);
  assert.equal(series.observations.length, 4);
  assert.deepEqual(series.protocols, [V2, V3]);
  assert.equal(series.points.some((point) => point.observation.sessionId === "gap"), false);
});

test("the dashboard exposes the selected focus metric and its trend", () => {
  const sessions = [
    recoverySession({ sessionId: "s1", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "s2", completedAt: "2026-02-01T00:10:00.000Z" }),
  ];
  const defaultModel = modelFor(sessions);
  assert.equal(defaultModel.focusMetric, "directional-error-mean");
  const explicitModel = modelFor(sessions, [], { focusMetric: "movement-time-mean" });
  assert.equal(explicitModel.focusMetric, "movement-time-mean");
  assert.ok(explicitModel.trendSeries.some((series) => series.metric === "movement-time-mean"));
});

test("the data-quality view reports protocol, device, trial counts, and missing-value reasons", () => {
  const model = modelFor([
    recoverySession({ sessionId: "quality", inputDevice: "trackpad", trials: [tunedTrial(), timedOutTrial()] }),
  ]);
  assert.ok(model.quality);
  assert.equal(model.quality.inputDevice, "Trackpad");
  assert.equal(model.quality.totalTrials, 2);
  assert.equal(model.quality.timedOutTrials, 1);
  assert.equal(model.quality.measurementProtocolLabel, "v0.2.0 actual-pointer origin");
  assert.equal(model.quality.assessmentProtocolVersion, "0.2.0");
  assert.ok(model.quality.eligibleMetrics.length > 0);
  assert.ok(model.quality.missingDataExplanations.length > 0);
});

test("the data-quality view explains a mixed measurement protocol session", () => {
  const base = recoverySession({ sessionId: "mixed", completedAt: "2026-01-01T00:10:00.000Z" });
  const mixed = { ...base, trials: base.trials.map((trial, index) => ({ ...trial, measurementProtocolVersion: index % 2 === 0 ? V2 : V3 })) };
  const model = modelFor([mixed]);
  assert.ok(model.quality);
  assert.equal(model.quality.measurementValidity, "mixed-measurement-protocols");
  assert.equal(model.quality.timingMetricsEligible, false);
  assert.equal(model.quality.originSensitiveMetricsEligible, false);
  assert.match(model.quality.validityExplanation ?? "", /more than one measurement protocol version/i);
  assert.equal(model.quality.eligibleMetrics.length, 0);
  assert.ok(model.quality.missingDataExplanations.length > 0);
});

test("participant resolution prefers the browser profile, resolves a single profile, and reports ambiguity", () => {
  const empty = resolveRecoveryParticipantResolution(buildRecoveryDataset({ sessions: [], checkIns: [] }));
  assert.equal(empty.resolution.status, "empty");
  assert.equal(empty.participant, null);

  const browserProfile = resolveRecoveryParticipantResolution(buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "other", participantId: "participant-a", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "browser", participantId: "browser-participant", completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  }));
  assert.equal(browserProfile.resolution.status, "resolved");
  assert.equal(browserProfile.participant?.participantId, "browser-participant");

  const singleProfile = resolveRecoveryParticipantResolution(buildRecoveryDataset({
    sessions: [recoverySession({ sessionId: "only", participantId: "participant-a" })],
    checkIns: [],
  }));
  assert.equal(singleProfile.resolution.status, "resolved");
  assert.equal(singleProfile.participant?.participantId, "participant-a");

  const ambiguous = resolveRecoveryParticipantResolution(buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "a", participantId: "participant-a", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "b", participantId: "participant-b", completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [],
  }));
  assert.equal(ambiguous.resolution.status, "ambiguous");
  assert.equal(ambiguous.participant, null);
  assert.deepEqual(ambiguous.resolution.status === "ambiguous" ? ambiguous.resolution.participantIds : [], ["participant-a", "participant-b"]);
});

test("a check-in-only profile does not hide an otherwise valid observation profile", () => {
  const resolution = resolveRecoveryParticipantResolution(buildRecoveryDataset({
    sessions: [recoverySession({ sessionId: "observed", participantId: "participant-a" })],
    checkIns: [recoveryCheckIn({ id: "stray", participantId: "participant-b", context: "general" })],
  }));
  assert.equal(resolution.resolution.status, "resolved");
  assert.equal(resolution.participant?.participantId, "participant-a");
});

test("the dashboard model does not mutate the recovery dataset", () => {
  const dataset = buildRecoveryDataset({
    sessions: [
      recoverySession({ sessionId: "s1", completedAt: "2026-01-01T00:10:00.000Z" }),
      recoverySession({ sessionId: "s2", completedAt: "2026-02-01T00:10:00.000Z" }),
    ],
    checkIns: [recoveryCheckIn({ id: "c1", assessmentSessionId: "s1" })],
  });
  const snapshot = structuredClone(dataset);
  buildRecoveryDashboardModel(dataset, { currentSessionId: "s2", referenceSessionId: "s1", focusMetric: "reaction-time-mean" });
  assert.deepEqual(dataset, snapshot);
});

test("a participant profile with check-ins but no completed sessions still renders check-in history without metrics", () => {
  const model = modelFor([], [recoveryCheckIn({ id: "only-checkin", context: "general", fatigue: 3 })]);
  assert.ok(model.participant);
  assert.equal(model.current, null);
  assert.equal(model.metricViews.length, 0);
  assert.equal(model.checkIns.length, 1);
  assert.equal(model.checkIns[0].isAssociated, false);
  assert.equal(model.quality, null);
  assert.equal(model.overview.completedSessions, 0);
});

test("formatters keep units separate, sign the difference, and render timestamps in UTC", () => {
  assert.equal(formatRecoveryMetricValue(12.34, 1), "12.3");
  assert.equal(formatRecoveryMetricValue(12.34, 0), "12");
  assert.equal(formatRecoveryMetricValue(null, 1), "Unavailable");
  assert.equal(formatRecoverySignedValue(12.34, { metric: "directional-error-mean", label: "", shortLabel: "", description: "", unitLabel: "degrees", precision: 1, originSensitive: true }), "+12.3");
  assert.equal(formatRecoverySignedValue(-12.36, { metric: "directional-error-mean", label: "", shortLabel: "", description: "", unitLabel: "degrees", precision: 1, originSensitive: true }), "−12.4");
  assert.equal(formatRecoverySignedValue(0, { metric: "reaction-time-mean", label: "", shortLabel: "", description: "", unitLabel: "ms", precision: 0, originSensitive: false }), "0");
  assert.equal(formatRecoverySignedValue(null, { metric: "reaction-time-mean", label: "", shortLabel: "", description: "", unitLabel: "ms", precision: 0, originSensitive: false }), "Unavailable");
  assert.equal(formatSelfReportScore(null), "Not answered");
  assert.equal(formatSelfReportScore(0), "0");
  assert.equal(formatSessionId("short-id"), "short-id");
  assert.match(formatSessionId("a-very-long-session-identifier"), /…/);
  assert.match(formatRecoveryDateTime("2026-01-05T10:00:00.000Z"), /2026/);
  assert.match(formatRecoveryDateTime("2026-01-05T10:00:00.000Z"), /UTC$/);
  assert.equal(formatRecoveryDateTime(null), "Unavailable");
  assert.match(formatRecoveryDate("2026-01-05T23:30:00.000Z"), /Jan 5, 2026/);
});
