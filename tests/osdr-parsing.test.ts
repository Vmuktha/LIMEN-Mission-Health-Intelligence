import assert from "node:assert/strict";
import test from "node:test";

import { parseCsv } from "@/lib/osdr/csv";
import type { OsdrDataset, OsdrMeasurement } from "@/types/osdr";
import { ALAMAR_SOURCE, buildFrom, CMP_SOURCE, editLines, readSource } from "./osdr-fixtures";

function measurement(
  dataset: OsdrDataset,
  sampleId: string,
  analyteKey: string,
  role: OsdrMeasurement["role"] = "value",
): OsdrMeasurement {
  const found = dataset.measurements.find(
    (candidate) => candidate.sampleId === sampleId && candidate.analyteKey === analyteKey && candidate.role === role,
  );
  assert.ok(found, `expected measurement ${sampleId} / ${analyteKey} / ${role}`);
  return found;
}

test("the real CMP file builds without error-severity issues", () => {
  const { dataset, issues, ok } = buildFrom("osd-575-cmp");
  assert.equal(ok, true);
  assert.equal(dataset.samples.length, 28);
  assert.equal(dataset.measurements.length, 532);
  assert.deepEqual(
    issues.filter((issue) => issue.severity === "error"),
    [],
  );
});

test("NA, N/A and empty cells stay distinguishable and never become zero", () => {
  const { dataset } = buildFrom("osd-575-cmp");

  const na = measurement(dataset, "C001_serum_L-44", "bun_to_creatinine_ratio");
  assert.equal(na.missingToken, "NA");
  assert.equal(na.value, null);

  const empty = measurement(dataset, "C002_serum_R+82", "bun_to_creatinine_ratio");
  assert.equal(empty.missingToken, "empty");
  assert.equal(empty.value, null);
  assert.equal(empty.referenceRange?.min, null);
  assert.equal(empty.referenceRange?.max, null);

  const notApplicable = measurement(dataset, "C001_serum_L-3", "egfr_african_american");
  assert.equal(notApplicable.value === null, false);
  assert.equal(notApplicable.referenceRange?.max, null);
  assert.equal(
    notApplicable.referenceRange?.maxHeader,
    "egfr_african_american_range_max_milliliter_per_minute_per_1.73_meter_squared",
  );

  for (const record of dataset.measurements) {
    if (record.missingToken !== null) assert.equal(record.value, null);
    if (record.value === 0) assert.equal(record.missingToken, null);
  }
});

test("numeric values are parsed and units are taken only from the header suffix", () => {
  const { dataset } = buildFrom("osd-575-cmp");

  const albumin = measurement(dataset, "C001_serum_L-3", "albumin");
  assert.equal(albumin.value, 4.9);
  assert.equal(albumin.unit, "gram_per_deciliter");
  assert.equal(albumin.unitSource, "column-header");
  assert.equal(albumin.header, "albumin_value_gram_per_deciliter");

  const ratio = measurement(dataset, "C001_serum_L-3", "albumin_to_globulin_ratio");
  assert.equal(ratio.unit, null);
  assert.equal(ratio.unitSource, null);
  assert.equal(typeof ratio.value, "number");
});

test("CMP reference ranges are preserved per sample with their original headers", () => {
  const { dataset } = buildFrom("osd-575-cmp");
  const albumin = measurement(dataset, "C001_serum_L-3", "albumin");
  assert.deepEqual(albumin.referenceRange, {
    min: 3.6,
    max: 5.1,
    minHeader: "albumin_range_min_gram_per_deciliter",
    maxHeader: "albumin_range_max_gram_per_deciliter",
    unit: "gram_per_deciliter",
  });
});

test("vendor percentage fields are preserved as opaque, unitless values", () => {
  const { dataset } = buildFrom("osd-575-cardiovascular");
  const percent = measurement(dataset, "C001_serum_L-3", "crp", "percent");
  assert.equal(percent.kind, "vendor-normalized-value");
  assert.equal(percent.unit, null);
  assert.equal(percent.unitSource, null);
  assert.equal(percent.referenceRange, null);
  assert.equal(typeof percent.value, "number");

  const concentration = measurement(dataset, "C001_serum_L-3", "crp", "concentration");
  assert.equal(concentration.kind, "measured-value");
  assert.equal(concentration.unit, "picogram_per_milliliter");
});

test("a duplicated sample identifier fails validation", () => {
  const text = editLines(readSource(CMP_SOURCE), (lines) => {
    lines.splice(2, 0, lines[1]);
    return lines;
  });
  const { ok, issues } = buildFrom("osd-575-cmp", text);
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => issue.code === "duplicate-sample-id" && issue.severity === "error"));
});

test("an unexpected column fails validation instead of being dropped", () => {
  const text = editLines(readSource(CMP_SOURCE), (lines) =>
    lines.map((line, index) => (index === 0 ? `${line},mystery_measurement` : `${line},1`)),
  );
  const { ok, issues } = buildFrom("osd-575-cmp", text);
  assert.equal(ok, false);
  assert.ok(
    issues.some((issue) => issue.code === "unexpected-column" && issue.header === "mystery_measurement"),
  );
});

test("a malformed row fails validation", () => {
  const text = editLines(readSource(CMP_SOURCE), (lines) => {
    lines[1] = lines[1].replace(/,[^,]*$/, "");
    return lines;
  });
  const { ok, issues } = buildFrom("osd-575-cmp", text);
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => issue.code === "malformed-row"));
});

test("a non-numeric measurement fails validation", () => {
  const text = editLines(readSource(CMP_SOURCE), (lines) => {
    const fields = lines[1].split(",");
    fields[1] = "not-a-number";
    lines[1] = fields.join(",");
    return lines;
  });
  const { ok, issues } = buildFrom("osd-575-cmp", text);
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => issue.code === "non-numeric-value" && issue.severity === "error"));
});

test("an unrecognised timepoint fails validation", () => {
  // `L-99` still matches the identifier shape, so it reaches the timepoint
  // check; `_T-3` would instead fail the identifier regex.
  const text = editLines(readSource(CMP_SOURCE), (lines) => {
    lines[1] = lines[1].replace("_L-3", "_L-99");
    return lines;
  });
  const { ok, issues } = buildFrom("osd-575-cmp", text);
  assert.equal(ok, false);
  assert.ok(issues.some((issue) => issue.code === "unrecognized-timepoint"));
});

test("the archived Alamar panel really does lack C003 at L-44", () => {
  const { rows } = parseCsv(readSource(ALAMAR_SOURCE));
  const header = rows[0];
  const data = rows.slice(1);
  assert.equal(header[0], "Sample ID");
  assert.equal(data.length, 27);

  const byParticipant = new Map<string, string[]>();
  for (const row of data) {
    const match = /^(C\d+)_.*?(L-\d+|R\+\d+)/.exec(row[0]);
    assert.ok(match, `unexpected sample id ${row[0]}`);
    const [, participant, timepoint] = match;
    byParticipant.set(participant, [...(byParticipant.get(participant) ?? []), timepoint]);
  }

  assert.deepEqual(
    [...byParticipant.keys()].sort(),
    ["C001", "C002", "C003", "C004"],
  );
  // Source order, preserved rather than sorted.
  assert.deepEqual(byParticipant.get("C003"), ["L-92", "L-3", "R+1", "R+45", "R+82", "R+194"]);
  assert.equal(byParticipant.get("C003")?.includes("L-44"), false);
  assert.equal(byParticipant.get("C001")?.length, 7);
});

test("R+194 is present in the data and absent from the OSD-575 description", () => {
  const cmp = buildFrom("osd-575-cmp").dataset;
  assert.ok(cmp.coverage.timepointsObserved.includes("R+194"));
  assert.equal(cmp.coverage.timepointsDocumented.includes("R+194"), false);

  const warning = cmp.issues.find((issue) => issue.code === "timepoint-not-documented");
  assert.ok(warning);
  assert.equal(warning.severity, "warning");
  assert.ok(warning.sampleId?.includes("R+194"));

  const cbc = buildFrom("osd-569-cbc").dataset;
  assert.ok(cbc.coverage.timepointsDocumented.includes("R+194"));
  assert.equal(
    cbc.issues.some((issue) => issue.code === "timepoint-not-documented"),
    false,
  );
});

test("no selected transformed file contains an in-flight timepoint", () => {
  for (const datasetId of ["osd-575-cmp", "osd-575-cardiovascular", "osd-569-cbc"] as const) {
    const { dataset } = buildFrom(datasetId);
    for (const timepoint of dataset.coverage.timepointsObserved) {
      assert.match(timepoint, /^(L-\d+|R\+\d+)$/);
    }
  }
});
