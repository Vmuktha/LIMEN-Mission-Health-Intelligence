# Metrics and definitions

## Scope and coordinate conventions

LIMEN is a shortened, browser-based visuomotor adaptation prototype inspired by the 45° visual-feedback rotation reported by Tays et al. (2025). It is not the published joystick/MRI protocol, clinically validated, or a measure of neural or vestibular activity.

Pointer coordinates use CSS pixels: +x is right and +y is down. In this screen coordinate system, positive angles are clockwise. Before each v0.3.0 target, the participant must place the pointer within 12 CSS pixels of the visible centre marker and remain there for 250 ms. LIMEN records the latest observed pointer coordinate as the actual start, then presents the target. A displayed-feedback rotation maps the pointer vector about this actual start by +45° clockwise; it changes the visual cursor only, not the participant's actual hand movement. The inverse uses −45°.

Protocol v0.3.0 is a measurement-protocol change: the native browser pointer is hidden during active interaction, and only LIMEN's displayed feedback cursor (including a positioning cursor) is visible. Pointer capture and interaction behaviour are unchanged, but v0.2.0 and v0.3.0 records must not be pooled for any derived metric without a separately justified compatibility analysis. Per-trial records identify `0.2.0-actual-pointer-origin` and `0.3.0-actual-pointer-origin-hidden-cursor`; records without a verified positioning procedure remain `0.1.0-legacy-origin-unverified`.

Coordinate-transform inputs (both coordinate components and rotation angle) must be finite numbers. Non-finite inputs are rejected with an error rather than silently producing a fabricated coordinate.

The default protocol has 16 baseline, 32 adaptation, 16 late-adaptation, and 16 washout trials. Each phase has equal counts of up, right, down, and left targets; each four-trial block is shuffled. Trial counts must remain positive multiples of four.

## Eligibility

Only completed trials from a single homogeneous corrected-origin protocol (v0.2.0 or v0.3.0) with a finite captured actual start and a positioning completion timestamp may contribute directional, trajectory, correction, adaptation, or aftereffect measurements. Movement onset is the first raw sample at least 3 CSS pixels from that actual start. Aborted, timed-out, invalid, missing, non-finite, or chronologically impossible values are retained in trial records but produce `null` measurements. They are never replaced with zero. Phase summaries report every planned/recorded phase trial and the count eligible for directional-error analysis. Reaction and movement times require valid timestamps but not a verified origin, so they remain available for a homogeneous legacy session. A trial collection containing more than one measurement protocol version — including v0.2.0 and v0.3.0 — withholds every pooled mean, including reaction and movement time, rather than merging incompatible protocols. Missing, unknown, or inconsistent measurement versions are withheld conservatively.

| Metric | Formula and inputs | Unit | Exclusion rule | Interpretation and limit |
| --- | --- | --- | --- | --- |
| Reaction time | `movementOnsetAt − targetPresentedAt` from ISO timestamps. | milliseconds | Null for non-completed trial, absent/invalid timestamps, or negative elapsed time. A zero value is retained if recorded. | Target-response timing only; it is not a neurological measure. |
| Movement time | `movementCompletedAt − movementOnsetAt`. | milliseconds | Null for non-completed trial, absent/invalid timestamps, negative duration, or zero duration. | Pointer movement duration only; hardware and input method can affect it. |
| Directional error | `normalize(angle(first raw movement sample ≥ 3 CSS pixels from actual captured start − actual captured start) − angle(target − actual captured start))`. | signed degrees, positive clockwise | Null unless a completed corrected-origin trial has a finite captured actual start and a qualifying sample. | Initial aiming error from the first movement sample, not an error at peak velocity, full learning, or a clinical readiness score. |
| Trajectory deviation | Root-mean-square perpendicular distance of recorded trajectory points from the line from start to target. | CSS pixels | Null for non-completed trials without trajectory data or with coincident start/target. | Geometric path deviation; it depends on display scale and sample density. |
| Correction behaviour | Count of adjacent non-zero trajectory segments whose heading changes by at least 10°. Peak velocity time is the elapsed time of the highest positive segment velocity. | count; peak time in milliseconds | Null for non-completed trials or no non-zero segment. Zero corrections is valid only for an eligible path. | A geometric turn count, not a measure of corrective neural control. |
| Phase summary | Arithmetic mean of eligible trial-level directional errors, reaction times, and movement times within the named phase. | degrees or milliseconds | Mean is null if no eligible values exist, or if the phase mixes measurement protocol versions; total and valid directional-error trial counts are retained. | Descriptive within-session summary. |
| Adaptation change | `late-adaptation mean directional error − early-adaptation mean directional error`. | signed degrees | Null if either phase mean is null. | Describes change in this prototype task; it is not a prediction of astronaut performance. |
| Signed washout aftereffect | `mean(first N ordered washout errors) − baseline mean error`; default `N = 4`. The sign is retained (positive is clockwise); magnitude is the absolute signed value. | signed degrees; magnitude in degrees | Null if baseline or the initial ordered washout window has no eligible directional-error measurements. | Residual directional error after rotation removal; no clinical threshold is applied. |
| Personal-reference comparison | `current observation metric − personal reference session metric`. | metric-specific | Null if either source metric is missing or the measurement protocols are not identical. | Descriptive within-person comparison only, never a diagnosis or recovery score. |

## Recovery observations and personal reference sessions

Phase 7A adds a pure recovery analytics layer. It is an analysis model, not a dashboard, a clinical recovery model, or a readiness score.

A recovery observation is constructed only from a completed browser-local assessment session. The loader uses the existing `listAssessmentSessions()` and `listCheckIns()` storage functions, then sorts assessment sessions by their actual `metadata.completedAt` timestamp and check-ins by `recordedAt`. IndexedDB `getAll()` order is never treated as chronological order. Incomplete, aborted, missing-completion, malformed, non-finite, or non-browser/simulated records are excluded or rejected with an explicit reason in the returned dataset. A trial whose `sessionId` does not match its parent session is withheld. Metrics are recomputed from raw trials at analysis time; stored summaries are never trusted and historical records are never rewritten.

Recovery metrics remain separate values. No composite score is calculated:

| Recovery metric | Source | Unit | Metric-specific eligibility |
| --- | --- | --- | --- |
| Reaction-time mean | Mean of eligible trial reaction times. | milliseconds | Homogeneous known measurement protocol and valid timing. |
| Movement-time mean | Mean of eligible trial movement times. | milliseconds | Homogeneous known measurement protocol and valid positive timing. |
| Directional-error mean | Mean of eligible signed trial directional errors. | signed degrees, positive clockwise | Homogeneous corrected protocol with verified actual-pointer origins. |
| Trajectory-deviation mean | Mean of eligible trial trajectory deviations. | CSS pixels | Homogeneous corrected protocol with verified actual-pointer origins. |
| Correction-count mean | Mean of eligible trial correction counts. | count | Homogeneous corrected protocol with verified actual-pointer origins. |
| Peak-velocity-time mean | Mean of eligible trial peak-velocity elapsed times. | milliseconds | Homogeneous corrected protocol with verified actual-pointer origins. |
| Adaptation change | `late-adaptation mean directional error − early-adaptation mean directional error`. | signed degrees | Origin-sensitive eligibility and eligible directional errors in both adaptation phases. |
| Washout aftereffect | `mean(first N ordered washout errors) − baseline mean error`; default `N = 4`. | signed degrees | Origin-sensitive eligibility and eligible directional errors in baseline and the initial washout window. |

A **Personal Reference Session** is an explicit within-person comparison reference. It is not a clinical baseline or a claim that the earliest observation was healthy. The default is the earliest completed observation eligible for the specific metric being compared; LIMEN never automatically chooses the best-performing or most recent session. An explicit override is accepted only when the session belongs to the same browser-local participant ID, is a valid completed observation, is eligible for that metric, and satisfies any required measurement-protocol compatibility check. A session may be eligible for timing metrics but not for origin-sensitive metrics.

Any delta requires an identical measurement protocol version in both observations, including timing metrics. v0.2.0 and v0.3.0 records are never pooled or compared directly. Unknown, mixed, or inconsistent session/trial protocols make the affected comparison unavailable with an explanation; incompatibility is not silently discarded. The session metadata protocol version is cross-checked against the per-trial measurement version.

A metric delta is always `currentValue − referenceValue`. The signed change is retained. A positive or negative value is not labelled as improvement or deterioration because the interpretation depends on the metric. No arbitrary cutoffs are applied, missing values stay null, and no interpolation, zero imputation, or composite recovery score is produced. Each delta reports its reference and current values, comparison validity, measurement version, eligible and total trial counts, and an explanation when unavailable. Results are descriptive only.

## Recovery dashboard presentation rules

Phase 7B presents the recovery analytics at `/recovery` without adding new formulas. The dashboard is a client-side view over the same pure dataset, reference selection, and delta functions.

The data overview reports completed sessions and observations with at least one eligible metric as separate values. A session count is not a count of comparable observations, and a completed session may still have no eligible metric.

The observation under review defaults to the most recently completed observation. The reference control offers automatic selection or an explicit session. Automatic selection is resolved separately for each metric and uses the earliest eligible completed observation that also shares the current observation's measurement protocol version; it is never the best-performing or most recent session. An observation whose measurement protocol version is unknown — a legacy record without a per-trial measurement label, or an unrecognized protocol — has no protocol-compatible reference at all, because such an observation can never be compared with any other. The dashboard states that no protocol-compatible reference exists instead of naming a session that cannot be used.

An explicit selection is validated for participant ownership, metric eligibility, measurement-protocol compatibility, and assessment-protocol compatibility. When it is rejected, the selected session keeps its identity, its protocol, and the reason it cannot be used. The observation under review is excluded from its own reference options. When a metric cannot use the selected reference, the reason is shown instead of substituting another value.

Every candidate reference session is listed with the number of metrics it could be compared with and, for each metric, whether it is eligible or why it is not. A candidate is never offered without its compatibility being stated.

Metric cards display the current value, reference value, signed `current − reference` difference, the metric-specific unit, eligible/total trial counts, measurement protocol, reference session, and availability. The unit is stated once per metric rather than appended to every number, so an integer correction count is shown as an integer count and a signed difference is never read as an improvement claim. Missing values display as unavailable. Legacy timing-only observations are labelled; they do not receive origin-sensitive values. No card combines metrics or implies improvement/deterioration from the sign.

Longitudinal charts plot eligible values only. A new visual series begins when the measurement protocol changes or when an observation has no eligible value for the selected metric. Missing observations therefore appear as gaps, not zero. Connecting lines are visual guides, not a continuous measurement, and no interpolation is applied. The accompanying table lists every completed observation, its actual completion date, eligible/total trials, protocol, and whether the value is eligible or a gap. Chart geometry — domain padding, axis ticks, and point positions — is computed by pure helpers in `src/lib/analytics/recovery-chart.ts`.

All timestamps are displayed in UTC so a stored record is unambiguous regardless of the reader's timezone.

Performance–self-report alignment uses only explicitly associated post-assessment check-ins for both the current and reference sessions. Pre-assessment, general, unassociated, orphaned, or other-session check-ins are excluded and counted. Multiple check-ins are compared individually and never averaged. The self-report item must be answered in both check-ins; otherwise the row is `Insufficient data`. Performance change uses the selected metric delta. The neutral categories are:

| Category | Rule | Limit |
| --- | --- | --- |
| Both increased | Performance change and self-report change are both greater than zero. | Direction only; no improvement or deterioration meaning. |
| Both decreased | Both changes are less than zero. | Direction only; no improvement or deterioration meaning. |
| Changed in opposite directions | Non-zero changes have opposite signs. | Co-observation only; no causation. |
| No observed change | Both changes are exactly zero within numerical tolerance. | Does not establish stability or recovery. |
| Insufficient data | Either value is missing, the performance comparison is unavailable, or only one measure changed. | No same/opposite classification is forced. |

The dashboard does not calculate a readiness score, discrepancy score, recovery threshold, or causal relationship between performance and subjective state.

## Browser capture and timepoints

The interactive task captures each actual browser pointer-move sample in task-area CSS pixels and stores it in `trajectory`. It records a separate `displayedCursorTrajectory` for the visual-feedback positions presented to the participant. The latter may be rotated; it is not substituted for the actual pointer path in behavioural calculations. No interpolation, smoothing, or invented samples are applied.

Sessions created before the v0.2.0 actual-pointer-origin protocol, or any record lacking a verified positioning capture, are `legacy-origin-unverified`. Their directional error, trajectory deviation, correction behaviour, adaptation change, and washout aftereffect remain historically preserved but are unavailable for comparison with corrected sessions. They are never pooled with corrected-origin measurements. Empty trial collections are reported as `no-trials`. v0.2.0 and v0.3.0 sessions both contain corrected origins, but they are distinct measurement protocols and are never pooled; each is assessed only as its own homogeneous group. Direct trial comparison requires both records to be verified-origin and to share the same explicit measurement version. Historical stored summaries may be recomputed from raw trials at display or analysis time, but stored records are not rewritten.

Within a session, target presentation and pointer samples use the monotonic `performance.now()` time origin. Each sample retains milliseconds elapsed from target presentation. The task derives related ISO timestamps from a fixed session mapping to allow the existing pure engine to validate ordering; it does not calculate within-session durations from arbitrary wall-clock reads.

## Pause and active-duration semantics

Pausing during an active target invalidates that trial and advances the plan; it is not resumed. The invalid record retains its raw trajectory and timestamps, has no completion timestamp, and produces `null` reaction and movement times. A fresh positioning stage begins only when the participant resumes. Pausing during positioning discards the unrecorded positioning attempt. Paused intervals therefore never occur inside a recorded reaction or movement interval, and the 12-second trial timeout measures active trial time only. Resume does not extend any already-recorded timestamp.

## Timepoints and ordering

The trial engine records the target-presentation timestamp, optional movement-onset timestamp, optional completion timestamp, and trajectory samples with milliseconds elapsed from target presentation. It preserves a session-wide trial index. Washout analysis selects the first ordered de-adaptation trials before excluding invalid trials, so the selected window cannot be shifted by missing data.

## Data boundaries

Published astronaut findings are evidence, not LIMEN records. Browser records are user-generated interactions. Simulated mission profiles are separately marked and are never combined with either. NASA Campaign 3 remains excluded from computational implementation pending file-level validation.
