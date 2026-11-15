# LIMEN
### Neuroadaptive Mission Readiness & Recovery Intelligence

**Understanding how humans adapt, perform, and readapt across gravity transitions in spaceflight.**

LIMEN is a scientific software prototype exploring sensorimotor adaptation and recovery in human spaceflight. It brings together a browser-based visuomotor assessment, subjective crew check-ins, longitudinal recovery analytics, scientific research, and real historical biospecimen data from NASA's Open Science Data Repository (OSDR).

The project explores how behavioural measurements, self-reported observations, mission context, and published spaceflight research can be brought together into a transparent research environment.

> LIMEN is a research and demonstration prototype. It is not a medical device, clinical diagnostic system, operational astronaut-monitoring platform, or NASA-endorsed product.

---

## At a glance

| | |
|---|---|
| **Domain** | Human spaceflight, sensorimotor adaptation, recovery intelligence |
| **Platform** | Web application |
| **Framework** | Next.js, React, TypeScript |
| **Scientific data** | NASA OSDR: OSD-575 and OSD-569 |
| **Data approach** | Retrospective real measurements, browser-generated observations, and isolated fictional simulations |
| **Persistence** | Browser-local IndexedDB |
| **Visualisation** | Three.js, React Three Fiber, SVG |

## Explore LIMEN

LIMEN is organised around four connected experiences.

### 1. Assess — Browser-based sensorimotor assessment

The assessment module implements a structured visuomotor adaptation task.

Participants complete four phases:

- Baseline
- Adaptation
- Late adaptation
- Washout

During rotated phases, the displayed cursor is rotated 45° clockwise relative to the actual pointer movement. LIMEN records the movement and feedback paths separately, allowing descriptive behavioural measurements to be calculated.

The task also supports optional pre- and post-assessment self-reports and saves completed sessions locally in the browser.

### 2. Analyse — Recovery and personal reference

The recovery module organises completed assessment sessions into chronological observations.

It provides:

- Eight separate behavioural metrics
- Personal Reference Session selection
- Protocol-aware comparisons
- Longitudinal trends
- Subjective check-in history
- Performance and self-report alignment
- Data-quality explanations

Metrics remain separate rather than being collapsed into an unsupported overall readiness score.

### 3. Investigate — Scientific evidence and NASA OSDR

LIMEN includes a research registry and an interactive explorer for historical NASA biospecimen measurements.

The OSDR explorer allows users to select a dataset, analyte, participant token, and timepoint, then inspect the available measurements through charts and tables.

The application includes three processed datasets from two SpaceX Inspiration4 studies:

| NASA study | Dataset | Measurement records |
|---|---|---:|
| OSD-575 | Comprehensive Metabolic Panel (CMP) | 532 |
| OSD-575 | Cardiovascular 9-plex | 504 |
| OSD-569 | Complete Blood Count (CBC) | 560 |
| **Total** | | **1,596** |

These are measurement records, not individual participants. The underlying studies contain four pseudonymised participants.

### 4. Simulate — Mission simulation environment

The simulation lab provides an isolated demonstration environment with fictional astronaut profiles and deterministic sample scenarios.

It allows users to explore the application's operational views without confusing synthetic records with real NASA measurements or personal browser data.

All simulation profiles and telemetry-like values are fictional.

---

## Beyond the Horizon

The LIMEN landing experience includes a NASA-inspired visual journey, combining a WebGL environment with the Beyond the Horizon image carousel.

The carousel retrieves selected imagery from NASA's public Image and Video Library API and displays the associated titles, descriptions, credits, and source links.

The landing environment uses Three.js and React Three Fiber. Its visual elements are conceptual representations, not measurements of neural activity or astronaut telemetry.

---

## NASA data integration

LIMEN uses transformed tabular data from two NASA Open Science Data Repository studies associated with the SpaceX Inspiration4 mission (16–18 September 2021).

**Studies**

- [OSD-575 — Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575)  
  DOI: [10.26030/mc5d-p710](https://doi.org/10.26030/mc5d-p710)

- [OSD-569 — Whole Blood Measurements from the SpaceX Inspiration4 Mission](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569)  
  DOI: [10.26030/e0rx-sh52](https://doi.org/10.26030/e0rx-sh52)

Seven source files are preserved in the repository: five transformed CSV files and two ISA metadata archives.

Three datasets are currently processed and bundled into the application. The 71-plex immune panel and 203-analyte Alamar panel are retained as archived sources and are not part of the current explorer.

### Data processing

The OSDR pipeline:

1. Reads the original transformed CSV files.
2. Classifies measurement and reference-range columns.
3. Converts wide-format source tables into structured measurement records.
4. Preserves sample identifiers, units, and missing-value information.
5. Validates the generated records and reports data-quality issues.
6. Produces deterministic JSON datasets and a provenance manifest containing source checksums.

The processed JSON files are committed to the repository and statically imported by the application. The browser does not need to download or parse the original CSV files to use the explorer.

Regenerate the processed data with:

```bash
npm run data:build
```

For detailed acquisition records, schema information, checksums, and validation findings, see [`docs/NASA_DATA_AUDIT.md`](docs/NASA_DATA_AUDIT.md).

---

## Scientific integrity and limitations

LIMEN deliberately distinguishes real measurements, browser-generated observations, published research, and fictional simulation data.

Important limitations:

- **Small cohort:** the OSDR datasets represent four participants, not a population-level sample.
- **Ground collections only:** the seven labelled timepoints are ground-based pre- and post-flight collections. Neither study provides in-flight measurements.
- **Unverified cross-study identity:** the two studies share pseudonymous participant tokens and timepoint labels, but their sample identifiers differ. These labels do not independently establish participant identity.
- **Timepoint discrepancy:** R+194 appears in the OSD-575 transformed files but is absent from the study description. LIMEN reports this discrepancy rather than resolving it through assumption.
- **No causal conclusions:** observed differences cannot be attributed to spaceflight using these datasets alone.
- **No biomarker–behaviour validation:** the OSDR measurements are not paired with LIMEN's browser-based visuomotor task.
- **No clinical interpretation:** the system does not diagnose conditions, estimate medical risk, predict readiness, or determine fitness for duty.

All browser-generated behavioural measurements are descriptive prototype outputs. Simulation data is fictional and is never presented as real astronaut telemetry.

Further details: [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

---

## Technology

- **Frontend:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS
- **3D visualisation:** Three.js, React Three Fiber
- **Data fetching:** SWR
- **Persistence:** IndexedDB
- **Charts:** Inline SVG
- **Data processing:** TypeScript-based deterministic pipeline
- **Testing:** Node.js test runner, TypeScript, ESLint

The application does not require a server-side database or backend service for its current functionality. NASA carousel imagery requires an internet connection; the bundled OSDR explorer data does not.

---

## Run locally

### Requirements

- Node.js
- npm

### Installation

```bash
git clone https://github.com/Vmukutha/LIMEN-Mission-Health-Intelligence.git
cd LIMEN-Mission-Health-Intelligence
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verification

```bash
npm test
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run data:build
npm run build
```

To serve the production build locally:

```bash
npm run start
```

---

## Project documentation

Additional technical and scientific documentation is available in [`docs/`](docs/):

- `SCIENTIFIC_EVIDENCE.md` — research and literature references
- `METRICS_AND_DEFINITIONS.md` — behavioural metric definitions
- `DATA_PROVENANCE.md` — browser-generated data provenance
- `NASA_DATA_AUDIT.md` — NASA OSDR data acquisition and validation
- `LIMITATIONS.md` — scientific and methodological limitations
- `DESIGN_SYSTEM.md` — interface design system
- `VISUAL_CHARTER.md` — visual and interaction principles

---

## Data attribution

NASA Open Science Data Repository (OSDR):

- OSD-575, DOI [10.26030/mc5d-p710](https://doi.org/10.26030/mc5d-p710)
- OSD-569, DOI [10.26030/e0rx-sh52](https://doi.org/10.26030/e0rx-sh52)

The two dataset DOI registrations specify Creative Commons Zero v1.0 Universal (CC0 1.0). Source provenance and attribution are retained in the repository.

NASA Image and Video Library imagery is retrieved at runtime. Image credits and source links are displayed using the associated NASA metadata.

**NASA does not endorse LIMEN.**

---

*LIMEN — Exploring the boundary between human adaptation, evidence, and spaceflight.*
