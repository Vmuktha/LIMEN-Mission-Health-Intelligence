import assert from "node:assert/strict";
import test from "node:test";

import {
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_TRANSITIONS,
  addFollowUpNote,
  canTransitionFollowUp,
  completeFollowUp,
  createFollowUp,
  markFollowUpReviewed,
  recordFollowUpCheckIn,
  recordReferral,
  requestRepeatAssessment,
  reviewObservation,
  scheduleFollowUp,
  validateFollowUp,
} from "@/lib/followup/workflow";
import type { FollowUpDraft, FollowUpNote, FollowUpReferral, FollowUpStatus } from "@/types/followup";

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-02T00:00:00.000Z";
const DUE = "2026-01-05T00:00:00.000Z";

function draft(overrides: Partial<FollowUpDraft> = {}): FollowUpDraft {
  return {
    id: "follow-up-1",
    relatedObservation: { kind: "assessment-session", id: "session-1" },
    reason: "Directional error changed relative to the personal reference.",
    author: "browser-operator",
    source: "user-entered",
    provenance: "browser-user-generated",
    ...overrides,
  };
}

function note(overrides: Partial<FollowUpNote> = {}): FollowUpNote {
  return {
    id: "note-1",
    text: "A contextual note entered by the operator.",
    author: "browser-operator",
    createdAt: LATER,
    ...overrides,
  };
}

function referral(overrides: Partial<FollowUpReferral> = {}): FollowUpReferral {
  return {
    id: "referral-1",
    referredTo: "Authorised flight-surgeon service",
    reason: "Operator requests authorised medical review.",
    requestedAt: LATER,
    requestedBy: "browser-operator",
    status: "requested",
    performedByLimen: false,
    interpretation: "request-for-authorised-medical-review-not-limen-escalation",
    ...overrides,
  };
}

test("a new follow-up is an open workflow record with explicit author, source, and history", () => {
  const record = createFollowUp(draft({ dueDate: DUE }), NOW);
  assert.equal(record.status, "open");
  assert.deepEqual(record.notes, []);
  assert.equal(record.dueDate, DUE);
  assert.equal(record.author, "browser-operator");
  assert.equal(record.source, "user-entered");
  assert.equal(record.provenance, "browser-user-generated");
  assert.equal(record.interpretation, "workflow-record-not-medical-advice");
  assert.equal(record.history.length, 1);
  assert.equal(record.history[0].action, "create");
  assert.equal(record.createdAt, NOW);
  assert.equal(record.updatedAt, NOW);
  assert.equal(validateFollowUp(record).valid, true);
});

test("the follow-up transition table is closed and terminal states have no outgoing edges", () => {
  assert.deepEqual([...FOLLOW_UP_STATUSES], ["open", "reviewed", "scheduled", "completed", "referred"]);
  assert.deepEqual(FOLLOW_UP_TRANSITIONS.open, ["reviewed", "scheduled", "completed", "referred"]);
  assert.deepEqual(FOLLOW_UP_TRANSITIONS.reviewed, ["scheduled", "completed", "referred"]);
  assert.deepEqual(FOLLOW_UP_TRANSITIONS.scheduled, ["reviewed", "completed", "referred"]);
  assert.deepEqual(FOLLOW_UP_TRANSITIONS.completed, []);
  assert.deepEqual(FOLLOW_UP_TRANSITIONS.referred, []);

  for (const status of FOLLOW_UP_STATUSES) {
    assert.ok(FOLLOW_UP_STATUS_LABELS[status].length > 0);
    for (const target of FOLLOW_UP_STATUSES) {
      assert.equal(canTransitionFollowUp(status, target), FOLLOW_UP_TRANSITIONS[status].includes(target));
    }
  }
});

test("reviewing and completing a follow-up records each action with author and time", () => {
  const opened = createFollowUp(draft(), NOW);
  const reviewed = markFollowUpReviewed(opened, LATER, "reviewer");
  assert.equal(reviewed.status, "reviewed");
  assert.equal(reviewed.updatedAt, LATER);
  assert.equal(reviewed.history.at(-1)?.action, "mark-reviewed");
  assert.equal(reviewed.history.at(-1)?.author, "reviewer");

  const completed = completeFollowUp(reviewed, "2026-01-03T00:00:00.000Z", "reviewer", "Closed after review.");
  assert.equal(completed.status, "completed");
  assert.equal(completed.history.at(-1)?.note, "Closed after review.");
  assert.throws(() => markFollowUpReviewed(completed, "2026-01-04T00:00:00.000Z", "reviewer"), /cannot transition/);
  assert.throws(() => scheduleFollowUp(completed, DUE, "2026-01-04T00:00:00.000Z", "reviewer"), /cannot transition/);
});

test("reviewing an observation is a distinct recorded action", () => {
  const record = reviewObservation(createFollowUp(draft(), NOW), LATER, "reviewer", "Observation reviewed.");
  assert.equal(record.status, "reviewed");
  assert.equal(record.history.at(-1)?.action, "review-observation");
  assert.equal(record.history.at(-1)?.note, "Observation reviewed.");
});

test("scheduling requires an explicit valid due date and never derives one", () => {
  const opened = createFollowUp(draft(), NOW);
  assert.throws(() => scheduleFollowUp(opened, "not-a-date", LATER, "operator"), /valid manually entered due date/);
  const scheduled = scheduleFollowUp(opened, DUE, LATER, "operator");
  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.dueDate, DUE);
  assert.equal(scheduled.history.at(-1)?.action, "schedule");
});

test("notes are additive, timestamped, authored, and part of the immutable history", () => {
  const opened = createFollowUp(draft(), NOW);
  const withNote = addFollowUpNote(opened, note());
  assert.equal(withNote.notes.length, 1);
  assert.equal(withNote.notes[0].text, note().text);
  assert.equal(withNote.updatedAt, LATER);
  assert.equal(withNote.history.at(-1)?.action, "add-contextual-note");
  assert.equal(opened.notes.length, 0, "the original record must not be mutated");

  assert.throws(() => addFollowUpNote(opened, note({ text: "" })), /note|text/i);
  assert.throws(() => addFollowUpNote(opened, note({ author: "" })), /note|author/i);
});

test("repeat-assessment requests and linked follow-up check-ins require explicit records", () => {
  const opened = createFollowUp(draft(), NOW);
  const repeat = requestRepeatAssessment(opened, LATER, "operator", "Please repeat the functional assessment.");
  assert.equal(repeat.status, "open");
  assert.equal(repeat.history.at(-1)?.action, "request-repeat-assessment");

  const checkIn = recordFollowUpCheckIn(opened, "checkin-42", LATER, "operator");
  assert.equal(checkIn.history.at(-1)?.action, "record-follow-up-check-in");
  assert.equal(checkIn.history.at(-1)?.relatedId, "checkin-42");
  assert.throws(() => recordFollowUpCheckIn(opened, "", LATER, "operator"), /explicit check-in identifier/);

  const completed = completeFollowUp(opened, LATER, "operator");
  assert.throws(() => requestRepeatAssessment(completed, LATER, "operator"), /cannot request/);
  assert.throws(() => recordFollowUpCheckIn(completed, "checkin-43", LATER, "operator"), /cannot record/);
});

test("a referral is stored as a user-entered request and never as a LIMEN escalation", () => {
  const opened = createFollowUp(draft(), NOW);
  const referred = recordReferral(opened, referral());
  assert.equal(referred.status, "referred");
  assert.equal(referred.referral?.performedByLimen, false);
  assert.equal(referred.referral?.interpretation, "request-for-authorised-medical-review-not-limen-escalation");
  assert.equal(referred.history.at(-1)?.action, "record-referral");
  assert.equal(referred.updatedAt, LATER);

  assert.throws(() => recordReferral(opened, referral({ performedByLimen: true as never })), /did not perform/);
  assert.throws(() => recordReferral(opened, referral({ interpretation: "limen-escalation" as never })), /did not perform/);

  const terminal = completeFollowUp(opened, LATER, "operator");
  assert.throws(() => recordReferral(terminal, referral()), /cannot record a new referral/);
});

test("follow-up validation rejects missing identity, related observation, author, and provenance contradictions", () => {
  const valid = createFollowUp(draft(), NOW);
  assert.equal(validateFollowUp(null).valid, false);
  assert.equal(validateFollowUp({}).valid, false);
  assert.equal(validateFollowUp({ ...valid, id: "" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, reason: "" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, author: "" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, relatedObservation: { kind: "assessment-session", id: "" } }).valid, false);
  assert.equal(validateFollowUp({ ...valid, relatedObservation: { kind: "unknown", id: "x" } }).valid, false);
  assert.equal(validateFollowUp({ ...valid, status: "closed" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, dueDate: "not-a-date" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, source: "unknown" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, provenance: "unknown" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, interpretation: "medical-advice" }).valid, false);
  assert.equal(validateFollowUp({ ...valid, notes: [{ id: "n", text: "", author: "a", createdAt: NOW }] }).valid, false);
  assert.equal(validateFollowUp({ ...valid, referral: { id: "r" } }).valid, false);
});

test("simulated-demo workflow fixtures carry explicit simulated provenance", () => {
  assert.throws(
    () => createFollowUp(draft({ source: "simulated-demo", provenance: "browser-user-generated" }), NOW),
    /Simulated-demo/,
  );
  assert.throws(
    () => createFollowUp(draft({ source: "user-entered", provenance: "simulated-demo" }), NOW),
    /simulated-demo/,
  );
  const simulated = createFollowUp(draft({ source: "simulated-demo", provenance: "simulated-demo" }), NOW);
  assert.equal(simulated.provenance, "simulated-demo");
});

test("every action refuses an invalid timestamp or a missing author", () => {
  const opened = createFollowUp(draft(), NOW);
  assert.throws(() => markFollowUpReviewed(opened, "never", "reviewer"), /valid timestamp/);
  assert.throws(() => markFollowUpReviewed(opened, LATER, ""), /explicit author/);
  assert.throws(() => completeFollowUp(opened, "never", "reviewer"), /valid timestamp/);
});

test("a status value is never silently coerced", () => {
  for (const status of FOLLOW_UP_STATUSES) {
    assert.equal(typeof status, "string");
  }
  const bogus: FollowUpStatus = "open";
  assert.equal(canTransitionFollowUp(bogus, "reviewed"), true);
});
