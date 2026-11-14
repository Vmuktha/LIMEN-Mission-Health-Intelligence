# LIMEN core architecture — Stage 4

**Status:** implemented domain and persistence layer. No Stage 4 interface has been built.
**Prepared:** 2026-11-14
**Scope:** mission context, crew-context check-ins, Signal Concordance, follow-up workflow,
evidence intelligence, OSDR timeline access, and additive IndexedDB persistence.

This document describes the architecture that sits between the existing browser assessment and
recovery engines and any future interface. It records domain boundaries, contracts, persistence
rules, provenance, privacy, and scientific limits. It does not describe a UI design.

---

## 1. Architectural position

LIMEN remains a browser-local prototype. Stage 4 adds typed domains and pure logic; it does not add
a server, authentication, telemetry, analytics service, machine-learning model, or external API.

```
src/types/*                  closed contracts and literal vocabularies
src/lib/mission/*            pure mission-context and phase logic
src/lib/checkin/*            check-in field semantics and construction
src/lib/concordance/*        pure Signal Concordance comparisons
src/lib/followup/*           pure follow-up lifecycle
src/lib/evidence/*           evidence registry and category guards
src/lib/osdr/*               OSDR transformation, associations, and pure timeline access
src/lib/storage/*            IndexedDB v2, in-memory adapter, and domain storage modules
src/lib/analytics/*          existing assessment/recovery analysis (unchanged)
src/components, src/app      existing presentation (not extended in Stage 4)
```

Pure modules do not import React, browser storage, network APIs, or processed OSDR JSON unless that
is their explicit job. `src/lib/osdr/timeline.ts` deliberately imports neither the generated JSON nor
any browser API, so callers decide when a dataset is loaded.

## 2. Domain boundaries

| Domain | Contracts | Pure logic | Storage |
|---|---|---|---|
| Mission context | `src/types/mission.ts`, `src/types/mission-context.ts` | `src/lib/mission/phases.ts`, `src/lib/mission/context.ts` | `mission-contexts`, `mission-events` |
| Crew-context check-in | `src/types/checkin.ts` | `src/lib/checkin/record.ts`, `src/lib/storage/checkin-validation.ts` | existing `sensorimotor-checkins` |
| Assessment and recovery | existing `src/types/{assessment,recovery,trial,metrics}.ts` | existing `src/lib/assessment/*`, `src/lib/analytics/*` | existing `assessment-sessions` |
| Signal Concordance | `src/types/concordance.ts` | `src/lib/concordance/signal-concordance.ts` | none; derived on demand |
| Follow-up workflow | `src/types/followup.ts` | `src/lib/followup/workflow.ts` | `follow-up-records` |
| Evidence intelligence | `src/types/evidence.ts` | `src/lib/evidence/intelligence.ts`, `src/lib/evidence/studies.ts` | none; static registry |
| OSDR reference data | `src/types/osdr.ts` | `src/lib/osdr/*`, including `timeline.ts` | none; bundled generated JSON |

The following rules are architectural, not cosmetic:

1. **No domain module computes a composite health, readiness, recovery, or risk score.** Recovery
   metrics remain individual descriptive values. Concordance returns per-metric and per-field
   comparisons plus direction-only links.
2. **No domain module diagnoses, predicts, or states causation.** Interpretation literals on stored
   records state their own boundary.
3. **Missing values remain missing.** `null` or an absent property is never converted to zero.
4. **Explicit links are required.** Check-ins attach to assessment sessions only through
   `assessmentSessionId`. Signal Concordance accepts check-in IDs explicitly. Mission phase is only
   the value a user recorded.
5. **No cross-source joins.** OSDR measurements are never joined to browser assessments, check-ins,
   mission events, or follow-ups.
6. **Protocols are never pooled.** v0.2.0 and v0.3.0 remain distinct measurement protocols.

## 3. Data relationships

```
mission-contexts ──1:N── mission-events
       │
       │ optional explicit missionContextId
       ▼
sensorimotor-checkins ──explicit assessmentSessionId──► assessment-sessions
       │                                                     │
       │ explicit check-in IDs                               │ recomputed trials
       └────────────────► Signal Concordance ◄───────────────┘
                              │
                              │ explicit relatedObservation
                              ▼
                       follow-up-records

NASA OSDR datasets ── separate reference timeline ──► evidence registry
        (never joined to any browser record)
```

- A mission event belongs to exactly one mission context by `missionContextId`.
- A check-in may name an `assessmentSessionId` only when a completed session already exists.
- A check-in may name a `missionContextId`, but this is optional and never inferred.
- Signal Concordance is derived. It is not persisted as a new observation and cannot become a
  second source of truth.
- A follow-up names one related observation by kind and ID. It does not silently follow a deleted
  record or search for a replacement.
- Evidence records describe publications, catalogue metadata, measurement files, user observations,
  or synthetic scenarios. Categories are type-level distinctions, not a display label only.

## 4. Mission context architecture

Mission contexts are manually recorded frames of reference. The phase is a closed vocabulary with
eleven canonical values and three legacy values retained for old records. New contexts must use a
canonical phase; `custom` requires `customPhaseLabel`. See `docs/MISSION_CONTEXT_MODEL.md`.

`createMissionContext` and `recordMissionPhase` reject legacy values, require explicit timestamps,
and validate source/provenance pairing. `validateMissionContext` and `validateMissionEvent` accept
legacy values so stored records stay readable. No function derives a phase from `occurredAt`,
`recordedAt`, a date, or a fictional mission schedule.

## 5. Check-in architecture

The original six items remain the canonical `CHECK_IN_FIELDS` used by the existing form and recovery
views. Stage 4 adds six items in `EXTENDED_CHECK_IN_FIELDS`:

`sleepQuality`, `sleepScheduleDisruption`, `workload`, `stress`, `generalWellbeing`,
`existingSymptoms`.

Every item has a label, scale, construct, and explicit polarity (`higher-is-better` or
`higher-is-worse`). Construction stores only answers actually supplied. The legacy six-item call
shape still works. `validateCheckIn` validates all twelve score fields, the optional assessment and
mission links, provenance, interpretation, and the bounded free-text note. Existing records remain
valid without any new field.

The free-text note is optional, trimmed, local-only, and capped at 1,000 characters. It is not
transmitted, summarised, classified, or used to infer a score.

## 6. Signal Concordance architecture

`buildSignalConcordance(input)` is a pure function over an existing `RecoveryParticipantDataset`,
explicit session IDs, explicit check-in IDs, and an optional already-recorded mission context.

It compares four performance metrics against twelve self-report fields and classifies each pair as
`co-occurrence`, `divergence`, `no-observed-change`, or `unavailable`. It returns structured,
explainable observations only. It does not write records, select a reference automatically, use
timestamp proximity, pool protocols, or create a score. Full rules are in
`docs/SIGNAL_CONCORDANCE.md`.

## 7. Follow-up architecture

Follow-ups are administrative workflow records with a closed lifecycle:
`open → reviewed/scheduled/completed/referred`, and `reviewed/scheduled → completed/referred`.
Terminal states have no outgoing transitions. Notes and history are additive. A referral is a
user-entered request for authorised review, with `performedByLimen: false`. LIMEN does not diagnose,
prescribe, escalate, or perform a medical referral. See `docs/FOLLOW_UP_WORKFLOW.md`.

## 8. Evidence intelligence

`evidenceRegistry` contains three structurally distinct persisted categories:

1. published research findings (`published-research-finding`);
2. NASA study catalogue metadata (`nasa-study-catalogue-metadata`);
3. NASA downloadable measurement data (`nasa-downloadable-measurement-data`).

Two further categories are represented in the type system but are runtime-only and never fabricated
in the registry: user-generated observations and synthetic demonstration scenarios.

`evidenceSourceFiles(record)` exposes files only for measurement-data records. A catalogue record
therefore cannot be presented as a downloadable dataset. Every record declares availability, study
design, risk/research domain, mission relevance, associated LIMEN capability, measurements,
limitations, and an interpretation boundary. Empty or unknown identifiers stay absent rather than
being invented.

OSDR measurement records carry study accession, DOI, source URL, dataset IDs, source filenames, and
specimen type. The three selected datasets remain distinct: serum CMP, serum cardiovascular, and
whole-blood CBC.

## 9. Persistence architecture

The existing database `limen-neuroadaptive` is upgraded from version 1 to version 2. The upgrade is
additive:

| Store | Introduced | Purpose |
|---|---|---|
| `assessment-sessions` | v1 | existing completed browser assessments |
| `sensorimotor-checkins` | v1 | existing and expanded self-reports |
| `mission-contexts` | v2 | mission context records |
| `mission-events` | v2 | manually recorded mission events |
| `follow-up-records` | v2 | workflow records |

`LIMEN_REQUIRED_STORES` lists the five stores in contract order. `objectStoresRequiringCreation()`
returns only stores that do not already exist; `onupgradeneeded` creates those and nothing else. No
store is deleted, recreated, renamed, or rewritten. There is no destructive `deleteObjectStore` call.
Existing assessment and check-in records are therefore preserved in place.

Write APIs:

- `StorageAdapter.add` is insert-only and reports `duplicate-id` rather than overwriting.
- `StorageAdapter.put` is used only by explicit domain update functions such as
  `replaceMissionContext`, `replaceMissionEvent`, and `replaceFollowUp`.
- Domain modules validate a record before writing and reject non-user-generated provenance as a real
  record.

`createInMemoryStorageAdapter()` provides the same contract for tests. `getIndexedDbAdapter()` returns
an explicit `unavailable` result when IndexedDB is absent. No backend, network service, account, or
authentication is involved. Persistence remains device/browser-profile local.

## 10. Provenance and privacy

Provenance literals distinguish:

- `browser-user-generated` — entered in this browser profile;
- `simulated-demo` — explicitly synthetic demonstration data.

A simulated source must carry simulated provenance. Real stores reject simulated-demo records, so a
demonstration cannot silently become a user record. Evidence boundaries separately distinguish
published findings, catalogue metadata, measurement data, user observations, and synthetic scenarios.

Mission context and follow-up records carry an explicit source, author, and timestamp. Check-ins carry
browser provenance and a self-report interpretation literal. Free text is local, optional, bounded,
and not analysed. LIMEN does not request identity, medical history, or clinical data.

## 11. Scientific limitations

- The browser task is not a reproduction of any published laboratory protocol.
- Check-ins are subjective self-reports, not objective vestibular, neurological, or clinical measures.
- Concordance reports co-observation of directions, not agreement, causation, improvement, or
  deterioration.
- A change is not evidence of recovery, impairment, or fitness for duty.
- Mission phases are user records, not telemetry.
- OSDR data are four-person, ground-only, pre/post-flight biospecimen measurements. There is no
  in-flight sample, no control arm, and no clinical interpretation of reference ranges.
- Follow-up records are administrative and do not constitute medical advice.
- These limits apply to every future interface that consumes the domain.

## 12. Module and UI separation

All Stage 4 calculations are pure functions in `src/lib/`. React components and Next.js pages were not
modified in this stage. Browser-only APIs are confined to `src/lib/storage/database.ts` and the storage
modules. Nothing in the Stage 4 domain imports Three.js, a model runtime, a network client, or
telemetry.

## 13. Verification

Stage 4 is covered by seven suites in addition to the existing assessment, recovery, storage, and
OSDR suites:

- `tests/mission-context.test.ts`
- `tests/checkin-expansion.test.ts`
- `tests/signal-concordance.test.ts`
- `tests/followup-workflow.test.ts`
- `tests/evidence-intelligence.test.ts`
- `tests/osdr-timeline.test.ts`
- `tests/persistence-v2.test.ts`

NASA OSDR tests read the real raw files and generated datasets. Synthetic fixtures are confined to
application-workflow tests and are labelled as synthetic in the test source. See
`docs/SIGNAL_CONCORDANCE.md`, `docs/MISSION_CONTEXT_MODEL.md`, and `docs/FOLLOW_UP_WORKFLOW.md` for
domain-specific rules.
