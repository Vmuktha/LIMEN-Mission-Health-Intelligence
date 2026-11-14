# Signal Concordance

**Status:** implemented domain logic. No UI consumes it yet.
**Prepared:** 2026-11-14
**Implementation:** `src/types/concordance.ts` and `src/lib/concordance/signal-concordance.ts`
**Entry point:** `buildSignalConcordance(input)`

Signal Concordance is a transparent comparison engine. It compares explicitly linked assessment
observations and explicitly linked self-reports, then describes whether their signed directions agree,
disagree, show no observed change, or cannot be compared. It is not an AI system, a diagnostic aid, a
risk model, or a prediction engine.

---

## 1. What the engine receives

```ts
interface SignalConcordanceInput {
  readonly participant: RecoveryParticipantDataset;
  readonly currentSessionId: string;
  readonly referenceSessionId: string;
  readonly checkIns: readonly SymptomCheckInRecord[];
  readonly currentCheckInId?: string;
  readonly referenceCheckInId?: string;
  readonly missionContext?: MissionContext | null;
}
```

- `participant` is an existing recovery dataset built from stored browser records. The engine never
  mutates it and never recalculates stored metrics itself.
- Session IDs are mandatory. A session must belong to the supplied participant dataset, otherwise the
  engine throws rather than guessing.
- Check-in IDs are optional but explicit. The engine does not search for a check-in by time.
- `missionContext` is optional and must already be a recorded context. It is not inferred.

The output is a `SignalConcordanceResult` with:

- participant, current and reference observation references;
- protocol compatibility;
- mission-phase context;
- four performance comparisons;
- twelve self-report comparisons;
- one link per metric/field pair (48 links);
- a fixed interpretation literal and a list of limitations.

## 2. Association rules

### 2.1 Sessions

The current and reference sessions are looked up by exact `sessionId` inside the supplied participant
dataset. An unknown ID is an error, not an empty comparison.

A session cannot be its own reference. When both IDs are equal, every performance comparison returns
`self-reference-rejected` and `change: null`.

### 2.2 Check-ins

A check-in is used only when all of the following hold:

1. its ID was explicitly supplied (`currentCheckInId` or `referenceCheckInId`);
2. the ID resolves to a record in `input.checkIns`;
3. its `participantId` matches the observation's participant;
4. its `assessmentSessionId` equals the session being compared.

Timestamp proximity is never used. A check-in recorded at exactly the session completion time is still
rejected if its explicit session identifier points elsewhere or is absent. The returned explanation
states the mismatch and that the record is not reassigned by timestamp.

When no check-in is supplied, the self-report comparisons are `not-explicitly-linked` and the
explanation says that timestamp proximity is not used.

## 3. Protocol compatibility

Both protocol layers must be identical:

| Layer | Source | Rule |
|---|---|---|
| Assessment protocol | `RecoveryObservation.assessmentProtocolVersion` | must match exactly |
| Measurement protocol | `RecoveryObservation.measurementProtocolVersion` | must be known and match exactly |

Compatibility is false when:

- assessment protocol versions differ;
- either measurement protocol is unknown (`null`);
- measurement protocols differ (for example v0.2.0 versus v0.3.0).

Incompatible observations return `availability: "incompatible-protocol"`,
`missingDataStatus: "protocol-incompatible"`, and `change: null` for every performance metric. The
explanation states which layer failed. v0.2.0 and v0.3.0 are never pooled or directly compared, even
when only timing metrics would otherwise be available.

The protocol status is repeated on every performance comparison so a display cannot lose the caveat.

## 4. Performance metrics

| Metric | Definition | Unit | Sign convention | Polarity |
|---|---|---|---|---|
| `movement-time-mean` | mean eligible trial movement time | milliseconds | positive is longer | no inherent valence |
| `directional-error-mean` | mean eligible signed directional error | degrees | positive is clockwise | no inherent valence |
| `adaptation-change` | late-adaptation mean directional error minus early-adaptation mean | degrees | positive is clockwise | no inherent valence |
| `washout-aftereffect` | initial washout mean directional error minus baseline mean | degrees | positive is clockwise | no inherent valence |

The values come from the existing recovery metric layer (`findRecoveryMetric`). A metric is eligible
only when the recovery layer marked it eligible. A missing or ineligible reference value produces
`insufficient-reference`; a missing or ineligible current value produces `missing-data`. Neither is
replaced with zero.

Each comparison declares:

- source observation (session ID, participant, completion time, protocols);
- reference observation;
- metric label and definition;
- unit and sign convention;
- comparison method `identical-protocol-current-minus-reference`;
- change formula `currentValue - referenceValue`;
- direction and availability;
- protocol compatibility;
- missing-data status and explanation;
- an interpretation limit.

A signed change is descriptive for that metric only. LIMEN does not label it improvement,
deterioration, diagnosis, or prediction.

## 5. Self-report fields and polarity

All twelve check-in fields are compared. The original six are unchanged.

| Field | Polarity | Higher answer means |
|---|---|---|
| `dizzinessOrDisorientation` | higher is worse | more dizziness/disorientation |
| `balanceOrCoordinationDifficulty` | higher is worse | more balance/coordination difficulty |
| `nausea` | higher is worse | more nausea |
| `visualDiscomfort` | higher is worse | more visual discomfort |
| `fatigue` | higher is worse | more fatigue |
| `movementConfidence` | higher is better | better movement confidence |
| `sleepQuality` | higher is better | better sleep quality |
| `sleepScheduleDisruption` | higher is worse | more schedule disruption |
| `workload` | higher is worse | higher workload |
| `stress` | higher is worse | more stress |
| `generalWellbeing` | higher is better | better general wellbeing |
| `existingSymptoms` | higher is worse | more symptom burden |

The engine never averages fields, reverses a scale, or combines fields into a construct. Polarity is
reported so a future display can label a change correctly. A change of `+2` in fatigue and a change of
`+2` in movement confidence therefore mean opposite things, and the engine never treats them as one
"score".

An unanswered field is `missing-data` with `sourceValue`/`referenceValue` left `null`. A field
answered in only one check-in is still `missing-data`; the explanation says which side is missing.

## 6. Comparison method and direction

For each metric and field:

```
change = currentValue - referenceValue
```

`direction` is:

- `increased` when change is greater than a small floating-point epsilon;
- `decreased` when change is less than negative epsilon;
- `no-observed-change` when the magnitude is at or below epsilon;
- `unavailable` when there is no valid change.

The epsilon exists only to avoid floating-point noise. It is not a clinical threshold or a meaningful
change criterion.

## 7. Link classification

Each of the 48 metric/field pairs receives one classification:

| Classification | Condition |
|---|---|
| `co-occurrence` | both comparisons are available, both changed, and the signed changes have the same mathematical direction |
| `divergence` | both comparisons are available, both changed, and the signs differ |
| `no-observed-change` | both comparisons are available and both changes are at or below epsilon |
| `unavailable` | either comparison is unavailable, or exactly one side changed |

`unavailable` for a one-sided change is deliberate. The engine does not force a pair into
same/opposite when only one measure moved.

`co-occurrence` means only that two signed directions agree. It does **not** mean the measures agree
in valence: fatigue rising and movement time rising are same-sign, but one is worse and the other has
no inherent valence. It also does not imply causation, a shared mechanism, or a clinical relationship.
Every link carries `interpretation: "direction-only-co-observation-not-causal"` and an explanation
that states this.

## 8. Mission-phase context

The engine reports, but does not infer, phase context:

- current phase source: an explicitly recorded check-in phase, otherwise an explicit mission context,
  otherwise `not-recorded`;
- reference phase source: an explicitly recorded check-in phase, otherwise `not-recorded`;
- relation: `same-phase`, `different-phase`, `unknown`, or `conflicting-explicit-records`.

If a linked check-in and the supplied mission context name different phases, the relation is
`conflicting-explicit-records`. LIMEN reports both and does not choose one. If either side lacks an
explicit phase, the relation is `unknown`. No phase is derived from `recordedAt` or `completedAt`.

## 9. Availability states

| State | Meaning |
|---|---|
| `available` | both values are eligible and a change was computed |
| `insufficient-reference` | the reference lacks an eligible value |
| `incompatible-protocol` | protocol versions do not satisfy the identical-protocol rule |
| `missing-data` | the current observation or a linked check-in lacks an eligible value |
| `not-explicitly-linked` | a check-in ID was absent, unknown, from another participant, or linked to another session |
| `self-reference-rejected` | current and reference session IDs are the same |

These states are explicit in the output. A caller must not render an unavailable comparison as zero,
unchanged, or "no difference".

## 10. Worked example (synthetic workflow fixture)

Two synthetic sessions share measurement protocol v0.2.0:

| Metric | Reference | Current | Change | Direction |
|---|---:|---:|---:|---|
| movement time | 200 ms | 300 ms | +100 ms | increased |
| directional error | 10° | 15° | +5° | increased |
| adaptation change | -20° | -25° | -5° | decreased |
| washout aftereffect | 0° | 5° | +5° | increased |

Explicitly linked check-ins report fatigue 3 → 7 (+4, higher is worse), movement confidence 8 → 4
(-4, higher is better), sleep quality 8 → 3 (-5, higher is better), and stress 8 → 8 (no observed
change).

Resulting links:

- movement time +100 and fatigue +4: `co-occurrence`;
- adaptation change -5 and fatigue +4: `divergence`;
- movement time +100 and movement confidence -4: `divergence`;
- movement time +100 and stress 0: `unavailable` (one-sided change).

These are direction descriptions only. The fixture is synthetic and is not a NASA observation.

## 11. Deliberate non-goals

The engine does not:

- create a composite health, readiness, recovery, or risk score;
- diagnose, prescribe, or recommend a clinical action;
- infer a relationship from timestamp proximity;
- pool v0.2.0 and v0.3.0;
- impute missing values;
- automatically choose a reference session;
- persist a concordance result as a new source of truth;
- use machine learning, an LLM, or a remote service.

## 12. Limitations

- Cursor metrics are task-level observations, not neural or vestibular measurements.
- Self-reports are subjective and may be affected by interpretation, recall, and context.
- A same-sign or opposite-sign pair is a description of two mathematical directions, not a
  scientific finding.
- Small samples, repeated testing, practice, fatigue, device changes, and environment can affect
  performance and self-report independently.
- Mission phase is a user record; it is not telemetry and does not establish exposure.
- The engine cannot establish causality, prediction, diagnosis, fitness for duty, or recovery.
