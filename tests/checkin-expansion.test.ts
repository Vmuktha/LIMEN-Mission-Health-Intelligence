import assert from "node:assert/strict";
import test from "node:test";

import {
  CHECK_IN_FIELDS,
  EXTENDED_CHECK_IN_FIELDS,
  checkInFieldDefinition,
  checkInPolarity,
  createBrowserCheckIn,
  isHigherAnswerBetter,
} from "@/lib/checkin/record";
import { CHECKIN_NOTE_MAX_LENGTH, validateCheckIn } from "@/lib/storage/checkin-validation";
import type { ExtendedCheckInAnswers, SelfReportedScore, SymptomCheckInRecord } from "@/types/checkin";

const OPTIONS = { id: "checkin-1", participantId: "browser-participant", recordedAt: "2026-01-01T00:00:00.000Z" };

function create(answers: ExtendedCheckInAnswers, options: Partial<typeof OPTIONS> & { assessmentSessionId?: string; missionPhase?: SymptomCheckInRecord["missionPhase"]; missionContextId?: string } = {}): SymptomCheckInRecord {
  return createBrowserCheckIn("general", answers, { ...OPTIONS, ...options });
}

test("the original six-item check-in contract is unchanged", () => {
  assert.deepEqual(CHECK_IN_FIELDS.map((definition) => definition.field), [
    "dizzinessOrDisorientation",
    "balanceOrCoordinationDifficulty",
    "nausea",
    "visualDiscomfort",
    "fatigue",
    "movementConfidence",
  ]);
  assert.deepEqual(CHECK_IN_FIELDS.map((definition) => definition.polarity), [
    "higher-is-worse",
    "higher-is-worse",
    "higher-is-worse",
    "higher-is-worse",
    "higher-is-worse",
    "higher-is-better",
  ]);
  assert.deepEqual(CHECK_IN_FIELDS.slice(0, 6), EXTENDED_CHECK_IN_FIELDS.slice(0, 6));
});

test("Stage 4 items are additive and every item declares explicit polarity and construct", () => {
  assert.equal(CHECK_IN_FIELDS.length, 6);
  assert.equal(EXTENDED_CHECK_IN_FIELDS.length, 12);
  assert.deepEqual(EXTENDED_CHECK_IN_FIELDS.slice(6).map((definition) => definition.field), [
    "sleepQuality",
    "sleepScheduleDisruption",
    "workload",
    "stress",
    "generalWellbeing",
    "existingSymptoms",
  ]);

  const expectedPolarity = {
    sleepQuality: "higher-is-better",
    sleepScheduleDisruption: "higher-is-worse",
    workload: "higher-is-worse",
    stress: "higher-is-worse",
    generalWellbeing: "higher-is-better",
    existingSymptoms: "higher-is-worse",
  } as const;

  for (const definition of EXTENDED_CHECK_IN_FIELDS) {
    assert.equal(checkInFieldDefinition(definition.field), definition);
    assert.equal(checkInPolarity(definition.field), definition.polarity);
    assert.ok(definition.scale.length > 0);
    assert.ok(definition.construct.length > 0);
    if (definition.field in expectedPolarity) {
      assert.equal(definition.polarity, expectedPolarity[definition.field as keyof typeof expectedPolarity]);
    }
  }

  assert.equal(isHigherAnswerBetter("sleepQuality"), true);
  assert.equal(isHigherAnswerBetter("generalWellbeing"), true);
  assert.equal(isHigherAnswerBetter("movementConfidence"), true);
  assert.equal(isHigherAnswerBetter("fatigue"), false);
  assert.equal(isHigherAnswerBetter("stress"), false);
  assert.throws(() => checkInFieldDefinition("unknown" as never), /Unknown check-in field/);
});

test("pre-Stage-4 six-item records remain valid and gain no invented values", () => {
  const record = create({ fatigue: 4, movementConfidence: 7 });
  assert.equal(validateCheckIn(record).valid, true);
  assert.equal(record.fatigue, 4);
  assert.equal(record.movementConfidence, 7);
  assert.equal("sleepQuality" in record, false);
  assert.equal("stress" in record, false);
  assert.equal("assessmentSessionId" in record, false);
  assert.equal(record.interpretation, "self-report-not-an-objective-vestibular-measurement");
  assert.equal(record.provenance, "browser-user-generated");
});

test("an omitted answer stays unanswered and is never coerced to zero", () => {
  const record = create({ sleepQuality: 0, fatigue: 0 });
  assert.equal(record.sleepQuality, 0);
  assert.equal(record.fatigue, 0);
  assert.equal("stress" in record, false);
  assert.equal("generalWellbeing" in record, false);
  assert.equal("existingSymptoms" in record, false);

  const unanswered = create({});
  assert.equal(validateCheckIn(unanswered).valid, true);
  for (const definition of EXTENDED_CHECK_IN_FIELDS) {
    assert.equal(definition.field in unanswered, false);
  }
});

test("every score field accepts only integers from 0 through 10", () => {
  const record = create({ sleepQuality: 10, workload: 0, generalWellbeing: 10, existingSymptoms: 0 });
  assert.equal(validateCheckIn(record).valid, true);

  for (const field of ["fatigue", "sleepQuality", "stress"] as const) {
    for (const invalid of [11, -1, 5.5, Number.NaN]) {
      const malformed = { ...record, [field]: invalid as unknown as SelfReportedScore };
      assert.equal(validateCheckIn(malformed).valid, false, `${field} accepted ${invalid}`);
    }
    const text = { ...record, [field]: "5" as unknown as SelfReportedScore };
    assert.equal(validateCheckIn(text).valid, false);
  }
});

test("mission phase and assessment links are stored only when explicitly supplied", () => {
  const record = create(
    { fatigue: 2 },
    { assessmentSessionId: "session-1", missionPhase: "inflight-operations", missionContextId: "ctx-1" },
  );
  assert.equal(record.assessmentSessionId, "session-1");
  assert.equal(record.missionPhase, "inflight-operations");
  assert.equal(record.missionContextId, "ctx-1");
  assert.equal(validateCheckIn(record).valid, true);

  const legacyPhase = create({ fatigue: 2 }, { missionPhase: "inflight" });
  assert.equal(validateCheckIn(legacyPhase).valid, true, "stored legacy phases stay readable");
  assert.equal(validateCheckIn({ ...record, missionPhase: "unknown" }).valid, false);
  assert.equal(validateCheckIn({ ...record, assessmentSessionId: "" }).valid, false);
  assert.equal(validateCheckIn({ ...record, missionContextId: "" }).valid, false);
});

test("free-text context is trimmed, bounded, and omitted when empty", () => {
  const trimmed = create({ fatigue: 1, freeTextNote: "  light-headed after the task  " });
  assert.equal(trimmed.freeTextNote, "light-headed after the task");

  const blank = create({ fatigue: 1, freeTextNote: "   " });
  assert.equal("freeTextNote" in blank, false);

  const tooLong = create({ fatigue: 1, freeTextNote: "x".repeat(CHECKIN_NOTE_MAX_LENGTH + 1) });
  assert.equal(validateCheckIn(tooLong).valid, false);
  assert.equal(validateCheckIn(create({ freeTextNote: "x".repeat(CHECKIN_NOTE_MAX_LENGTH) })).valid, true);
});

test("self-report construction never infers one construct from another", () => {
  const record = create({ fatigue: 9, workload: 8, sleepScheduleDisruption: 7 });
  assert.equal(record.fatigue, 9);
  assert.equal("stress" in record, false);
  assert.equal("sleepQuality" in record, false);
  assert.equal("generalWellbeing" in record, false);
  assert.equal("existingSymptoms" in record, false);
});

test("check-in validation rejects malformed identity, context, provenance, and interpretation", () => {
  const valid = create({ fatigue: 3 });
  assert.equal(validateCheckIn(null).valid, false);
  assert.equal(validateCheckIn({}).valid, false);
  assert.equal(validateCheckIn({ ...valid, id: "" }).valid, false);
  assert.equal(validateCheckIn({ ...valid, participantId: "" }).valid, false);
  assert.equal(validateCheckIn({ ...valid, recordedAt: "not-a-date" }).valid, false);
  assert.equal(validateCheckIn({ ...valid, context: "inflight" }).valid, false);
  assert.equal(validateCheckIn({ ...valid, provenance: "imported" }).valid, false);
  assert.equal(validateCheckIn({ ...valid, interpretation: "clinical" }).valid, false);
});
