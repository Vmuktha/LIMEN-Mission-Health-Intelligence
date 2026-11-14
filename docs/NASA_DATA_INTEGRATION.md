# NASA open-data integration audit

**Audit date:** 2026-11-11  
**Scope:** NASA Life Sciences Portal (NLSP) / Life Sciences Data Archive (LSDA) records relevant to functional readiness, physical capacity, or sensorimotor monitoring. No data files were downloaded during this audit or its Phase 3A file-level follow-up.

## Decision

**Phase 3A decision: exclude the Campaign 3 Aerobic Capacity Summary from computational implementation for now.** The public record is reachable and exposes CSV names, but no direct file URL, file-size metadata, CSV response, Campaign 3 data dictionary, variable units, or file-level access/citation terms were verifiable without guessing an undocumented download request. The task's file-level acceptance criteria are therefore not met.

The record remains a potentially relevant **ground-based analogue physical-capacity** source. It is not astronaut inflight data, a sensorimotor adaptation dataset, or a readiness threshold source. It must not appear in LIMEN calculations until a documented small-file download and schema validation are completed.

## Provenance rules

- UTMB participants are healthy ground-study volunteers, **not astronauts**.
- Bed-rest analogue observations must remain distinct from browser-generated LIMEN assessment records and from published astronaut findings.
- Participant identifiers in filenames are de-identified study codes. They must not be counted as unique people or joined to any other source without an explicit, documented data dictionary.
- Any future imported file must retain its NASA/NLSP record identifier, original filename, retrieval date, and a `ground-analogue` provenance label.

## Candidate audit

| Candidate | Official NASA record | Relevance and verified protocol | Actual public file evidence | Access decision |
| --- | --- | --- | --- | --- |
| UTMB Bedrest Campaign 3 | Mission record [`593a6726-8650-551a-8d67-0f03468de92f`](https://nlsp.nasa.gov/explore/data/details/593a6726-8650-551a-8d67-0f03468de92f?dataType=MISSIONS); selected experiment record `07f12dd0-6725-582c-a4d2-618ed8b8c452` | NASA describes Campaign 3 as head-down-tilt research spanning bone, cardiovascular, neurological, and other areas. A related public record identifies computerized dynamic posturography as a functional neurological assessment, but raw posturography files were not verified here. | The selected **Aerobic Capacity Summary** record lists 10 processed datasets and many per-file `.csv` entries, including Peak/Submax and `summary`/`gxt_summary` names. | **Excluded after Phase 3A.** Exact bytes, direct download response, columns, units, and dictionary were not verified; no bulk or single-file download was started. |
| UTMB Bedrest Campaign 11 | Mission record [`8e583564-d124-58ce-b44a-a16bb5b5d981`](https://nlsp.nasa.gov/explore/data/details/8e583564-d124-58ce-b44a-a16bb5b5d981?dataType=MISSIONS); Mission ID `UTMB Campaign 11`; Payload ID `CFT70` | 70 days of 6° head-down tilt at UTMB FARU; 13 pre-bedrest days for the non-exercise group or 21 for the exercise group, plus 14 post-bedrest days. NASA states that the campaign integrated standard measures, visual monitoring, countermeasures, and functional testing tied to representative planetary-operation tasks. | NASA's NLSP landing page classifies Campaign 11 among its human-research open-access datasets. This audit could not enumerate a Campaign 11 experiment-level manifest, filenames, formats, file sizes, variables, or units from the accessible public record view. | **Do not ingest yet.** Scientifically attractive, but raw-file availability is not sufficiently verified for a concrete import plan. |
| Bed-rest functional/sensorimotor testing | Campaign 3 search result links the `MR042G` computerized dynamic posturography experiment; Campaign 11 describes functional testing at mission level. | For Campaign 3, the indexed NASA record says balance control used an EquiTest computerized dynamic posturography system and 20-second Sensory Organization Test trials under visual/proprioceptive conditions. | The retrievable catalogue result for that search target identifies an image (`msci1262.jpg`) and hardware/protocol description, not a downloadable numeric measurement file. | **Not selected.** The protocol is relevant, but numeric files and variable units were not verified. |
| NASA Standard Measures | [NLSP Standard Measures](https://nlsp.nasa.gov/resources/standard-measures) and [NASA NLSP overview](https://www.nasa.gov/hrp/nlsp/) | NASA describes Standard Measures as baseline health measurements from astronauts and analogue crews. | The indexed catalogue shows some entries marked “Data Complete & Available”; the surfaced example is General Immunity, not a functional-performance or sensorimotor dataset. No relevant functional data file set was verified in this audit. | **Not selected.** No appropriately scoped functional/sensorimotor file set was confirmed. |

## Phase 3A file-level validation: Campaign 3 Aerobic Capacity Summary

### Verified record-level facts

- **Repository:** NASA LSDA via NLSP public `lsdapub` record viewer.
- **Experiment record ID:** `07f12dd0-6725-582c-a4d2-618ed8b8c452`.
- **Record title:** *UTMB Bedrest Campaign 3 Aerobic Capacity Summary*.
- **Processing level:** the catalogue labels it **Processed Data**.
- **Observed file format:** CSV (`.csv`).
- **Observed record organisation:** 10 datasets in the record; filenames visibly distinguish `Peak`, `Submax`, and summary-style outputs. One specific discoverable candidate is `MR080G_Campaign_3_C3B_4023_Submax_050724_summary.csv`.
- **Official record location:** [`https://nlsp.nasa.gov/search/data/details/07f12dd0-6725-582c-a4d2-618ed8b8c452?dataType=EXPERIMENTS`](https://nlsp.nasa.gov/search/data/details/07f12dd0-6725-582c-a4d2-618ed8b8c452?dataType=EXPERIMENTS). A metadata-only HTTP request confirmed this public record returns HTTP 200 after redirecting from the supplied `view/lsdapub` URL.
- **Direct download location:** not verified. The public record HTML is a client-side application shell and does not expose a selected-file asset URL in static markup.
- **Expected transfer size:** not verified. The record does not expose an indexed `Content-Length` or manifest size for a CSV, so no file can responsibly be designated the smallest.
- **Download:** not attempted. No file was downloaded.

### Validation result

| Required check | Result |
| --- | --- |
| Exact filename | A discoverable candidate filename is recorded above, but it is not confirmed as the smallest file. |
| Download endpoint and access response | Not verified; no undocumented endpoint was guessed. |
| File size before transfer | Not available. |
| CSV columns, data types, row structure, missing values | Not available because no file was transferred. |
| Units and variable definitions | No Campaign 3 data dictionary or schema was verified. |
| Participant identifiers and timepoints | A code and date-like token appear in filenames, but their semantics are undocumented and must not be interpreted. |
| Individual-level versus aggregate | Not verified from file content. “Summary” and “processed” are not enough to determine row granularity. |
| Licence, access conditions, and citation requirement | No file-level terms were obtained from the public record. |

An indexed NASA PDF about Shuttle/ISS Peak and Submax cycle testing was located during investigation, but it is **not** a verified UTMB Campaign 3 protocol or dictionary and is deliberately not used to define this dataset's variables or units.

### Computational decision

No parser, fixture, metric mapping, import, or visualization is recommended. The dataset is excluded from LIMEN's computational implementation until all file-level validation checks above are complete.

If a future validation obtains a documented CSV and data dictionary, a separate, aggregate ground-analogue context series may be reconsidered. Even then, it would never be permissible to:

- infer visuomotor direction error, neural activation, vestibular function, or sensorimotor adaptation from aerobic-capacity files;
- treating bed-rest results as astronaut observations;
- using aggregate or analogue values as clinical norms, fitness-for-duty cutoffs, or an individual's readiness score;
- merging participant-level records with published astronaut cohorts or browser-assessment records.

## Planned module consumption

No current module consumes NASA data in this audit phase.

| LIMEN module | Current status | Future only after successful file validation |
| --- | --- | --- |
| Mission | No Campaign 3 data use. | A provenance-labelled source card, never telemetry or an astronaut profile. |
| Recovery | No Campaign 3 data use. | A separate aggregate context display, never a personal comparison or readiness declaration. |
| Evidence | The record URL and audit limitations may be cited. | Keep record provenance separate from published astronaut findings. |
| Assessment | No external data use. | No calibration of cursor metrics against aerobic-capacity data. |
| Check-in | No external data use. | No substitution of self-report with physical-capacity or posturography values. |

## Sources

1. [NASA Life Sciences Portal overview](https://www.nasa.gov/hrp/nlsp/) — NASA's description of de-identified human research data, human-research open-access bed-rest datasets, Campaign 3/Campaign 11 context, and Standard Measures.
2. [NLSP Campaign 11 mission record](https://nlsp.nasa.gov/search/data/details/8e583564-d124-58ce-b44a-a16bb5b5d981?dataType=MISSIONS) — Campaign 11 protocol, location, pre/post-bedrest periods, payload ID, and functional-testing purpose.
3. [NLSP Campaign 3 Aerobic Capacity Summary record](https://nlsp.nasa.gov/view/lsdapub/lsda_experiment/07f12dd0-6725-582c-a4d2-618ed8b8c452) — public record ID, processed-data designation, CSV file listing, and download control.
4. [NLSP Campaign 3 posturography search record](https://nlsp.nasa.gov/search/data/details/IDP-LSDA_IMAGE-0000000000001887?dataType=IMAGES) — EquiTest/Sensory Organization Test protocol description and the limit of the verified asset (an image, not a numeric data file).

## Unresolved questions before integration

1. Which specific Campaign 3 summary CSV has the smallest transfer size and a complete data dictionary?
2. What are the exact columns, units, timepoint labels, and missing-value conventions in that file?
3. What licence, citation wording, or file-level terms does the NLSP download flow provide?
4. Can a Campaign 11 functional-testing experiment record expose a similarly public numeric manifest and documented schema?

Until these are answered from the file-level source, LIMEN must not add a parser, metric mapping, fixture, or UI visualization for NASA data.
