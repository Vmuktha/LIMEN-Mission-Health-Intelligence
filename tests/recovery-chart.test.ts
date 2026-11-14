import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryDataset } from "@/lib/analytics/recovery";
import {
  buildRecoveryChartDomain,
  buildRecoveryChartGeometry,
  buildRecoveryChartPointLabel,
  buildRecoveryChartTicks,
  buildRecoveryChartXIndices,
  formatRecoveryChartValue,
  recoveryChartProtocolColor,
} from "@/lib/analytics/recovery-chart";
import { buildRecoveryTrendSeries, recoveryMetricPresentation } from "@/lib/analytics/recovery-dashboard";
import { recoverySession, timedOutTrial, tunedTrial, V2, V3 } from "./recovery-fixtures";

function seriesFor(sessions: Parameters<typeof buildRecoveryDataset>[0]["sessions"]) {
  const dataset = buildRecoveryDataset({ sessions, checkIns: [] });
  const participant = dataset.participants[0];
  assert.ok(participant);
  return buildRecoveryTrendSeries(participant, "directional-error-mean");
}

test("the chart domain pads a value range and stays empty without finite data", () => {
  assert.equal(buildRecoveryChartDomain(null, null), null);
  assert.equal(buildRecoveryChartDomain(0, null), null);
  assert.equal(buildRecoveryChartDomain(Number.NaN, 10), null);
  const padded = buildRecoveryChartDomain(10, 20);
  assert.ok(padded);
  assert.equal(padded.max, 20.8);
  assert.equal(padded.min, 9.2);
});

test("a single value receives a symmetric domain so the point is not drawn on the axis", () => {
  const domain = buildRecoveryChartDomain(5, 5);
  assert.ok(domain);
  assert.equal(domain.min, 4);
  assert.equal(domain.max, 6);
  const zeroDomain = buildRecoveryChartDomain(0, 0);
  assert.ok(zeroDomain);
  assert.equal(zeroDomain.min, -1);
  assert.equal(zeroDomain.max, 1);
});

test("axis ticks descend from the domain maximum and are empty without a domain", () => {
  assert.deepEqual(buildRecoveryChartTicks(null), []);
  const ticks = buildRecoveryChartTicks({ min: 0, max: 10 });
  assert.equal(ticks.length, 5);
  assert.equal(ticks[0], 10);
  assert.equal(ticks.at(-1), 0);
});

test("horizontal tick indices cover the observation range without duplicates", () => {
  assert.deepEqual(buildRecoveryChartXIndices(0), []);
  assert.deepEqual(buildRecoveryChartXIndices(1), [0]);
  assert.deepEqual(buildRecoveryChartXIndices(2), [0, 1]);
  const indices = buildRecoveryChartXIndices(9);
  assert.equal(indices[0], 0);
  assert.equal(indices.at(-1), 8);
  assert.equal(new Set(indices).size, indices.length);
});

test("chart geometry keeps gaps and protocol boundaries apart", () => {
  const series = seriesFor([
    recoverySession({ sessionId: "a", completedAt: "2026-01-01T00:10:00.000Z" }),
    recoverySession({ sessionId: "gap", completedAt: "2026-01-02T00:10:00.000Z", trials: [timedOutTrial()] }),
    recoverySession({ sessionId: "b", completedAt: "2026-01-03T00:10:00.000Z" }),
    recoverySession({ sessionId: "v3", measurementVersion: V3, completedAt: "2026-01-04T00:10:00.000Z" }),
  ]);
  const geometry = buildRecoveryChartGeometry(series);
  assert.equal(geometry.observationCount, 4);
  assert.equal(geometry.segments.length, 3);
  assert.deepEqual(geometry.segments.map((segment) => segment.points.length), [1, 1, 1]);
  assert.equal(geometry.xPositions.length, 4);
  assert.ok(geometry.xPositions[0] < geometry.xPositions[1]);
  assert.ok(geometry.xPositions[1] < geometry.xPositions[2]);
  assert.ok(geometry.ticks.length > 0);
});

test("a strictly positive series does not draw a zero reference line", () => {
  const positive = Array.from({ length: 8 }, (_, index) => tunedTrial({ index, directionalErrorDegrees: 12 }));
  const series = seriesFor([
    recoverySession({ sessionId: "positive", completedAt: "2026-01-01T00:10:00.000Z", trials: positive }),
  ]);
  const geometry = buildRecoveryChartGeometry(series);
  assert.equal(geometry.showsZeroLine, false);
  assert.equal(geometry.zeroLineY, null);
});

test("chart geometry for a single observation centres the point and draws no line", () => {
  const series = seriesFor([recoverySession({ sessionId: "only", completedAt: "2026-01-01T00:10:00.000Z" })]);
  const geometry = buildRecoveryChartGeometry(series);
  assert.equal(geometry.observationCount, 1);
  assert.equal(geometry.segments.length, 1);
  assert.equal(geometry.segments[0].points.length, 1);
  assert.deepEqual(geometry.xIndices, [0]);
});

test("chart geometry without eligible points has no domain and no segments", () => {
  const series = seriesFor([recoverySession({ sessionId: "gap", completedAt: "2026-01-01T00:10:00.000Z", trials: [timedOutTrial()] })]);
  const geometry = buildRecoveryChartGeometry(series);
  assert.equal(geometry.domain, null);
  assert.deepEqual(geometry.ticks, []);
  assert.deepEqual(geometry.segments, []);
  assert.equal(geometry.zeroLineY, null);
});

test("a signed metric range draws the zero reference line", () => {
  const series = seriesFor([
    recoverySession({ sessionId: "negative", completedAt: "2026-01-01T00:10:00.000Z", trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, directionalErrorDegrees: -20 })) }),
    recoverySession({ sessionId: "positive", completedAt: "2026-01-02T00:10:00.000Z", trials: Array.from({ length: 8 }, (_, index) => tunedTrial({ index, directionalErrorDegrees: 20 })) }),
  ]);
  const geometry = buildRecoveryChartGeometry(series);
  assert.equal(geometry.showsZeroLine, true);
  assert.ok(geometry.zeroLineY !== null);
});

test("point labels state the value, unit, eligible trials, and protocol", () => {
  const series = seriesFor([recoverySession({ sessionId: "a", completedAt: "2026-01-01T00:10:00.000Z" })]);
  const point = series.points[0];
  assert.ok(point);
  const label = buildRecoveryChartPointLabel(point, recoveryMetricPresentation("directional-error-mean"));
  assert.match(label, /2026/);
  assert.match(label, /degrees/);
  assert.match(label, /8 of 8 trials eligible/);
  assert.match(label, /v0\.2\.0/);
});

test("chart value formatting and protocol colours are deterministic", () => {
  assert.equal(formatRecoveryChartValue(12.34, 1), "12.3");
  assert.equal(formatRecoveryChartValue(12.34, 0), "12");
  assert.equal(recoveryChartProtocolColor(V2), "#475569");
  assert.equal(recoveryChartProtocolColor(V3), "#0e7490");
  assert.equal(recoveryChartProtocolColor(null), "#94a3b8");
});
