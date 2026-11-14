# Mission context model

**Status:** implemented domain model. No UI consumes it yet.
**Prepared:** 2026-11-14
**Implementation:** `src/types/mission.ts`, `src/types/mission-context.ts`,
`src/lib/mission/phases.ts`, `src/lib/mission/context.ts`,
`src/lib/storage/mission-storage.ts`

The mission context model records what a user explicitly says about a mission, its current phase, and
events that were observed. It is not a mission control system, not telemetry, and not a schedule
engine.

---

## 1. Mission phases are a closed vocabulary

| Canonical phase | Label | Notes |
|---|---|---|
| `preflight` | Preflight | before launch |
| `launch` | Launch | launch event |
| `ascent` | Ascent | ascent to orbit or trajectory |
| `early-orbit` | Early orbit | early mission operations |
| `inflight-operations` | Inflight operations | routine in-flight work |
| `eva-preparation` | EVA preparation | preparation for EVA |
| `eva` | EVA | extravehicular activity |
| `return` | Return | return phase |
| `landing` | Landing | landing event |
| `postflight-recovery` | Postflight recovery | post-landing recovery |
| `custom` | Custom phase | requires `customPhaseLabel` |

Three legacy values remain readable for records written before Stage 4: `inflight`, `postflight`, and
`reconditioning`. They are accepted by stored-record and check-in validation but are rejected by
`createMissionContext` and `recordMissionPhase`. New records must use a canonical phase.

### Explicit selection rules

- A phase is always a supplied value. No function derives it from a timestamp, date, event order,
  elapsed time, or fictional mission schedule.
- `custom` requires a non-empty `customPhaseLabel`.
- A non-custom phase must not retain a `customPhaseLabel`; `recordMissionPhase` removes a stale label
  when moving to a canonical non-custom phase.
- A repeated phase recording is allowed. It records the new explicit value and timestamp; it is not
  treated as an inference.

## 2. Mission profiles

`MissionProfileKind` is a closed union:

- `earth-orbit`
- `lunar`
- `deep-space`
- `configurable`

The profile describes the mission's operating domain. `configurable` is for a user-defined profile
and does not silently become one of the other values. The profile is independent of phase: a lunar
mission can be in `preflight`, and an Earth-orbit mission can be in `postflight-recovery`.

## 3. Mission context record

```ts
interface MissionContext {
  id: string;
  missionId: string;
  missionName: string;
  profile: MissionProfileKind;
  phase: MissionPhase;
  customPhaseLabel?: string;
  phaseRecordedAt: string;
  operationalContext?: string;
  source: MissionRecordSource;
  provenance: MissionRecordProvenance;
  createdAt: string;
  updatedAt: string;
  interpretation: "mission-context-not-telemetry";
}
```

- `phaseRecordedAt` is when the phase was explicitly recorded.
- `operationalContext` is optional bounded text (2,000 characters).
- `source` is `manual-entry`, `imported-record`, or `simulated-demo`.
- `provenance` is `browser-user-generated` or `simulated-demo`.
- A simulated source must carry simulated provenance; a non-simulated source must not.
- Only `browser-user-generated` contexts can be stored as real records.
- `createdAt` and `updatedAt` must be valid timestamps, and `updatedAt` cannot precede `createdAt`.

## 4. Mission event record

```ts
interface MissionEvent {
  id: string;
  missionContextId: string;
  missionId: string;
  occurredAt: string;
  description: string;
  operationalContext?: string;
  phase?: MissionPhase;
  source: MissionRecordSource;
  provenance: MissionRecordProvenance;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  interpretation: "manually-recorded-mission-event";
}
```

- `occurredAt` is the time the user says the event occurred.
- `recordedAt` is when the record was entered.
- `phase` is optional and explicit. It is **never** derived from `occurredAt`. An event without a
  phase keeps no phase property at all.
- `description` is required.
- `updateMissionEvent` changes description, operational context, or `occurredAt` only. It preserves
  identity, source, provenance, `recordedAt`, `createdAt`, and any explicit phase, and updates
  `updatedAt`.

## 5. Validation

`validateMissionContext` and `validateMissionEvent` return `{ valid, errors }` and never throw.
Creation functions validate and throw on invalid input. Checks include:

- required identifiers and text;
- closed profile, source, and provenance vocabularies;
- phase membership and custom-label rules;
- valid timestamps and creation/update ordering;
- bounded optional text;
- source/provenance consistency;
- preservation of the record's interpretation literal.

Stored legacy phases are accepted by validation so historical records remain readable. They are not
accepted for new context creation or phase changes.

## 6. Persistence

Mission contexts and events live in the additive v2 IndexedDB stores:

- `mission-contexts`
- `mission-events`

`saveMissionContext` / `saveMissionEvent` are insert-only and reject duplicate IDs. Updates require
`replaceMissionContext` / `replaceMissionEvent`, which validate the full record again. Listing and
deletion are available. The stores are browser-local and offline; there is no server or sync.

## 7. Relationship to other domains

- A check-in may store an `missionContextId` and an explicit `missionPhase`.
- Signal Concordance may take an existing `MissionContext` as explicit phase context.
- A follow-up may name a `mission-event` as its related observation.
- No mission record is joined to NASA OSDR measurements.

A check-in phase and the mission context phase can disagree. Signal Concordance reports this as
`conflicting-explicit-records` and does not choose one. LIMEN never resolves the conflict
automatically.

## 8. Non-goals

The model does not:

- ingest live telemetry or mission-control feeds;
- infer a phase from time or from an event;
- schedule, predict, or simulate mission operations;
- assign a risk, readiness, or health status to a phase;
- claim that a phase causes a physiological or behavioural change;
- merge a simulated mission context with real browser records.
