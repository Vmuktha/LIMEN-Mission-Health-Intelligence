# LIMEN OSDR Data Model

**Status:** implemented data foundation. No UI, analytics, or clinical logic consumes it yet.
**Prepared:** 2026-11-14
**Scope:** the three NASA OSDR transformed datasets selected in `docs/NASA_DATA_AUDIT.md`:
OSD-575 Comprehensive Metabolic Panel (CMP), OSD-575 cardiovascular 9-plex, and OSD-569
complete blood count (CBC).

This document describes the typed contract in `src/types/osdr.ts`, the transformation
implemented in `src/lib/osdr/`, and the generated artefacts in `data/processed/osdr/`.

---

## 1. What this layer is and is not

This is a **reference data layer**. It carries four-person, ground-only, pre/post-flight
biospecimen measurements published by NASA OSDR. It is not telemetry, not a clinical
dataset, and not an input to any LIMEN score.

The layer deliberately:

- preserves every source sample identifier and every source column header verbatim;
- preserves the source's own missing-value tokens;
- preserves laboratory reference intervals as reported, without evaluating them;
- emits long-format records that each describe their own provenance;
- rejects structural surprises instead of repairing them.

It deliberately does **not**:

- impute, interpolate, normalise, standardise, or aggregate;
- evaluate a value against a reference range;
- derive clinical flags, risk categories, readiness scores, or composite health scores;
- infer symptoms, sleep, fatigue, stress, vestibular function, or fitness;
- claim a causal relationship with spaceflight;
- match participants across studies as verified identities.

---

## 2. Typed contract

All types live in `src/types/osdr.ts`. They are `readonly` and fully discriminated by
literal unions where the vocabulary is closed.

### 2.1 Closed vocabularies

| Type | Values |
|---|---|
| `OsdrStudyAccession` | `"OSD-569"`, `"OSD-575"` |
| `OsdrDatasetId` | `"osd-569-cbc"`, `"osd-575-cmp"`, `"osd-575-cardiovascular"` |
| `OsdrSpecimenType` | `"whole-blood"`, `"serum"` |
| `OsdrTimepointLabel` | `"L-92"`, `"L-44"`, `"L-3"`, `"R+1"`, `"R+45"`, `"R+82"`, `"R+194"` |
| `OsdrMissingToken` | `"NA"`, `"N/A"`, `"empty"` |
| `OsdrColumnRole` | `"value"`, `"range-min"`, `"range-max"`, `"concentration"`, `"percent"` |
| `OsdrMeasurementKind` | `"measured-value"`, `"vendor-normalized-value"` |
| `OsdrIssueSeverity` | `"error"`, `"warning"` |

### 2.2 `OsdrDataset`

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | `"1.0.0"` | Contract version written by the generator |
| `datasetId` | `OsdrDatasetId` | Stable application identifier for the dataset |
| `study` | `OsdrStudyRecord` | Accession, DOI, title, record URL, CC0 licence, attribution |
| `source` | `OsdrSourceFile` | Original filename, repo-relative path, download URL, byte size, SHA-256, retrieval date |
| `assay` | `OsdrAssayRecord` | Assay name, platform, vendor, analyte count, measurement-column count |
| `specimen` | `OsdrSpecimenType` | `serum` for both OSD-575 panels, `whole-blood` for the CBC |
| `samples` | `readonly OsdrSample[]` | One entry per source row, in source row order |
| `measurements` | `readonly OsdrMeasurement[]` | One entry per numeric source cell (excluding range columns) |
| `coverage` | `OsdrCoverage` | Counts, observed/documented timepoints, per-participant coverage |
| `issues` | `readonly OsdrIssue[]` | Every validation finding, including warnings |
| `transformation` | `OsdrTransformation` | Self-describing rules applied by the generator |

### 2.3 `OsdrMeasurement`

Each measurement is self-describing. It repeats study and source provenance so a single
record can be displayed or exported without joining back to the dataset object.

| Field | Type | Source |
|---|---|---|
| `studyAccession` | `OsdrStudyAccession` | Study definition |
| `studyDoi` | `string` | Study definition (DataCite) |
| `sourceFileName` | `string` | Original CSV filename |
| `specimen` | `OsdrSpecimenType` | Dataset definition |
| `assayName` | `string` | Dataset definition (ISA assay table) |
| `sampleId` | `string` | **Verbatim** first column of the source row |
| `participantToken` | `string` | Parsed from `sampleId` (e.g. `C001`) |
| `timepointLabel` | `OsdrTimepointLabel` | Parsed from `sampleId` |
| `analyteKey` | `string` | Analyte token extracted from the column header |
| `analyteLabel` | `string` | Deterministic display label: `analyteKey` with `_` → space |
| `header` | `string` | **Verbatim** source column header |
| `role` | `OsdrColumnRole` | `value` or `concentration` for measurable columns; `percent` for vendor-normalised columns |
| `kind` | `OsdrMeasurementKind` | `measured-value`, or `vendor-normalized-value` for `percent` |
| `value` | `number \| null` | Parsed numeric value; `null` when `missingToken` is set |
| `missingToken` | `OsdrMissingToken \| null` | Exactly the source encoding, or `null` when a value exists |
| `unit` | `string \| null` | Unit token from the header suffix, verbatim |
| `unitSource` | `"column-header" \| null` | `null` when the header carries no unit |
| `referenceRange` | `OsdrReferenceRange \| null` | Per-sample `range_min` / `range_max` pair |
| `derivedLookupKey` | `string` | `${participantToken}::${timepointLabel}` — runtime key only |

`referenceRange` is never populated for `percent` columns and never for the
cardiovascular panel, whose source has no range columns.

### 2.4 `OsdrReferenceRange`

| Field | Type | Meaning |
|---|---|---|
| `min` | `number \| null` | Reported lower bound, or `null` if the source cell is missing |
| `max` | `number \| null` | Reported upper bound, or `null` if the source cell is missing |
| `minHeader` | `string` | Verbatim lower-bound column header |
| `maxHeader` | `string` | Verbatim upper-bound column header |
| `unit` | `string \| null` | Unit token from the lower-bound header |

These are laboratory reference intervals of unknown population. They are not clinical
decision limits for astronauts and are not evaluated anywhere in this layer.

### 2.5 `OsdrSample`

| Field | Type | Meaning |
|---|---|---|
| `sampleId` | `string` | Original identifier, verbatim |
| `participantToken` | `string` | Derived from `sampleId` |
| `timepointLabel` | `OsdrTimepointLabel` | Derived from `sampleId` |
| `specimen` | `OsdrSpecimenType` | Dataset-level specimen |
| `derivedLookupKey` | `string` | Runtime key only |
| `measurementCount` | `number` | Number of emitted measurements for this sample |

### 2.6 `OsdrCoverage`

| Field | Type | Meaning |
|---|---|---|
| `sampleCount` | `number` | Emitted samples |
| `participantTokenCount` | `number` | Distinct participant tokens |
| `analyteCount` | `number` | Distinct `analyteKey` values |
| `measurementCount` | `number` | Emitted measurement records |
| `participantTokens` | `readonly string[]` | Sorted distinct tokens |
| `timepointsObserved` | `readonly OsdrTimepointLabel[]` | Canonical order, present in `samples` |
| `timepointsDocumented` | `readonly OsdrTimepointLabel[]` | Timepoints named in the study description |
| `participants` | `readonly OsdrParticipantCoverage[]` | Per-participant sample count and timepoints |

### 2.7 `OsdrIssue`

| Field | Type | Meaning |
|---|---|---|
| `code` | `OsdrIssueCode` | Machine-readable finding |
| `severity` | `OsdrIssueSeverity` | `error` blocks generation; `warning` is recorded and published |
| `message` | `string` | Human-readable explanation |
| `sampleId?` | `string` | Present when the finding is sample-specific |
| `header?` | `string` | Present when the finding is column-specific |

Issue codes: `csv-parse-error`, `missing-header`, `unexpected-column`,
`ambiguous-unit`, `incomplete-analyte-columns`, `unexpected-analyte-count`,
`unexpected-measurement-column-count`, `malformed-row`, `unparseable-sample-id`,
`unrecognized-timepoint`, `duplicate-sample-id`, `non-numeric-value`,
`timepoint-not-documented`, `incomplete-participant-coverage`,
`reference-range-unit-mismatch`, `unexpected-sample-count`.

`ok` is true only when no issue has `severity: "error"`. The generator refuses to write
any output when any selected dataset is not `ok`.

### 2.8 `OsdrAssociation`

A tentative, metadata-based link between one sample from each of two datasets.

| Field | Type | Meaning |
|---|---|---|
| `participantToken` | `string` | Shared token used as the matching basis |
| `timepointLabel` | `OsdrTimepointLabel` | Shared label used as the matching basis |
| `left` / `right` | `OsdrAssociationSide` | Dataset id, original sample id, and specimen for each side |
| `basis` | `"shared-pseudonymous-participant-token-and-timepoint-label"` | Fixed literal explaining the link |
| `participantIdentityVerified` | `false` | Always false — this is a type-level guarantee |
| `specimenTypesDistinct` | `boolean` | True for serum vs whole blood |
| `derivedLookupKey` | `string` | The runtime key that produced the match |

`associateDatasets(left, right)` never mutates either dataset and never rewrites either
sample identifier.

---

## 3. Source-to-application transformation

### 3.1 Direction and granularity

The source files are **wide** (one row per sample, one column group per analyte). The
application model is **long** (one record per measured cell). The transformation is a
pure function:

```
buildOsdrDataset(definition, csvText, { sha256, byteSize }) -> { dataset, issues, ok }
```

It is deterministic: the same bytes and definition always produce byte-identical JSON.

### 3.2 Column classification

Headers are parsed by two closed patterns, selected per dataset by `columnShape`:

- `value-range`: `^(?<analyte>.+?)_(value|range_min|range_max|max)(?:_(?<unit>.+))?$`
- `concentration-percent`: `^(?<analyte>.+?)_(concentration|percent_normalized_value|percent)(?:_(?<unit>.+))?$`

Notes:

- `max` is accepted as an alias for `range_max`. It appears only in the CMP file, on
  `alt_max_units_per_liter` and `ast_max_units_per_liter`. The values are unambiguous
  upper bounds (ALT 9–46 U/L, AST 10–40 U/L) and the position is fixed, so the alias is
  classified as `range-max`.
- The analyte token is everything before the role token. It is preserved exactly as
  written, including units embedded in names such as `egfr_african_american`.
- `percent` and `percent_normalized_value` both classify as role `percent` and are
  emitted with `kind: "vendor-normalized-value"`, `unit: null`, `unitSource: null`, and
  no reference range.
- A header that matches neither pattern becomes an `unexpected-column` **error**. It is
  never silently dropped.

### 3.3 Row handling

For each data row:

1. A field-count mismatch is a `malformed-row` error; the row is skipped.
2. `sampleId` is the trimmed first cell. It is stored unchanged.
3. `participantToken` and `timepointLabel` are parsed from `sampleId` with
   `^(C\d+)_.*?(L-\d+|R\+\d+)`.
4. A missing match is an `unparseable-sample-id` error; the row is skipped.
5. A parsed but unknown label is an `unrecognized-timepoint` error; the row is skipped.
6. A repeated `sampleId` is a `duplicate-sample-id` error; the later row is skipped.
7. Every measurable column (`value`, `concentration`, `percent`) emits one record.
   Range columns are folded into `referenceRange` and do not emit records of their own.
8. A cell that is neither a missing token nor a strict number is a `non-numeric-value`
   error.
9. `derivedLookupKey` is computed as `${participantToken}::${timepointLabel}` and is
   stored alongside, never in place of, `sampleId`.

### 3.4 Validation summary

Structural assertions are made against the dataset definition and fail generation:

- exact sample count;
- exact analyte count;
- exact measurement-column count;
- complete `value`/`range_min`/`range_max` triplet per CMP/CBC analyte;
- complete `concentration`/`percent` pair per cardiovascular analyte;
- no duplicate headers, no duplicate sample identifiers;
- no unknown unit token used as a header suffix.

Coverage findings are warnings:

- an observed timepoint absent from the study description;
- a timepoint missing for one or more participants.

### 3.5 Dataset dimensions (verified from the real files)

| Dataset | Study | Specimen | Samples | Analytes | Measurement columns | Measurements |
|---|---|---|---|---|---|---|
| `osd-575-cmp` | OSD-575 | serum | 28 | 19 | 57 | 532 |
| `osd-575-cardiovascular` | OSD-575 | serum | 28 | 9 | 18 | 504 |
| `osd-569-cbc` | OSD-569 | whole-blood | 28 | 20 | 60 | 560 |

`measurements` = `samples × measurement columns emitted`:

- CMP and CBC: 3 columns per analyte, of which only `value` is emitted → 19 or 20 per sample.
- Cardiovascular: 2 columns per analyte, both emitted → 18 per sample.

### 3.6 Generated artefacts

`npm run data:build` writes:

| File | Contents |
|---|---|
| `data/processed/osdr/osd-575-cmp.json` | Typed CMP dataset |
| `data/processed/osdr/osd-575-cardiovascular.json` | Typed cardiovascular dataset |
| `data/processed/osdr/osd-569-cbc.json` | Typed CBC dataset |
| `data/processed/osdr/manifest.json` | One entry per dataset: checksums, sizes, counts, issue counts, processed path |

`src/lib/osdr/processed.ts` imports these JSON modules statically and exposes
`OSDR_DATASETS` and `getOsdrDataset(datasetId)`. No network request and no runtime CSV
parsing is required to consume the data in the browser.

---

## 4. Missing-value semantics

Missingness is explicit and lossless.

| Source cell | `missingToken` | `value` |
|---|---|---|
| `NA` | `"NA"` | `null` |
| `N/A` | `"N/A"` | `null` |
| empty string | `"empty"` | `null` |

Rules enforced by tests for every dataset:

- whenever `missingToken` is non-null, `value` is exactly `null`;
- a measured zero keeps `missingToken: null` and `value: 0` — zero is a real observation;
- no imputation, interpolation, or carry-forward exists anywhere in the pipeline.

Verified missingness in the selected files:

| Dataset | `NA` | `N/A` | `empty` | Notes |
|---|---|---|---|---|
| `osd-575-cmp` | 22 | 56 | 1 value + 2 range cells | See below |
| `osd-575-cardiovascular` | 0 | 0 | 0 | Complete panel |
| `osd-569-cbc` | 0 | 0 | 7 values + 14 range cells | MCH, MCHC, MCV only |

CMP detail:

- 21 of the 22 `NA` cells are `bun_to_creatinine_ratio_value`; the 22nd is a single
  `total_bilirubin_value_milligram_per_deciliter`.
- The 56 `N/A` cells are entirely the two `egfr_*_range_max_*` reference-range columns
  (28 samples each). They surface as `referenceRange.max === null`.
- `C002_serum_R+82` `bun_to_creatinine_ratio` has a blank value **and** blank range
  bounds, so its `referenceRange` has both `min: null` and `max: null`.

CBC detail:

- MCHC blank for C002 at L-92, L-44, L-3 and R+1.
- MCV blank for C002 at R+194.
- MCH blank for C003 and C004 at L-92.
- Every blank value is accompanied by blank `range_min` and `range_max`, so the row's
  triplet is internally consistent.

---

## 5. Units and reference ranges

### 5.1 Units

Units are taken **only** from the column-header suffix. There is no separate unit column
in any source file. The recognised token list is closed (`OSDR_UNIT_TOKENS` in
`src/lib/osdr/columns.ts`); an unrecognised suffix is an `ambiguous-unit` error rather
than a guess.

| Token | Written meaning | Appears in |
|---|---|---|
| `gram_per_deciliter` | g/dL | CMP |
| `grams_per_deciliter` | g/dL | CBC (plural spelling) |
| `milligram_per_deciliter` | mg/dL | CMP |
| `units_per_liter` | U/L | CMP |
| `millimol_per_liter` | mmol/L (source spelling) | CMP |
| `milliliter_per_minute_per_1.73_meter_squared` | mL/min/1.73 m² | CMP |
| `picogram_per_milliliter` | pg/mL | Cardiovascular |
| `nanogram_per_milliliter` | ng/mL | Cardiovascular |
| `cells_per_microliter` | cells/µL | CBC |
| `thousand_per_microliter` | ×10³/µL | CBC |
| `million_per_microliter` | ×10⁶/µL | CBC |
| `femtoliter` | fL | CBC |
| `picogram` | pg | CBC |
| `percent` | percent, as labelled | CBC |

Two details are intentionally preserved, not corrected:

- `gram_per_deciliter` (CMP) and `grams_per_deciliter` (CBC) are **different tokens**.
  Both are retained verbatim so the source's inconsistency remains visible.
- `hemoglobin_value_percent` is labelled `percent` in the source. It is stored as
  `percent`; no unit correction or reinterpretation is applied.

Tokenless headers:

- `albumin_to_globulin_ratio_value` and `bun_to_creatinine_ratio_value` are ratios, so
  `unit` and `unitSource` are `null` (and, for the cardiovascular panel, `crp_percent`
  etc. are unitless by construction).

### 5.2 Reference ranges

- Copied per sample for CMP and CBC from `range_min` / `range_max` (or the `_max_`
  alias).
- Stored with their original headers so the source column is auditable.
- Never compared with the measured value; no flag, band, or classification is produced.
- A missing bound becomes `null`, preserving which side was absent.
- The cardiovascular panel has no range columns, so `referenceRange` is `null`.

---

## 6. Cross-study association

`associateDatasets(left, right)` matches samples on `derivedLookupKey`
(`${participantToken}::${timepointLabel}`).

What the link means:

- the two samples share a pseudonymous participant token and a timepoint label;
- therefore they are **tentatively associated** as coming from the same nominal crew
  member at the same nominal mission-relative time.

What it does not mean:

- the participant identities are not independently verified across studies;
- the specimens are different (`serum` vs `whole-blood`) and are never merged;
- neither original `sampleId` is replaced, rewritten, or hidden.

The association record forces `participantIdentityVerified: false` at the type level, and
`specimenTypesDistinct` records whether the specimens differ. Any future UI must present
the link as a metadata-based association, not as a confirmed identity.

Because all three selected datasets have a complete 4 × 7 grid, `associateDatasets`
returns 28 associations with no unmatched samples for every pair.

---

## 7. Dataset-specific limitations

### 7.1 OSD-575 CMP

- `bun_to_creatinine_ratio` is missing in 22 of 28 samples; it cannot support a
  longitudinal per-participant comparison.
- The two `egfr_*_range_max_*` columns are `N/A` in all 28 rows, so those analytes have
  no upper reference bound.
- `alt_max_units_per_liter` and `ast_max_units_per_liter` use a non-standard column name
  and are mapped by explicit alias.
- Percent fields: none (this file has no normalised columns).

### 7.2 OSD-575 cardiovascular

- No reference ranges exist, so no `referenceRange` data is available.
- Every analyte has a vendor `percent` value with no documented formula. These are
  preserved as opaque values and must not be interpreted as a fraction of a known
  baseline.

### 7.3 OSD-569 CBC

- MCHC/MCV/MCH missingness is sparse but structured (see §4); a per-analyte comparison
  must display the sample count alongside any summary.
- `hemoglobin_value_percent` is labelled percent, contrary to the usual g/dL convention;
  the label is preserved as written.
- The CBC is a whole-blood assay and is kept structurally distinct from the serum panels.

### 7.4 All three

- Four participants, seven ground timepoints, no control arm, no in-flight sample.
- `R+194` appears in the files but is absent from the OSD-575 study description. It is
  retained and flagged with a `timepoint-not-documented` warning rather than dropped or
  explained away.

---

## 8. Reproducible regeneration

Prerequisites: Node.js and the repository's existing dev dependencies. No new packages
are required.

```bash
# From the repository root
npm run data:build
```

The script:

1. deletes `.data-build/`;
2. compiles `scripts/build-osdr-data.ts` and `src/lib/osdr/**` with
   `tsconfig.scripts.json`;
3. runs `node .data-build/scripts/build-osdr-data.js`.

It reads the unmodified files under `data/raw/osdr/`, rebuilds all three datasets, prints
every warning, aborts without writing if any dataset has an error, and rewrites
`data/processed/osdr/`.

Determinism guarantees:

- no clocks, randomness, locale-dependent formatting, or network access;
- JSON is written with a stable key order (insertion order of the typed builders) and
  two-space indentation;
- identical source bytes and identical definitions produce byte-identical output;
- tests compare a fresh in-memory rebuild against the committed JSON.

Typical output:

```text
[osd-575-cmp] warning: timepoint-not-documented — OSD-575 describes no R+194 collection, but the transformed file contains it.
[osd-575-cardiovascular] warning: timepoint-not-documented — OSD-575 describes no R+194 collection, but the transformed file contains it.
osd-575-cmp: 28 samples, 19 analytes, 532 measurements, 1 issue(s)
osd-575-cardiovascular: 28 samples, 9 analytes, 504 measurements, 1 issue(s)
osd-569-cbc: 28 samples, 20 analytes, 560 measurements, 0 issue(s)
Wrote 3 dataset(s) and manifest to data/processed/osdr.
```

Verification from a clean checkout:

```bash
npm test                              # includes the OSDR parsing and dataset suites
npx tsc --noEmit -p tsconfig.json     # typecheck
npm run lint                          # lint
```

The OSDR test file `tests/osdr-datasets.test.ts` fails if the committed processed JSON no
longer matches a fresh rebuild, so a stale artefact cannot pass silently.

---

## 9. Provenance and licence

### 9.1 Studies

> NASA Open Science Data Repository (OSDR). *SpaceX Inspiration4 Blood Serum Metabolic
> Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)*.
> OSD-575. DOI: [10.26030/mc5d-p710](https://doi.org/10.26030/mc5d-p710).
> https://osdr.nasa.gov/bio/repo/data/studies/OSD-575

> NASA Open Science Data Repository (OSDR). *Whole Blood Measurements from the SpaceX
> Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC)*.
> OSD-569. DOI: [10.26030/e0rx-sh52](https://doi.org/10.26030/e0rx-sh52).
> https://osdr.nasa.gov/bio/repo/data/studies/OSD-569

### 9.2 Source files used

| Dataset | Source file | SHA-256 | Bytes |
|---|---|---|---|
| `osd-575-cmp` | `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` | `5eb1e7f0…d709d9` | 8,506 |
| `osd-575-cardiovascular` | `LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv` | `fdba6c3c…cfc75c` | 6,207 |
| `osd-569-cbc` | `LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv` | `32e4f9c9…3b2b8f` | 9,317 |

Full checksums are stored in each dataset's `source.sha256` and in `manifest.json`.

### 9.3 Retained but not modelled

`data/raw/osdr/` also contains the OSD-575 immune Eve (HD71) and Alamar NULISA panels and
both ISA metadata ZIPs. They are deliberately outside the application data layer:

| File | Reason |
|---|---|
| `LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv` | 71-plex HD71; no consumer yet |
| `LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv` | 203-analyte NULISA; largest and least documented |
| `OSD-575_metadata_OSD-575-ISA.zip`, `OSD-569_metadata_OSD-569-ISA.zip` | Study/sample/assay metadata, kept for provenance |

The Alamar panel is nevertheless covered by a test asserting that C003 really does lack
an `L-44` sample (27 rows, not 28), so the archival claim stays verified.

### 9.4 Licence

Both studies are **CC0 1.0 Universal** per their DataCite DOI registration. Attribution
and source metadata are retained above regardless of the waiver. Redistribution of the
raw and processed files is permitted; the raw files are kept under `data/raw/osdr/`
unmodified.

### 9.5 Boundaries

No API, network fetch, external service, or synthetic astronaut record is used at build
time or at runtime. HD71 and Alamar remain archived and unparsed. The assessment protocol
and recovery analytics are untouched.
