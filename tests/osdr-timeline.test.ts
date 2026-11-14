import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getOsdrDataset } from "@/lib/osdr/processed";
import {
  OSDR_TIMEPOINT_ORDER,
  buildOsdrAnalyteTimelines,
  buildOsdrParticipantTimeline,
  buildOsdrTimelineCollection,
  findOsdrTimeline,
  isSingleSpecimenCollection,
  osdrTimelinePointAt,
  osdrTimelineValues,
  specimensInCollection,
} from "@/lib/osdr/timeline";
import type { OsdrDataset, OsdrTimepointLabel } from "@/types/osdr";

const CMP = getOsdrDataset("osd-575-cmp");
const CARDIOVASCULAR = getOsdrDataset("osd-575-cardiovascular");
const CBC = getOsdrDataset("osd-569-cbc");

function series(dataset: OsdrDataset, analyteKey: string, role: "value" | "concentration" | "percent" = "value", participantToken = "C001") {
  const found = buildOsdrAnalyteTimelines(dataset, { participantToken, role }).find((candidate) => candidate.analyteKey === analyteKey);
  assert.ok(found, `missing ${analyteKey} (${role}) for ${participantToken} in ${dataset.datasetId}`);
  return found;
}

test("the CMP timeline preserves the real C001 albumin values in the study's own timepoint order", () => {
  const albumin = series(CMP, "albumin");
  assert.equal(albumin.specimen, "serum");
  assert.equal(albumin.studyAccession, "OSD-575");
  assert.equal(albumin.measurementCount, 7);
  assert.equal(albumin.missingCount, 0);
  assert.equal(albumin.unit, "gram_per_deciliter");
  assert.deepEqual(albumin.points.map((point) => point.timepointLabel), [...OSDR_TIMEPOINT_ORDER]);

  const expected: Readonly<Record<OsdrTimepointLabel, number>> = {
    "L-92": 5,
    "L-44": 5,
    "L-3": 4.9,
    "R+1": 4.9,
    "R+45": 4.9,
    "R+82": 5.1,
    "R+194": 4.6,
  };
  for (const point of albumin.points) {
    assert.equal(point.value, expected[point.timepointLabel]);
    assert.equal(point.missingToken, null);
    assert.equal(point.sampleId, `C001_serum_${point.timepointLabel}`);
  }
  assert.deepEqual(osdrTimelineValues(albumin), [
    expected["L-92"],
    expected["L-44"],
    expected["L-3"],
    expected["R+1"],
    expected["R+45"],
    expected["R+82"],
    expected["R+194"],
  ]);
});

test("source reference ranges are carried verbatim and are never evaluated", () => {
  const albumin = series(CMP, "albumin");
  const point = osdrTimelinePointAt(albumin, "L-3");
  assert.ok(point);
  assert.deepEqual(point.referenceRange, {
    min: 3.6,
    max: 5.1,
    minHeader: "albumin_range_min_gram_per_deciliter",
    maxHeader: "albumin_range_max_gram_per_deciliter",
    unit: "gram_per_deciliter",
  });
  assert.equal("inRange" in point, false);
  assert.equal("flag" in point, false);
  assert.equal("interpretation" in point, false);
});

test("missing values stay explicit and are never coerced to zero", () => {
  const bunRatio = series(CMP, "bun_to_creatinine_ratio");
  assert.equal(bunRatio.missingCount, 5);
  assert.equal(bunRatio.measurementCount, 7);
  assert.equal(bunRatio.unit, null);

  for (const timepoint of ["L-44", "L-92", "R+1", "R+45", "R+82"] as const) {
    const point = osdrTimelinePointAt(bunRatio, timepoint);
    assert.ok(point);
    assert.equal(point.value, null);
    assert.equal(point.missingToken, "NA");
    assert.notEqual(point.value, 0);
  }
  assert.equal(osdrTimelinePointAt(bunRatio, "L-3")?.value, 15);
  assert.equal(osdrTimelinePointAt(bunRatio, "R+194")?.value, 22);
  assert.ok(osdrTimelineValues(bunRatio).includes(null));
  assert.equal(osdrTimelineValues(bunRatio).includes(0), false);
});

test("cardiovascular concentration and opaque vendor percent series remain separate roles", () => {
  const all = buildOsdrAnalyteTimelines(CARDIOVASCULAR, { participantToken: "C001", role: "all" });
  const concentration = all.find((candidate) => candidate.analyteKey === "crp" && candidate.role === "concentration");
  const percent = all.find((candidate) => candidate.analyteKey === "crp" && candidate.role === "percent");
  assert.ok(concentration);
  assert.ok(percent);

  assert.equal(concentration.unit, "picogram_per_milliliter");
  assert.equal(concentration.points.length, 7);
  assert.equal(percent.unit, null);
  assert.equal(percent.points.length, 7);
  assert.notDeepEqual(osdrTimelineValues(concentration), osdrTimelineValues(percent));

  const measurable = buildOsdrAnalyteTimelines(CARDIOVASCULAR, { participantToken: "C001" });
  assert.equal(measurable.some((candidate) => candidate.role === "percent"), false);
  assert.equal(measurable.some((candidate) => candidate.role === "concentration"), true);
});

test("CBC measurements stay whole-blood and are kept distinct from serum datasets", () => {
  const hematocrit = series(CBC, "hematocrit");
  assert.equal(hematocrit.specimen, "whole-blood");
  assert.equal(hematocrit.studyAccession, "OSD-569");
  assert.equal(hematocrit.points.length, 7);

  for (const candidate of buildOsdrAnalyteTimelines(CBC, { participantToken: "C001" })) {
    assert.equal(candidate.specimen, "whole-blood");
    assert.equal(candidate.datasetId, "osd-569-cbc");
  }
  for (const candidate of buildOsdrAnalyteTimelines(CMP, { participantToken: "C001" })) {
    assert.equal(candidate.specimen, "serum");
    assert.equal(candidate.datasetId, "osd-575-cmp");
  }
});

test("a multi-specimen collection concatenates series without merging them", () => {
  const collection = buildOsdrTimelineCollection([CMP, CARDIOVASCULAR, CBC]);
  assert.deepEqual(specimensInCollection(collection), ["serum", "whole-blood"]);
  assert.equal(isSingleSpecimenCollection(collection), false);

  const expectedSeriesCount = [CMP, CARDIOVASCULAR, CBC].reduce((total, dataset) => total + buildOsdrAnalyteTimelines(dataset).length, 0);
  assert.equal(collection.series.length, expectedSeriesCount);
  assert.deepEqual(collection.datasets.map((dataset) => dataset.datasetId), ["osd-575-cmp", "osd-575-cardiovascular", "osd-569-cbc"]);

  const specimenByDataset = new Map(collection.datasets.map((dataset) => [dataset.datasetId, dataset.specimen]));
  for (const candidate of collection.series) {
    assert.equal(candidate.specimen, specimenByDataset.get(candidate.datasetId));
  }

  assert.equal(isSingleSpecimenCollection(buildOsdrTimelineCollection([CBC])), true);
  assert.deepEqual(specimensInCollection(buildOsdrTimelineCollection([CBC])), ["whole-blood"]);
});

test("timeline lookup requires the explicit dataset, participant, analyte, and role", () => {
  const collection = buildOsdrTimelineCollection([CMP, CBC]);
  const hematocrit = findOsdrTimeline(collection, {
    datasetId: "osd-569-cbc",
    participantToken: "C001",
    analyteKey: "hematocrit",
    role: "value",
  });
  assert.ok(hematocrit);
  assert.equal(hematocrit.specimen, "whole-blood");

  assert.equal(
    findOsdrTimeline(collection, {
      datasetId: "osd-575-cmp",
      participantToken: "C001",
      analyteKey: "hematocrit",
      role: "value",
    }),
    null,
    "a whole-blood analyte must not be found in a serum dataset",
  );
  assert.equal(
    findOsdrTimeline(collection, {
      datasetId: "osd-569-cbc",
      participantToken: "C002",
      analyteKey: "hematocrit",
      role: "value",
    })?.participantToken,
    "C002",
  );
});

test("participant timelines expose only that participant's measurable analyte series", () => {
  const cmpSeries = buildOsdrParticipantTimeline(CMP, "C001");
  assert.equal(cmpSeries.length, CMP.coverage.analyteCount);
  assert.ok(cmpSeries.every((candidate) => candidate.participantToken === "C001"));
  assert.ok(cmpSeries.every((candidate) => candidate.role === "value"));
  assert.equal(new Set(cmpSeries.map((candidate) => candidate.analyteKey)).size, CMP.coverage.analyteCount);

  const other = buildOsdrParticipantTimeline(CBC, "C004");
  assert.equal(other.length, CBC.coverage.analyteCount);
  assert.ok(other.every((candidate) => candidate.participantToken === "C004"));
});

test("the retrospective timeline exposes no in-flight timepoint", () => {
  for (const dataset of [CMP, CARDIOVASCULAR, CBC]) {
    for (const candidate of buildOsdrAnalyteTimelines(dataset)) {
      for (const point of candidate.points) {
        assert.equal(OSDR_TIMEPOINT_ORDER.includes(point.timepointLabel), true);
        assert.notEqual(point.timepointLabel.toLowerCase().includes("flight"), true);
      }
    }
  }
});

test("the timeline module stays pure and imports no processed dataset, network, or browser storage", () => {
  const source = readFileSync(path.resolve(process.cwd(), "src/lib/osdr/timeline.ts"), "utf8");
  assert.equal(source.includes("data/processed"), false);
  assert.equal(source.includes("indexedDB"), false);
  assert.equal(source.includes("localStorage"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("window."), false);
  assert.equal(/diagnos|readiness|risk score/i.test(source), false);
});
