import assert from "node:assert/strict";
import test from "node:test";
import { buildOsdrChartObservations, buildOsdrChartSegments, listOsdrAnalytes, OSDR_TIMEPOINT_ORDER } from "@/lib/osdr/chart";
import { OSDR_DATASETS } from "@/lib/osdr/processed";

test("OSDR chart choices retain dataset, specimen, analyte role and units", () => {
  for (const dataset of OSDR_DATASETS) {
    const options = listOsdrAnalytes(dataset);
    assert.ok(options.length > 0);
    assert.equal(new Set(options.map((item) => `${item.key}::${item.role}`)).size, options.length);
    assert.ok(options.every((item) => typeof item.label === "string" && item.kind));
  }
});

test("OSDR series is ordered by source timepoint and restricted to one pseudonymous sample token", () => {
  const dataset = OSDR_DATASETS.find((item) => item.datasetId === "osd-575-cmp");
  assert.ok(dataset);
  const option = listOsdrAnalytes(dataset)[0];
  assert.ok(option);
  const token = dataset.coverage.participantTokens[0];
  assert.ok(token);
  const observations = buildOsdrChartObservations(dataset, token, option.key, option.role);
  assert.deepEqual(observations.map((item) => item.timepoint), OSDR_TIMEPOINT_ORDER);
  assert.ok(observations.every((item) => item.sampleId === null || item.sampleId.startsWith(`${token}_`)));
  assert.ok(observations.every((item) => item.measurement === null || item.measurement.specimen === dataset.specimen));
});

test("OSDR chart retains actual missing-value tokens and supports one exact timepoint", () => {
  const dataset = OSDR_DATASETS.find((item) => item.datasetId === "osd-569-cbc");
  assert.ok(dataset);
  const missing = dataset.measurements.find((item) => item.value === null);
  assert.ok(missing);
  const chart = buildOsdrChartObservations(dataset, missing.participantToken, missing.analyteKey, missing.role, missing.timepointLabel);
  assert.equal(chart.length, 1);
  assert.equal(chart[0]?.sampleId, missing.sampleId);
  assert.equal(chart[0]?.measurement?.missingToken, missing.missingToken);
});

test("OSDR line geometry splits at missing source values instead of closing the gap", () => {
  const dataset = OSDR_DATASETS.find((item) => item.datasetId === "osd-569-cbc");
  assert.ok(dataset);
  const missing = dataset.measurements.find((item) => item.value === null);
  assert.ok(missing);
  const observations = buildOsdrChartObservations(dataset, missing.participantToken, missing.analyteKey, missing.role);
  const segments = buildOsdrChartSegments(observations);
  const missingIndex = observations.findIndex((item) => item.measurement?.value === null);
  assert.ok(missingIndex >= 0);
  assert.equal(segments.flatMap((segment) => segment.points).some((point) => point.index === missingIndex), false);
  for (const segment of segments) {
    for (let index = 1; index < segment.points.length; index += 1) {
      assert.equal(segment.points[index]?.index, (segment.points[index - 1]?.index ?? -2) + 1);
    }
  }
});

test("empty or cross-token queries do not invent or cross a source sample boundary", () => {
  const dataset = OSDR_DATASETS[0];
  assert.ok(dataset);
  assert.ok(buildOsdrChartObservations(dataset, "unknown-token", "unknown-analyte", "value").every((item) => item.sampleId === null && item.measurement === null));
});
