import assert from "node:assert/strict";
import test from "node:test";
import { CHECKIN_NOTE_MAX_LENGTH, validateCheckIn } from "@/lib/storage/checkin-validation";
import { deleteCheckIn, getCheckIn, listCheckIns, saveCheckIn } from "@/lib/storage/checkin-storage";
import { createInMemoryStorageAdapter } from "@/lib/storage/database";
import type { SymptomCheckInRecord } from "@/types/checkin";

function checkIn(overrides: Partial<SymptomCheckInRecord> = {}): SymptomCheckInRecord {
  return { id: "checkin-1", participantId: "participant-1", recordedAt: "2026-01-01T00:00:00.000Z", context: "pre-assessment", provenance: "browser-user-generated", dizzinessOrDisorientation: 0, balanceOrCoordinationDifficulty: 10, movementConfidence: 10, interpretation: "self-report-not-an-objective-vestibular-measurement", ...overrides };
}

test("check-in validation accepts 0–10 boundaries and unanswered optional scores", () => {
  const unanswered = checkIn({ dizzinessOrDisorientation: undefined, balanceOrCoordinationDifficulty: undefined, nausea: undefined, visualDiscomfort: undefined, fatigue: undefined, movementConfidence: undefined });
  assert.deepEqual(validateCheckIn(unanswered), { valid: true, errors: [] });
  assert.equal(validateCheckIn(checkIn({ nausea: 11 as 10 })).valid, false);
  assert.equal(validateCheckIn(checkIn({ fatigue: 2.5 as 2 })).valid, false);
  assert.equal(validateCheckIn(checkIn({ context: "invalid" as "general" })).valid, false);
  assert.equal(validateCheckIn(checkIn({ freeTextNote: "x".repeat(CHECKIN_NOTE_MAX_LENGTH + 1) })).valid, false);
});

test("check-ins persist as self-reports, preserve missing values, and reject duplicate IDs", async () => {
  const adapter = createInMemoryStorageAdapter();
  const record = checkIn({ nausea: undefined, missionPhase: "preflight", freeTextNote: "Self-reported before assessment." });
  const saved = await saveCheckIn(record, adapter);
  assert.equal(saved.ok, true);
  const retrieved = await getCheckIn(record.id, adapter);
  assert.equal(retrieved.ok, true);
  if (retrieved.ok && retrieved.value) {
    assert.equal(retrieved.value.provenance, "browser-user-generated");
    assert.equal(retrieved.value.interpretation, "self-report-not-an-objective-vestibular-measurement");
    assert.equal(retrieved.value.nausea, undefined);
  }
  const duplicate = await saveCheckIn(record, adapter);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, "duplicate-id");
  const list = await listCheckIns(adapter);
  assert.equal(list.ok, true);
  if (list.ok) assert.equal(list.value.length, 1);
  assert.equal((await deleteCheckIn(record.id, adapter)).ok, true);
  const missing = await getCheckIn(record.id, adapter);
  assert.equal(missing.ok, true);
  if (missing.ok) assert.equal(missing.value, null);
});
