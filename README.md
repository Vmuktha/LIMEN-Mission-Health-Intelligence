# LIMEN

**Neuroadaptive Mission Readiness & Recovery Intelligence**

LIMEN is a scientific software prototype for exploring sensorimotor adaptation and readaptation across gravity-transition contexts in human spaceflight. It combines a browser-based visuomotor adaptation task, optional subjective self-reports, mission-context records, descriptive within-person recovery analytics, a registry of published research, and bundled retrospective NASA Open Science Data Repository (OSDR) biospecimen data.

LIMEN is a research and demonstration prototype prepared for NASA Space Apps exploration. It is **not** a clinical diagnostic product, a medical device, an operational monitoring system, or a NASA-endorsed system. All outputs are descriptive.

## Implemented application

All routes live under `src/app` (Next.js App Router). Operational routes read and write only browser-local IndexedDB records; nothing is sent to a server.

### Landing experience — `/`

`src/components/landing/LandingExperience.tsx` composes:

- **Hero stage** (`HeroStage.tsx`) with a WebGL scene (`src/components/scene/webgl/*`, built with Three.js and React Three Fiber) loaded through a deferred dynamic import in `SceneCanvas.tsx`. The neural filaments are a visual metaphor, not measured neural activity.
- **Mission brief** (`src/components/mission/MissionBrief.tsx`).
- Four numbered story sections: the instrument and its kinds of evidence, the gravity-transition problem, the shortened browser task, and the prototype's limits.
- **Beyond the Horizon** — a NASA inspiration carousel (`BeyondHorizonCarousel.tsx`). At runtime it queries the public NASA Image and Video Library search API (`https://images-api.nasa.gov/search`) via SWR for four fixed NASA IDs (Apollo 11 `as11-40-5874`, Voyager `PIA23645`, Perseverance `PIA23722`, James Webb `PIA26703`) and shows each image with its NASA title, description, credit taken from the NASA metadata, and source link. It auto-rotates every 5.6 s, pauses on hover or keyboard focus, has pause/play and previous/next controls, does not auto-rotate under `prefers-reduced-motion`, and shows an explicit unavailable state when the NASA API cannot be reached. The carousel is decorative context only and is unrelated to the OSDR measurements.

### Operate

- **`/assessment` — Sensorimotor assessment.** A guided browser visuomotor adaptation task: research briefing, optional pre-assessment self-report, task preparation, four balanced protocol phases (16 baseline, 32 adaptation, 16 late adaptation, 16 washout trials) with a 45° clockwise displayed-cursor rotation during rotated phases, optional post-assessment self-report, and a descriptive results summary. Only fully completed browser-generated sessions are saved locally.
- **`/check-in` — Crew check-in.** Six subjective 0–10 scales plus a free-text note. Unanswered items are stored as missing, never as zero.

### Context

- `/mission` (mission overview), `/mission/contexts`, `/mission/events`, and `/mission/transitions` — browser-local mission-context, event, and gravity-transition records.

### Analyse

- **`/recovery` — Recovery & reference.** A browser-local descriptive dashboard: data overview, Personal Reference Session control, eight separate metric cards (reaction time, movement time, directional error, trajectory deviation, correction count, peak-velocity time, adaptation change, washout aftereffect), protocol-separated longitudinal trends in inline SVG, check-in history, explicit performance–self-report alignment, and data-quality transparency. There is no composite score.
- **`/personal-trends`** — chronological performance and self-reported observations.
- **`/concordance`** — Signal Concordance: side-by-side comparison of available behavioural and self-reported observations.
- **`/observations`** — versioned descriptive notices linked to browser-local records.
- **`/privacy`** — local-data controls and deletion scope.

### Research & evidence

- **`/evidence` — Scientific evidence.** A source-linked registry (`src/lib/evidence/studies.ts`) of published research and standards, including work by Clément et al., Tays et al., Hupfeld et al., and NASA standards documents. These references are not LIMEN records and are not a validation claim for this prototype. See [`docs/SCIENTIFIC_EVIDENCE.md`](docs/SCIENTIFIC_EVIDENCE.md).
- **`/evidence/methodology` — Scientific methodology.** Task protocol, metric eligibility, and evidence boundaries.
- **`/evidence/osdr` — NASA OSDR explorer.** Explorer for the three bundled, processed OSDR datasets (see below). The user selects one dataset, then an analyte, a pseudonymous sample token (`C001`–`C004`), and optionally a timepoint. It renders a per-token inline SVG series in source timepoint order, where absent measurements break the line, plus a table of the original sample IDs, timepoints, units, values, and missing-value tokens. Datasets, studies, and specimens are never merged in the UI.

### Mission simulation lab — `/simulation`

An isolated, fictional demonstration workspace (`src/components/simulation/*`, `src/lib/simulation/*`). The entry page shows two synthetic astronaut profiles — Dr. Mara Venn (Aster-1) and Dr. Clara Reyes (Aurora-2) — built from deterministic, seeded fixtures labelled `fictional-demonstration-not-real-telemetry`. Mirror routes exist for each operational view: `/simulation/mission`, `/simulation/timeline`, `/simulation/contexts`, `/simulation/events`, `/simulation/transitions`, `/simulation/assessments`, `/simulation/check-ins`, `/simulation/recovery`, `/simulation/trends`, `/simulation/concordance`, `/simulation/observations`, `/simulation/evidence`, `/simulation/osdr`, and `/simulation/methodology`. Simulation records never read or modify the user's browser-local records, and no fictional profile is associated with OSDR data. Fixture portraits are in `public/images/simulation/`.

## NASA OSDR integration

LIMEN uses transformed tabular files from two NASA OSDR SpaceX Inspiration4 (16–18 September 2021) biospecimen studies. [`docs/NASA_DATA_AUDIT.md`](docs/NASA_DATA_AUDIT.md) is the authoritative audit of these files.

| | OSD-575 | OSD-569 |
|---|---|---|
| Title | SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex) | Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC) |
| OSDR record | https://osdr.nasa.gov/bio/repo/data/studies/OSD-575 | https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 |
| DOI | [10.26030/mc5d-p710](https://doi.org/10.26030/mc5d-p710) | [10.26030/e0rx-sh52](https://doi.org/10.26030/e0rx-sh52) |
| Participants | 4 (pseudonymous `C001`–`C004`) | 4 (pseudonymous `C001`–`C004`) |

### Downloaded versus processed

Seven files are tracked under `data/raw/osdr/`: five transformed CSVs and two ISA metadata ZIPs. **Only three datasets are processed and used by the application:**

| Dataset ID | Study | Specimen | Source file | Samples | Analytes | Measurement records |
|---|---|---|---|---|---|---|
| `osd-575-cmp` | OSD-575 | serum | `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` | 28 | 19 | 532 |
| `osd-575-cardiovascular` | OSD-575 | serum | `LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv` | 28 | 9 | 504 |
| `osd-569-cbc` | OSD-569 | whole blood | `LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv` | 28 | 20 | 560 |

The cardiovascular panel emits both a concentration and a vendor-normalized `percent` value per analyte (2 × 9 = 18 records per sample). Vendor `percent` values are stored with `unit: null` and no inferred formula.

Two downloaded files are deliberately **archived and not processed** (`OSDR_ARCHIVED_SOURCES` in `src/lib/osdr/definitions.ts`): the 71-plex Eve immune panel (`LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv`) and the 203-analyte Alamar NULISA panel (`LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv`). The ISA metadata ZIPs are retained for provenance and are not parsed by the build.

### Processing pipeline

`scripts/build-osdr-data.ts` drives a pure, deterministic pipeline in `src/lib/osdr/`:

1. `definitions.ts` — closed definitions of the three processed datasets (study metadata, paths, documented timepoints) and the archived sources.
2. `csv.ts` — CSV parsing of the unmodified UTF-8 (BOM) source bytes.
3. `columns.ts` — closed header patterns that classify every measurement column (value, `range_min`, `range_max`, vendor-normalized), including the explicit alias for the CMP `alt_max_*` / `ast_max_*` headers. An unknown suffix is an error, not a guess.
4. `build.ts` — converts wide rows into long-format measurement records, preserving original sample IDs, source unit tokens, and the original missing-value tokens (`NA`, `N/A`, empty). Missing values are never converted to zero.
5. Validation — any dataset with an error-severity issue aborts the build and nothing is written. The `R+194` timepoint, present in the OSD-575 files but absent from the OSD-575 description, is reported as a `timepoint-not-documented` warning and the dataset is still published.
6. Output — one JSON file per dataset plus `manifest.json` recording each source file's SHA-256, byte size, and sample, analyte, measurement, and issue counts.

Supporting modules: `processed.ts` (runtime imports), `chart.ts` (explorer series), `timeline.ts` (timepoint ordering), and `association.ts` (a tentative `(participant token, timepoint)` cross-study association that is explicitly marked `participantIdentityVerified: false`; it is covered by tests and is not used by the explorer UI).

## Data architecture

| Layer | Location | Role |
|---|---|---|
| Raw source files (tracked) | `data/raw/osdr/OSD-575/`, `data/raw/osdr/OSD-569/` | Unmodified OSDR downloads with original filenames. Never edited. |
| Processed data (tracked, generated) | `data/processed/osdr/osd-575-cmp.json`, `osd-575-cardiovascular.json`, `osd-569-cbc.json`, `manifest.json` | Deterministic output of the build script. Do not edit by hand. |
| Runtime imports | `src/lib/osdr/processed.ts` | Statically imports the three processed JSON files at build time as `OSDR_DATASETS`. The browser performs no network request and no CSV parsing for OSDR data. |
| Browser-local records | IndexedDB (`src/lib/storage/*`) | Assessment sessions, check-ins, mission contexts, events, transitions, and follow-ups stay in the current browser profile. |
| Simulation fixtures | `src/lib/simulation/*` | Deterministic fictional scenarios isolated from all real and browser-local records. |

Regenerate the processed OSDR data from the raw files with:

```bash
npm run data:build
```

This compiles `scripts/` and `src/` with `tsconfig.scripts.json` into `.data-build/` (gitignored) and runs `node .data-build/scripts/build-osdr-data.js` from the repository root. Rebuilding the same source bytes produces byte-identical JSON; the test suite asserts both determinism and agreement with the committed processed files.

## Technology stack

- **Next.js 16** (App Router, Turbopack, `cacheComponents` enabled) with **React 19** and **TypeScript 5**
- **Tailwind CSS 4** via `@tailwindcss/turbopack`
- **Three.js** and **React Three Fiber** for the landing WebGL scene
- **SWR** for the Beyond the Horizon NASA Image and Video Library fetch
- **Geist** and **Geist Mono** via `next/font/google`
- **Browser IndexedDB** for local prototype persistence
- **Inline SVG** for recovery, trend, and OSDR charts (no charting library)
- **ESLint 9** with `eslint-config-next`
- **Node's built-in test runner** (`node --test`) over TypeScript compiled with `tsc`

No backend, database service, authentication provider, or environment variables are required (see `.env.example`).

## Running locally

Requires Node.js and npm. The commands below were verified with Node 24.16.0.

```bash
npm install            # install dependencies (package-lock.json is committed)
npm run dev            # development server at http://localhost:3000
npm test               # compile tests with tsconfig.tests.json and run node --test
npm run lint           # ESLint
npx tsc --noEmit -p tsconfig.json   # TypeScript type check
npm run data:build     # regenerate data/processed/osdr/ from data/raw/osdr/
npm run build          # production build
npm run start          # serve the production build
```

`npm test` writes to `.test-build/` and `npm run data:build` writes to `.data-build/`; both directories are gitignored.

## Browser assessment data

The task area uses CSS-pixel coordinates (+x right, +y down). Before each v0.3.0 trial the participant holds the pointer within 12 CSS pixels of the central marker for 250 ms; that observed position is recorded as the actual start. During rotated phases the displayed cursor is the actual pointer vector rotated 45° clockwise around the actual start. Actual pointer coordinates are retained separately and remain the source for behavioural metrics. Protocol v0.3.0 hides the native pointer during active interaction and labels trials `0.3.0-actual-pointer-origin-hidden-cursor`.

Pausing during an active target invalidates that trial. Measurement protocols v0.2.0 and v0.3.0, and legacy origin-unverified records, are never pooled; mixed or unknown protocols withhold the affected comparisons. Derived summaries are recomputed from raw trials at display time and stored records are never rewritten. Full definitions are in [`docs/METRICS_AND_DEFINITIONS.md`](docs/METRICS_AND_DEFINITIONS.md) and [`docs/DATA_PROVENANCE.md`](docs/DATA_PROVENANCE.md).

A Personal Reference Session is an explicit within-person comparison reference, not a clinical baseline. Deltas are `current − reference`, require identical measurement protocol versions, carry no improvement or deterioration label, apply no thresholds, and never interpolate or impute missing values. Check-ins are associated with sessions only through an explicit session identifier, never by timestamp proximity.

## Scientific limitations

**Measurement records are not participants.** The 1,596 OSDR measurement records (532 + 504 + 560) come from **four** people. Each record is one analyte value from one sample at one timepoint. Record counts must never be read as sample size.

- **Timepoints:** seven ground collections only — L-92, L-44, L-3, R+1, R+45, R+82, R+194. L-3 is the last preflight sample. `R+194` appears in the OSD-575 data but not in its study description; the discrepancy is recorded, not resolved.
- **No in-flight data:** neither study contains an in-flight serum or whole-blood measurement. LIMEN makes no in-flight or real-time monitoring claim.
- **Cross-dataset associations:** OSD-575 (serum) and OSD-569 (whole blood) share pseudonymous tokens and timepoint labels but not sample identifiers. Any link is a metadata-based association, not a verified participant identity.
- **No causal interpretation:** n = 4, no control group, no randomisation. No observed change can be attributed to spaceflight, and no population-level statement is supported.
- **No concordance with the LIMEN task:** no paired dataset links OSDR biomarkers to LIMEN visuomotor or self-report data.
- **No clinical use:** values are not classified against the bundled vendor reference ranges, which are laboratory intervals of unknown population and not astronaut decision limits. LIMEN produces no diagnosis, risk estimate, readiness, fitness-for-duty, or composite health score.
- **Browser task:** thresholds (12 px tolerance, 250 ms dwell, 3 px movement onset) are deterministic prototype rules, not validated thresholds. Browser measurements are not neural or vestibular measurements.
- **Simulation:** all simulation data is fictional and is not astronaut telemetry.

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) and sections 9–13 of [`docs/NASA_DATA_AUDIT.md`](docs/NASA_DATA_AUDIT.md).

## NASA data and attribution

The OSDR files were retrieved directly from the OSDR download endpoint (`https://osdr.nasa.gov/geode-py/ws/studies/<OSD-ID>/download?source=datamanager&file=<filename>`) on 2026-11-14. Original filenames are preserved, and SHA-256 checksums are recorded in `docs/NASA_DATA_AUDIT.md` and `data/processed/osdr/manifest.json`.

**Licence:** both DOIs are registered with **Creative Commons Zero v1.0 Universal (CC0 1.0)** rights metadata, per their DataCite registration records. CC0 permits redistribution. Attribution is retained voluntarily because provenance is part of the scientific claim. The OSDR policy pages attempted during the audit returned 404, so the licence is taken from the DOI registrations.

> NASA Open Science Data Repository (OSDR). *SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)*. OSD-575. DOI: [10.26030/mc5d-p710](https://doi.org/10.26030/mc5d-p710). https://osdr.nasa.gov/bio/repo/data/studies/OSD-575

> NASA Open Science Data Repository (OSDR). *Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC)*. OSD-569. DOI: [10.26030/e0rx-sh52](https://doi.org/10.26030/e0rx-sh52). https://osdr.nasa.gov/bio/repo/data/studies/OSD-569

The Beyond the Horizon carousel displays images from the [NASA Image and Video Library](https://images.nasa.gov) at runtime; images are not stored in this repository, and each one is shown with the credit and source link from its NASA metadata.

NASA does not endorse LIMEN.

## Documentation

`docs/` contains the research charter, core architecture, data model, data provenance, NASA data audit and integration notes, metrics and definitions, limitations, mission context model, follow-up workflow, signal concordance, scientific evidence, NASA Space Apps alignment, design system, and visual charter.

## Tool acknowledgments

The commit at the current branch tip (`feat: add Beyond the Horizon NASA inspiration carousel`) is authored by v0 (`v0 <it+v0agent@vercel.com>`), Vercel's AI assistant. This checkout is shallow, so authorship of earlier history cannot be verified from the repository, and no other AI or tool contributions are documented here.
