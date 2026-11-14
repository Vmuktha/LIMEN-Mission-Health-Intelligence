import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { associateDatasets } from "@/lib/osdr/association";
import { buildOsdrDataset } from "@/lib/osdr/build";
import { OSDR_UNIT_TOKENS } from "@/lib/osdr/columns";
import { parseCsv } from "@/lib/osdr/csv";
import { OSDR_DATASET_DEFINITIONS } from "@/lib/osdr/definitions";
import { getOsdrDataset, OSDR_DATASETS } from "@/lib/osdr/processed";
import type { OsdrManifest } from "@/types/osdr";
import { buildFrom, definitionFor, readSource } from "./osdr-fixtures";

const EXPECTED = [
  { datasetId: "osd-575-cmp", samples: 28, analytes: 19, measurements: 532, columns: 57, perSample: 19 },
  { datasetId: "osd-575-cardiovascular", samples: 28, analytes: 9, measurements: 504, columns: 18, perSample: 18 },
  { datasetId: "osd-569-cbc", samples: 28, analytes: 20, measurements: 560, columns: 60, perSample: 20 },
] as const;

test("each selected dataset has the exact expected dimensions", () => {
  for (const expected of EXPECTED) {
    const { dataset } = buildFrom(expected.datasetId);
    assert.equal(dataset.coverage.sampleCount, expected.samples, expected.datasetId);
    assert.equal(dataset.coverage.analyteCount, expected.analytes, expected.datasetId);
    assert.equal(dataset.coverage.measurementCount, expected.measurements, expected.datasetId);
    assert.equal(dataset.assay.measurementColumnCount, expected.columns, expected.datasetId);
    for (const sample of dataset.samples) {
      assert.equal(sample.measurementCount, expected.perSample, `${sample.sampleId} in ${expected.datasetId}`);
    }
  }
});

test("participant tokens and timepoint labels are the documented four and seven", () => {
  for (const expected of EXPECTED) {
    const { dataset } = buildFrom(expected.datasetId);
    assert.deepEqual(dataset.coverage.participantTokens, ["C001", "C002", "C003", "C004"]);
    assert.deepEqual(dataset.coverage.timepointsObserved, [
      "L-92",
      "L-44",
      "L-3",
      "R+1",
      "R+45",
      "R+82",
      "R+194",
    ]);
    assert.equal(dataset.coverage.participantTokenCount, 4);
  }
});

test("CBC missingness is structured and confined to MCH, MCHC and MCV", () => {
  const { dataset } = buildFrom("osd-569-cbc");
  const missing = dataset.measurements.filter((measurement) => measurement.missingToken !== null);
  assert.equal(missing.length, 7);
  assert.ok(missing.every((measurement) => measurement.missingToken === "empty"));

  const missingKeys = missing
    .map((measurement) => `${measurement.sampleId}|${measurement.analyteKey}`)
    .sort();
  // Plain lexicographic order: "R+194" sorts before "R+1_" because "9" < "_".
  assert.deepEqual(missingKeys, [
    "C002_whole-blood_L-3_cbc|mchc",
    "C002_whole-blood_L-44_cbc|mchc",
    "C002_whole-blood_L-92_cbc|mchc",
    "C002_whole-blood_R+194_cbc|mcv",
    "C002_whole-blood_R+1_cbc|mchc",
    "C003_whole-blood_L-92_cbc|mch",
    "C004_whole-blood_L-92_cbc|mch",
  ]);
});

test("CMP missingness preserves the ratio gap and the N/A reference maxima", () => {
  const { dataset } = buildFrom("osd-575-cmp");
  const missing = dataset.measurements.filter((measurement) => measurement.missingToken !== null);
  assert.equal(missing.length, 23);
  assert.equal(missing.filter((measurement) => measurement.missingToken === "NA").length, 22);
  assert.equal(missing.filter((measurement) => measurement.missingToken === "empty").length, 1);

  const notApplicable = dataset.measurements.filter(
    (measurement) => measurement.referenceRange?.maxHeader.startsWith("egfr_") === true,
  );
  assert.equal(notApplicable.length, 56);
  assert.ok(notApplicable.every((measurement) => measurement.referenceRange?.max === null));

  const ratioGap = dataset.measurements.find(
    (measurement) => measurement.sampleId === "C002_serum_R+82" && measurement.analyteKey === "bun_to_creatinine_ratio",
  );
  assert.ok(ratioGap);
  assert.equal(ratioGap.referenceRange?.max, null);
  assert.equal(ratioGap.referenceRange?.min, null);
});

test("original sample identifiers are preserved verbatim from the source files", () => {
  for (const definition of OSDR_DATASET_DEFINITIONS) {
    const { rows } = parseCsv(readSource(definition.relativePath));
    const sourceIds = rows.slice(1).map((row) => row[0].trim());
    const { dataset } = buildFrom(definition.datasetId);

    assert.deepEqual(
      dataset.samples.map((sample) => sample.sampleId),
      sourceIds,
      definition.datasetId,
    );

    const sampleIds = new Set(dataset.samples.map((sample) => sample.sampleId));
    for (const measurement of dataset.measurements) {
      assert.ok(sampleIds.has(measurement.sampleId), `${measurement.sampleId} is not a source identifier`);
    }
  }
});

test("every measurement carries its own study, source and specimen provenance", () => {
  for (const expected of EXPECTED) {
    const { dataset } = buildFrom(expected.datasetId);
    for (const measurement of dataset.measurements) {
      assert.equal(measurement.studyAccession, dataset.study.accession);
      assert.equal(measurement.studyDoi, dataset.study.doi);
      assert.equal(measurement.sourceFileName, dataset.source.fileName);
      assert.equal(measurement.specimen, dataset.specimen);
      assert.equal(measurement.assayName, dataset.assay.name);
      assert.equal(measurement.derivedLookupKey, `${measurement.participantToken}::${measurement.timepointLabel}`);
    }
  }
});

test("units are restricted to the declared header tokens and values stay finite", () => {
  const allowed = new Set<string>(OSDR_UNIT_TOKENS);
  for (const expected of EXPECTED) {
    const { dataset } = buildFrom(expected.datasetId);
    for (const measurement of dataset.measurements) {
      if (measurement.unit !== null) assert.ok(allowed.has(measurement.unit), measurement.unit);
      if (measurement.value !== null) {
        assert.equal(Number.isFinite(measurement.value), true);
      }
      if (measurement.referenceRange?.unit != null) {
        assert.ok(allowed.has(measurement.referenceRange.unit), measurement.referenceRange.unit);
      }
    }
  }
});

test("cross-study association links serum and whole blood without rewriting identifiers", () => {
  const cmp = buildFrom("osd-575-cmp").dataset;
  const cbc = buildFrom("osd-569-cbc").dataset;
  const before = cmp.samples.map((sample) => sample.sampleId);

  const result = associateDatasets(cbc, cmp);

  assert.equal(result.associations.length, 28);
  assert.deepEqual(result.unmatchedLeft, []);
  assert.deepEqual(result.unmatchedRight, []);

  for (const association of result.associations) {
    assert.equal(association.participantIdentityVerified, false);
    assert.equal(association.specimenTypesDistinct, true);
    assert.match(association.left.sampleId, /^C\d+_whole-blood_/);
    assert.match(association.right.sampleId, /^C\d+_serum_/);
    assert.equal(association.left.sampleId === association.right.sampleId, false);
  }

  assert.deepEqual(
    cmp.samples.map((sample) => sample.sampleId),
    before,
  );
});

test("the builder is deterministic for identical input", () => {
  for (const definition of OSDR_DATASET_DEFINITIONS) {
    const text = readSource(definition.relativePath);
    const integrity = { sha256: "fixed", byteSize: Buffer.byteLength(text) };
    const first = buildOsdrDataset(definition, text, integrity);
    const second = buildOsdrDataset(definition, text, integrity);
    assert.equal(JSON.stringify(first.dataset), JSON.stringify(second.dataset), definition.datasetId);
  }
});

test("the committed processed files match a fresh regeneration", () => {
  for (const definition of OSDR_DATASET_DEFINITIONS) {
    const buffer = readFileSync(path.resolve(process.cwd(), definition.relativePath));
    const integrity = {
      sha256: createHash("sha256").update(buffer).digest("hex"),
      byteSize: buffer.byteLength,
    };
    const rebuilt = buildOsdrDataset(definition, buffer.toString("utf8"), integrity);
    const committed = JSON.parse(
      readFileSync(path.resolve(process.cwd(), `data/processed/osdr/${definition.datasetId}.json`), "utf8"),
    ) as unknown;
    assert.deepEqual(committed, JSON.parse(JSON.stringify(rebuilt.dataset)), definition.datasetId);
  }
});

test("the manifest agrees with the processed files and the runtime loader", () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "data/processed/osdr/manifest.json"), "utf8"),
  ) as OsdrManifest;

  assert.equal(manifest.datasets.length, OSDR_DATASETS.length);
  for (const entry of manifest.datasets) {
    const dataset = getOsdrDataset(entry.datasetId);
    assert.equal(dataset.study.accession, entry.studyAccession);
    assert.equal(dataset.source.sha256, entry.sha256);
    assert.equal(dataset.coverage.sampleCount, entry.sampleCount);
    assert.equal(dataset.coverage.measurementCount, entry.measurementCount);
    assert.equal(entry.errorCount, 0);
    assert.equal(entry.processedFile, `data/processed/osdr/${entry.datasetId}.json`);
  }

  assert.equal(getOsdrDataset("osd-569-cbc").specimen, "whole-blood");
  assert.equal(definitionFor("osd-575-cmp").specimen, "serum");
});
