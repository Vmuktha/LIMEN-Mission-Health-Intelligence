# Follow-up workflow

**Status:** implemented domain model. No UI consumes it yet.
**Prepared:** 2026-11-14
**Implementation:** `src/types/followup.ts`, `src/lib/followup/workflow.ts`,
`src/lib/storage/followup-storage.ts`

Follow-up records are administrative workflow notes. They help a user keep track of an observation,
a repeat assessment, a contextual note, or a request for authorised review. They are not medical
advice, a prescription, a diagnosis, or an escalation performed by LIMEN.

---

## 1. Record contract

```ts
interface FollowUpRecord {
  id: string;
  relatedObservation: {
    kind: "assessment-session" | "check-in" | "signal-concordance" | "mission-event";
    id: string;
  };
  reason: string;
  notes: readonly FollowUpNote[];
  status: FollowUpStatus;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  author: string;
  source: "user-entered" | "operator-entered" | "simulated-demo";
  provenance: "browser-user-generated" | "simulated-demo";
  referral?: FollowUpReferral;
  history: readonly FollowUpHistoryEntry[];
  interpretation: "workflow-record-not-medical-advice";
}
```

- `relatedObservation` is an explicit kind and identifier. The workflow never searches for a related
  record by timestamp or similarity.
- `dueDate` is optional and manually entered. It is never derived from a schedule.
- `author` and `source` are explicit.
- `history` is additive. Each action appends an entry with its own timestamp and author.
- Only `browser-user-generated` records can be stored as real records.

## 2. Statuses and transitions

| Status | Meaning |
|---|---|
| `open` | created and not yet reviewed, scheduled, completed, or referred |
| `reviewed` | the observation has been reviewed |
| `scheduled` | a follow-up has been scheduled with a manual due date |
| `completed` | the workflow item is complete |
| `referred` | a user-entered request for authorised review has been recorded |

The transition table is closed:

| From | Allowed to |
|---|---|
| `open` | `reviewed`, `scheduled`, `completed`, `referred` |
| `reviewed` | `scheduled`, `completed`, `referred` |
| `scheduled` | `reviewed`, `completed`, `referred` |
| `completed` | none |
| `referred` | none |

`completed` and `referred` are terminal. Every transition validates the target, timestamp, and author.
An invalid transition throws and does not mutate the original record.

## 3. Actions

| Action | Function | Effect |
|---|---|---|
| Review an observation | `reviewObservation` | `open`/`scheduled` → `reviewed`; records `review-observation` |
| Mark reviewed | `markFollowUpReviewed` | same transition with `mark-reviewed` |
| Request a repeat functional assessment | `requestRepeatAssessment` | appends `request-repeat-assessment` without changing status |
| Record a follow-up check-in | `recordFollowUpCheckIn` | requires an explicit check-in ID; appends `record-follow-up-check-in` with `relatedId` |
| Add a contextual note | `addFollowUpNote` | appends a note and an `add-contextual-note` history entry |
| Schedule | `scheduleFollowUp` | requires a valid manually entered due date; sets `scheduled` |
| Complete | `completeFollowUp` | sets terminal `completed` |
| Record a referral | `recordReferral` | sets terminal `referred` and stores the referral record |

`requestRepeatAssessment` and `recordFollowUpCheckIn` are workflow records only. They do not create an
assessment or a check-in, and they do not assert that either happened. The caller must supply the
actual explicit identifier.

## 4. Referral semantics

A referral is a user-entered request for authorised review:

```ts
interface FollowUpReferral {
  id: string;
  referredTo: string;
  reason: string;
  requestedAt: string;
  requestedBy: string;
  status: "requested" | "acknowledged" | "completed";
  performedByLimen: false;
  interpretation: "request-for-authorised-medical-review-not-limen-escalation";
}
```

`recordReferral` enforces:

- `performedByLimen` is `false`;
- the interpretation literal is exactly the non-escalation value;
- the referral has an identifier, recipient, reason, requester, and valid timestamp;
- the follow-up is not already terminal.

LIMEN records the request. It does not contact a clinician, decide that a referral is needed, transmit
data, or claim that an escalation occurred. A future interface must present the referral as a
user-entered request.

## 5. Notes and history

`FollowUpNote` carries `id`, bounded text, author, and `createdAt`. Notes are appended, never rewritten.
`addFollowUpNote` also appends a history entry. `updateFollowUp` does not exist; every change is an
explicit action function that adds history. The original record passed to an action is not mutated.

The history entry shape is:

```ts
interface FollowUpHistoryEntry {
  id: string;
  action: FollowUpActionType;
  at: string;
  author: string;
  note?: string;
  relatedId?: string;
}
```

## 6. Validation

`validateFollowUp` checks:

- identifiers, related kind and related ID;
- non-empty reason and author within the 2,000-character bound;
- closed status, source, and provenance vocabularies;
- valid `createdAt`, `updatedAt`, and optional `dueDate`;
- source/provenance consistency;
- every note's ID, bounded text, author, and timestamp;
- a valid referral when present;
- the `workflow-record-not-medical-advice` interpretation literal.

Simulated-demo records must carry simulated provenance and are rejected by the real storage functions.

## 7. Persistence

Follow-up records live in the additive IndexedDB v2 store `follow-up-records`.

- `saveFollowUp` is insert-only and rejects duplicate IDs.
- `replaceFollowUp` is used after a validated action.
- `listFollowUps` sorts by `createdAt`, then ID.
- `getFollowUp` and `deleteFollowUp` use the explicit record ID.
- No backend, network, account, or authentication is involved.

Deleting a related assessment or check-in does not automatically delete or rewrite a follow-up. The
follow-up keeps its explicit related identifier, and a future interface must show that the related
record is no longer present rather than silently retargeting it.

## 8. Privacy and responsible use

- Follow-up text is user-entered and stored locally in the browser profile.
- LIMEN does not send it to a server, model, or third party.
- LIMEN does not ask for a diagnosis or prescribe treatment.
- The workflow must not be presented as a clinical queue, triage system, or medical escalation path.
- A referral is a request for authorised review, not evidence that review occurred.

## 9. Non-goals

The workflow does not:

- generate medical advice or a treatment plan;
- diagnose a condition or assign a risk level;
- decide whether a referral is clinically necessary;
- contact a clinician or transmit records;
- create an assessment or check-in on the user's behalf;
- infer a due date or a follow-up interval from a schedule;
- pool or reinterpret assessment protocols.
