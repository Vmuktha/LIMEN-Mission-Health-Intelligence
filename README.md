# LIMEN

**Neuroadaptive Mission Readiness & Recovery Intelligence**

LIMEN is a scientific software prototype for understanding sensorimotor adaptation and readaptation across gravity-transition contexts in human spaceflight. The project is intended for NASA Space Apps 2026 exploration and is not a clinical diagnostic product, a medical device, or a NASA-endorsed system.

## Scientific motivation

The prototype is informed by published astronaut sensorimotor and vestibular research, including Tays et al. (2025), Clément et al. (2022), Hupfeld et al. (2022), the NASA Human Performance Standard, and NASA CIPHER/Vestibular Health research. It will clearly distinguish published findings from future user-generated browser task measurements and from simulated demonstration data. See [`docs/SCIENTIFIC_EVIDENCE.md`](docs/SCIENTIFIC_EVIDENCE.md) and [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

## Architecture

- `src/app` — App Router routes for the landing page and Mission, Assessment, Check-in, Recovery, and Evidence modules.
- `src/components` — UI boundaries, organized by feature, with shared primitives in `src/components/ui`.
- `src/lib` — planned pure task, analytics, storage, evidence, and demo boundaries.
- `src/types` — planned shared domain types.
- `docs` — scientific charter, provenance, metric definitions, limitations, NASA alignment, visual system, and visual charter.
- `tests` — reserved test boundaries for deterministic calculations and persistence.
- `public` — reserved asset directories for images, models, and icons.

## Visual system

The visual identity is defined by two documents and implemented by one token layer.

- [`docs/VISUAL_CHARTER.md`](docs/VISUAL_CHARTER.md) — the binding rules: the Orbit, Signal and Instrument registers; lighting and material language; motion principles; and the absolute prohibitions, including that neural structures are visual metaphor rather than measured neural activity, that no astronaut telemetry is ever fabricated, that measured values are never animated decoratively, and that the assessment task canvas is a protected calibrated measurement surface.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — the implementation vocabulary: semantic colour tokens, typography, spacing, radius, elevation, motion durations and easings, the focus and reduced-motion baselines, and the shared UI primitives.

`src/app/globals.css` holds the token layer. Components use semantic tokens (`surface`, `line`, `ink`, `ion`, `ember`, `alert`, `void`, `hull`) rather than raw palette steps, and `src/components/ui` holds the shared primitives that feature modules compose. Phase 8A-0 establishes this foundation; individual routes adopt the cinematic system in later phases, and the current surfaces render unchanged until they do.

## Technology stack

Next.js App Router, React, TypeScript, Tailwind CSS, ESLint, Node's built-in test runner, and browser IndexedDB for local prototype persistence. Recovery trends use lightweight inline SVG rather than a charting library. The landing signature scene uses Three.js and React Three Fiber, both loaded as a deferred chunk on the landing route only. GSAP, Recharts, Vitest, and any optional 3D support beyond the landing scene are deferred until their respective implementation phases.

## Development setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Validate the current project with:

```bash
npm run lint
npx next build --webpack
```

## Automated tests

Run the permanent offline test suite with:

```bash
npm test
```

The suite verifies coordinate rotation, balanced protocol construction, browser-interaction coordinate logic, trial-state transitions, origin-provenance validity, protocol-aware pooling guards, pause-invalidates-trial semantics (including final-trial pause completion), invalid-data handling, behavioural metric formulas, check-in context/provenance, completed-session persistence, display-time summary recomputation, results summaries, descriptive adaptation/washout calculations, recovery-record validation, chronological recovery ordering, metric-specific reference eligibility, protocol-aware deltas, dashboard overview/reference/trend/check-in/alignment models, legacy and unrecognized-protocol reference handling, participant-resolution rules, explicit check-in association rules, chart geometry helpers, gaps and protocol breaks without interpolation, and missing-data handling. It does not establish experimental validity, clinical validity, astronaut validation, or a readiness prediction.

## Recovery data architecture and dashboard

Phase 7A provides a pure recovery data and analytics layer in `src/types/recovery.ts`, `src/lib/analytics/recovery.ts`, and `src/lib/analytics/baseline.ts`. Phase 7B adds a pure presentation model in `src/lib/analytics/recovery-dashboard.ts` and the browser-local dashboard at `/recovery`.

Completed browser-local assessment sessions become chronological recovery observations. The loader reads through the existing `listAssessmentSessions()` and `listCheckIns()` APIs, sorts by actual completion/recording timestamps, validates stored trials defensively, and recomputes all metrics from raw trial records. Incomplete, malformed, non-finite, simulated, or non-browser records are excluded or rejected with an explicit reason. Historical records are never modified. Check-ins are associated only through an explicit completed-session identifier; timestamp proximity is never used.

Recovery metrics remain separate: reaction time, movement time, directional error, trajectory deviation, correction count, peak-velocity time, adaptation change, and washout aftereffect. There is no composite score. Eligibility is metric-specific. Legacy sessions may retain timing metrics but not origin-sensitive metrics; corrected v0.2.0/v0.3.0 sessions may have origin-sensitive metrics; mixed, unknown, or inconsistent protocols withhold affected values.

A Personal Reference Session is an explicit within-person comparison reference, not a clinical baseline. The default is the earliest completed observation eligible for the specific metric; LIMEN never automatically chooses the best or most recent session. An explicit override must belong to the same browser-local participant profile, be eligible for the metric, and satisfy protocol compatibility. Stored sessions do not carry a reference-session flag, so no migration or historical rewrite is required.

Metric deltas use `currentValue − referenceValue` and require identical measurement protocol versions, including for timing metrics. v0.2.0 and v0.3.0 are never pooled. The sign is retained without an improvement/deterioration label, no arbitrary thresholds are applied, missing values stay null, and no interpolation or zero imputation occurs. Each delta exposes its reference and current values, validity, measurement version, eligible and total trial counts, and an explanation when unavailable.

### Recovery dashboard

The `/recovery` route is a client-side research dashboard. `useRecoveryDataset()` reads records once on mount through `loadRecoveryDataset()`, exposes loading, error, empty, and populated states, and ignores superseded or unmounted reads. IndexedDB is never accessed during server rendering. No sample observations are generated for an empty dashboard.

The dashboard presents:

- **Data overview** — completed sessions, observations with at least one eligible metric, explicitly associated check-ins, and the most recent completion timestamp. These counts are deliberately separate.
- **Personal Reference Session control** — the observation under review and an automatic or explicit reference. Automatic selection resolves separately per metric and is restricted to protocol-compatible observations. Every candidate session lists how many metrics it could be compared with and why the others are unavailable, so no candidate appears selectable without its compatibility being stated. An explicit selection keeps its session identity and protocol even when it cannot be compared.
- **Eight separate metric cards** — current value, reference value, signed `current − reference` difference, metric-specific unit, eligible/total trial counts, measurement protocol, reference session, and an availability explanation. No composite score is displayed.
- **Longitudinal trends** — chronological eligible values in inline SVG, split into separate series at protocol changes and missing observations. Lines are visual guides only; no interpolation or zero fill is used. A synchronized table lists every observation, including gaps. Chart geometry is computed by the pure helper module `src/lib/analytics/recovery-chart.ts`.
- **Check-in history** — all subjective self-reports in recording order, with context, preserved null items, free-text notes, explicit association state, and orphan explanations. Timestamp proximity is never used. Item wording and scales come from the single shared list in `src/lib/checkin/record.ts` that the check-in form also uses.
- **Performance–self-report alignment** — only explicitly associated post-assessment check-ins from the current and reference sessions. Multiple check-ins remain individual. Categories describe mathematical direction only: both increased, both decreased, changed in opposite directions, no observed change, or insufficient data. A one-sided change is not forced into a same/opposite category.
- **Data quality and transparency** — protocol versions, input device, validity, trial counts, validation issues, missing-value reasons, dataset exclusions, and plain-language scientific boundaries.

All timestamps are rendered in UTC, and metric values are shown with their unit stated separately so a signed difference is never confused with an improvement claim.

The dashboard resolves exactly one browser-local participant profile. The established `browser-participant` profile is preferred; otherwise a single profile with completed observations is used. Profiles are never merged, and an ambiguous set of profiles is reported instead of being resolved silently.

The dashboard is descriptive and browser-local. It does not infer causation, readiness, recovery, or fitness for duty.

## Current implementation status

Phases 1–6B, the Phase 7.0 measurement-integrity prerequisite, Phase 7.0.1, Phase 7A recovery data architecture, and Phase 7B Recovery Intelligence dashboard are complete: project architecture, scientific documentation, shared navigation, scientific types, evidence registry, NASA-data audit, pure browser-assessment engine, permanent offline tests, IndexedDB persistence boundaries, a complete browser assessment journey, a pure recovery observation/reference/delta analytics layer, and a browser-local recovery dashboard are present. The assessment route guides a participant through a research briefing, optional reviewed pre-assessment self-report, task preparation, the four balanced protocol phases (16 baseline, 32 adaptation, 16 late adaptation, and 16 washout trials), optional post-assessment self-report, and a descriptive results summary. It captures unfiltered, task-local actual pointer samples and a distinct transformed displayed-cursor path, then saves only a fully completed browser-generated session locally. Protocol v0.3.0 hides the native pointer during active interaction and uses the per-trial measurement label `0.3.0-actual-pointer-origin-hidden-cursor`. Recovery adds loading, validation, chronological ordering, metric-specific eligibility, Personal Reference Session selection, protocol-aware descriptive deltas, longitudinal protocol-separated trends, check-in history, and explicit post-assessment alignment. Phase 8A-0 adds the visual foundation: a semantic token layer, the adopted Geist and Geist Mono typefaces, shared UI primitives, an accessible focus baseline, a reduced-motion baseline, LIMEN metadata and iconography, and the visual system and visual charter documents. Phase 8A-1 adds the cinematic application shell: a CSS-only orbital scene behind a glass header and a grouped navigation rail, a compact navigation strip below the large breakpoint, and a scene provider that is the seam for a future WebGL layer. Phase 8A-2 adds the landing experience: a full-bleed "between worlds" hero built from an orbital horizon and abstract Signal filaments, an editorial statement, and a three-chapter account of the problem, the instrument and its limits. Phase 8A-3 adds the first real 3D environment: a procedural orbital scene with a deep-space particle field and filaments branching from the planetary limb, rendered with Three.js and React Three Fiber as a deferred chunk that only the landing route requests. It falls back to the CSS composition when WebGL is unavailable, when the visitor prefers reduced motion, or when the graphics context is lost. No external NASA-data import, machine learning, clinical readiness score, mission-phase inference, or 3D scene on any other route has been implemented. The engine is a research prototype and has not been experimentally validated.

## Browser assessment data

The task area uses CSS-pixel coordinates: +x points right and +y points down. Before each v0.3.0 trial, the participant positions the pointer within 12 CSS pixels of the central marker for 250 ms. LIMEN records that observed position as the actual start, then places the target relative to it. During rotated phases, the visual cursor is the actual pointer vector rotated 45° clockwise around that actual start; target acquisition is evaluated with the displayed cursor. Actual pointer coordinates are retained separately and remain the source for behavioural metrics.

During active interaction the native browser pointer is hidden, and only LIMEN's displayed feedback cursor (including a positioning cursor) is visible. Normal pointer visibility returns outside the interaction. This is a measurement-protocol change from v0.2.0; new records use `0.3.0-actual-pointer-origin-hidden-cursor`. The legacy-compatible non-positioning engine path records `0.1.0-legacy-origin-unverified` and never claims a verified actual start.

Pausing during an active target invalidates that trial so paused time cannot enter reaction time, movement time, or the 12-second timeout. A fresh positioning stage begins after resume. Pausing during positioning discards that unrecorded attempt. Raw event timestamps already recorded are preserved.

The browser records target presentation, first movement onset, completion, phase/trial identity, raw pointer samples, and displayed-feedback samples. In-session elapsed sample times come from `performance.now()`. A session-specific mapping records related ISO timestamps without using raw wall-clock differences for movement timing. No smoothing, interpolation, neural measurement, vestibular measurement, diagnosis, or fitness-for-duty conclusion is produced.

Sessions made before the actual-pointer-origin correction, or records lacking a finite captured start and positioning timestamp, are retained unchanged and labelled origin-unverified. Their directional, trajectory, correction, adaptation, and washout values cannot be compared with corrected sessions and are displayed as unavailable in corrected results. v0.2.0 sessions are preserved without rewriting. v0.2.0 and v0.3.0 are both origin-corrected, but they are distinct measurement protocols because cursor visibility differs: a collection containing more than one measurement protocol version is never treated as a homogeneous group, and all pooled metrics — including reaction and movement time — are withheld rather than silently merged. Direct trial comparison requires two verified-origin trials with the same explicit version. Homogeneous legacy sessions retain valid reaction and movement times. The stored session protocol version is cross-checked against per-trial versions; missing, unknown, or inconsistent labels are handled conservatively. Derived summaries are recomputed from raw trials at display/analysis time, so historical stored summaries are not rewritten.

## Check-ins and results

The optional check-ins use six subjective 0–10 scales plus a free-text note. An unanswered item is retained as missing, never as zero. Pre-assessment check-ins have no session link because no real session exists yet; post-assessment reports can link only to the actual completed browser session. Completed-session summaries show direct browser record counts separately from derived behavioural metrics, and show unavailable values as unavailable rather than inventing values. Neither check-ins nor summaries are medical interpretations.

## Local data and sensorimotor check-ins

LIMEN stores completed assessment sessions and optional self-reported check-ins only in the current browser profile's IndexedDB database. Check-ins use 0–10 integer scales: 0 means none for symptoms and no confidence for movement confidence; 10 means extreme symptoms and complete movement confidence. Unanswered items remain missing. The records are not diagnostic, not objective sensor data, and not fitness-for-duty determinations. Future local-data controls will allow users to delete a session or check-in; clearing site data can also remove the browser-local records.
