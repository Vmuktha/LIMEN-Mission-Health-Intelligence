import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildRecoveryDataset, findRecoveryMetric } from "@/lib/analytics/recovery";
import { markFollowUpReviewed, createFollowUp } from "@/lib/followup/workflow";
import { createMissionContext, createMissionEvent, recordMissionPhase, updateMissionEvent } from "@/lib/mission/context";
import { listAssessmentSessions, saveAssessmentSession } from "@/lib/storage/assessment-storage";
import { listCheckIns, saveCheckIn } from "@/lib/storage/checkin-storage";
import {
  ASSESSMENT_STORE,
  CHECKIN_STORE,
  FOLLOW_UP_STORE,
  LIMEN_DATABASE_NAME,
  LIMEN_DATABASE_VERSION,
  LIMEN_REQUIRED_STORES,
  MISSION_CONTEXT_STORE,
  MISSION_EVENT_STORE,
  MISSION_TRANSITION_STORE,

  failureFromError,
  getIndexedDbAdapter,
  objectStoresRequiringCreation,
  createInMemoryStorageAdapter,
} from "@/lib/storage/database";
import {
  deleteFollowUp,
  getFollowUp,
  listFollowUps,
  replaceFollowUp,
  saveFollowUp,
} from "@/lib/storage/followup-storage";
import {
  deleteMissionContext,
  deleteMissionEvent,
  getMissionContext,
  getMissionEvent,
  listMissionContexts,
  listMissionEvents,
  replaceMissionContext,
  replaceMissionEvent,
  saveMissionContext,
  saveMissionEvent,
} from "@/lib/storage/mission-storage";
import type { FollowUpRecord } from "@/types/followup";
import type { MissionContext, MissionEvent } from "@/types/mission-context";
import { recoveryCheckIn, recoverySession } from "./recovery-fixtures";

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-02T00:00:00.000Z";

function context(): MissionContext {
  return createMissionContext(
    {
      id: "ctx-1",
      missionId: "mission-1",
      missionName: "Synthetic Mission",
      profile: "earth-orbit",
      phase: "preflight",
      source: "manual-entry",
      provenance: "browser-user-generated",
    },
    NOW,
  );
}

function event(): MissionEvent {
  return createMissionEvent(
    {
      id: "evt-1",
      missionContextId: "ctx-1",
      missionId: "mission-1",
      occurredAt: "2024-06-01T00:00:00.000Z",
      description: "Synthetic workflow event.",
      source: "manual-entry",
      provenance: "browser-user-generated",
    },
    NOW,
  );
}

function followUp(id = "follow-up-1", createdAt = NOW): FollowUpRecord {
  return createFollowUp(
    {
      id,
      relatedObservation: { kind: "assessment-session", id: "session-1" },
      reason: "Synthetic workflow reason.",
      author: "operator",
      source: "user-entered",
      provenance: "browser-user-generated",
      createdAt,
    },
    createdAt,
  );
}

test("Stage 4 persistence is an additive v2 upgrade of the existing database name", () => {
  assert.equal(LIMEN_DATABASE_NAME, "limen-neuroadaptive");
  assert.equal(LIMEN_DATABASE_VERSION, 3);
  assert.deepEqual([...LIMEN_REQUIRED_STORES], [
    "assessment-sessions",
    "sensorimotor-checkins",
    "mission-contexts",
    "mission-events",
    "follow-up-records",
    "mission-transitions",
  ]);
  assert.equal(ASSESSMENT_STORE, "assessment-sessions");
  assert.equal(CHECKIN_STORE, "sensorimotor-checkins");
  assert.equal(MISSION_CONTEXT_STORE, "mission-contexts");
  assert.equal(MISSION_EVENT_STORE, "mission-events");
  assert.equal(FOLLOW_UP_STORE, "follow-up-records");
});

test("the upgrade creates only missing stores and never re-creates or removes an existing one", () => {
  assert.deepEqual(objectStoresRequiringCreation([]), [...LIMEN_REQUIRED_STORES]);
  assert.deepEqual(objectStoresRequiringCreation([ASSESSMENT_STORE, CHECKIN_STORE]), [
    MISSION_CONTEXT_STORE,
    MISSION_EVENT_STORE,
    FOLLOW_UP_STORE,
    MISSION_TRANSITION_STORE,
  ]);
  assert.deepEqual(objectStoresRequiringCreation(LIMEN_REQUIRED_STORES), []);
  assert.deepEqual(objectStoresRequiringCreation(["unrelated-store"]), [...LIMEN_REQUIRED_STORES]);

  const existing = [ASSESSMENT_STORE, "unrelated-store"];
  const toCreate = objectStoresRequiringCreation(existing);
  for (const store of existing) assert.equal(toCreate.includes(store), false);
});

test("the storage adapter distinguishes insert-only add from explicit put replacement", async () => {
  const adapter = createInMemoryStorageAdapter();
  await adapter.add("store", "key-1", { value: 1 });
  await assert.rejects(() => adapter.add("store", "key-1", { value: 2 }), /already exists/);
  assert.deepEqual(await adapter.get("store", "key-1"), { value: 1 });

  await adapter.put("store", "key-1", { value: 3 });
  assert.deepEqual(await adapter.get("store", "key-1"), { value: 3 });
  await adapter.delete("store", "key-1");
  assert.equal(await adapter.get("store", "key-1"), null);

  const duplicate = failureFromError(new DOMException("duplicate", "ConstraintError"), "fallback");
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.error.code, "duplicate-id");
    assert.match(duplicate.error.message, /not replaced/);
  }
  const generic = failureFromError(new Error("boom"), "fallback");
  assert.equal(generic.ok, false);
  if (!generic.ok) assert.equal(generic.error.code, "database-error");
});

test("mission contexts persist, list, update additively, and delete without overwriting duplicates", async () => {
  const adapter = createInMemoryStorageAdapter();
  const original = context();
  assert.equal((await saveMissionContext(original, adapter)).ok, true);

  const fetched = await getMissionContext("ctx-1", adapter);
  assert.equal(fetched.ok, true);
  if (fetched.ok) assert.deepEqual(fetched.value, original);

  const duplicate = await saveMissionContext(original, adapter);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, "duplicate-id");

  const changed = recordMissionPhase(original, "inflight-operations", { recordedAt: LATER });
  const replaced = await replaceMissionContext(changed, adapter);
  assert.equal(replaced.ok, true);
  const updated = await getMissionContext("ctx-1", adapter);
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.value?.phase, "inflight-operations");
    assert.equal(updated.value?.phaseRecordedAt, LATER);
  }

  const listed = await listMissionContexts(adapter);
  assert.equal(listed.ok, true);
  if (listed.ok) assert.equal(listed.value.length, 1);

  assert.equal((await deleteMissionContext("ctx-1", adapter)).ok, true);
  const deleted = await getMissionContext("ctx-1", adapter);
  assert.equal(deleted.ok, true);
  if (deleted.ok) assert.equal(deleted.value, null);
});

test("mission events persist, list, update descriptively, and delete", async () => {
  const adapter = createInMemoryStorageAdapter();
  const original = event();
  assert.equal((await saveMissionEvent(original, adapter)).ok, true);

  const fetched = await getMissionEvent("evt-1", adapter);
  assert.equal(fetched.ok, true);
  if (fetched.ok) assert.deepEqual(fetched.value, original);

  const duplicate = await saveMissionEvent(original, adapter);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, "duplicate-id");

  const changed = updateMissionEvent(original, { description: "Updated synthetic event." }, LATER);
  assert.equal((await replaceMissionEvent(changed, adapter)).ok, true);
  const updated = await getMissionEvent("evt-1", adapter);
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.value?.description, "Updated synthetic event.");
    assert.equal(updated.value?.occurredAt, original.occurredAt);
  }

  const listed = await listMissionEvents(adapter);
  assert.equal(listed.ok, true);
  if (listed.ok) assert.equal(listed.value.length, 1);

  assert.equal((await deleteMissionEvent("evt-1", adapter)).ok, true);
  const deleted = await getMissionEvent("evt-1", adapter);
  assert.equal(deleted.ok, true);
  if (deleted.ok) assert.equal(deleted.value, null);
});

test("follow-up records persist in creation order, transition by replacement, and delete", async () => {
  const adapter = createInMemoryStorageAdapter();
  const first = followUp("follow-up-1", NOW);
  const second = followUp("follow-up-2", LATER);
  assert.equal((await saveFollowUp(second, adapter)).ok, true);
  assert.equal((await saveFollowUp(first, adapter)).ok, true);

  const duplicate = await saveFollowUp(first, adapter);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.error.code, "duplicate-id");

  const listed = await listFollowUps(adapter);
  assert.equal(listed.ok, true);
  if (listed.ok) assert.deepEqual(listed.value.map((record) => record.id), ["follow-up-1", "follow-up-2"]);

  const reviewed = markFollowUpReviewed(first, "2026-01-03T00:00:00.000Z", "reviewer");
  assert.equal((await replaceFollowUp(reviewed, adapter)).ok, true);
  const updated = await getFollowUp("follow-up-1", adapter);
  assert.equal(updated.ok, true);
  if (updated.ok) assert.equal(updated.value?.status, "reviewed");

  assert.equal((await deleteFollowUp("follow-up-1", adapter)).ok, true);
  const deleted = await getFollowUp("follow-up-1", adapter);
  assert.equal(deleted.ok, true);
  if (deleted.ok) assert.equal(deleted.value, null);
});

test("real stores reject simulated-demo records while validation still rejects malformed records", async () => {
  const adapter = createInMemoryStorageAdapter();
  const simulatedContext = createMissionContext(
    {
      id: "ctx-simulated",
      missionId: "mission-simulated",
      missionName: "Synthetic Demonstration",
      profile: "configurable",
      phase: "custom",
      customPhaseLabel: "Demonstration",
      source: "simulated-demo",
      provenance: "simulated-demo",
    },
    NOW,
  );
  const simulatedSave = await saveMissionContext(simulatedContext, adapter);
  assert.equal(simulatedSave.ok, false);
  if (!simulatedSave.ok) assert.equal(simulatedSave.error.code, "invalid-record");

  const simulatedEvent = createMissionEvent(
    {
      id: "evt-simulated",
      missionContextId: "ctx-simulated",
      missionId: "mission-simulated",
      occurredAt: NOW,
      description: "Synthetic event.",
      source: "simulated-demo",
      provenance: "simulated-demo",
    },
    NOW,
  );
  const eventSave = await saveMissionEvent(simulatedEvent, adapter);
  assert.equal(eventSave.ok, false);
  if (!eventSave.ok) assert.equal(eventSave.error.code, "invalid-record");

  const simulatedFollowUp = createFollowUp(
    {
      id: "follow-up-simulated",
      relatedObservation: { kind: "signal-concordance", id: "synthetic-concordance" },
      reason: "Synthetic workflow reason.",
      author: "simulated-operator",
      source: "simulated-demo",
      provenance: "simulated-demo",
    },
    NOW,
  );
  const followUpSave = await saveFollowUp(simulatedFollowUp, adapter);
  assert.equal(followUpSave.ok, false);
  if (!followUpSave.ok) assert.equal(followUpSave.error.code, "invalid-record");

  const malformed = { ...context(), missionName: "" };
  const malformedSave = await saveMissionContext(malformed, adapter);
  assert.equal(malformedSave.ok, false);
  if (!malformedSave.ok) assert.equal(malformedSave.error.code, "invalid-record");
});

test("existing assessment and check-in records survive the v2 upgrade and keep their recovery meaning", async () => {
  const adapter = createInMemoryStorageAdapter();
  const session = recoverySession({ sessionId: "legacy-session" });
  const checkIn = recoveryCheckIn({ id: "legacy-check", assessmentSessionId: "legacy-session" });
  assert.equal((await saveAssessmentSession(session, adapter)).ok, true);
  assert.equal((await saveCheckIn(checkIn, adapter)).ok, true);

  assert.equal((await saveMissionContext(context(), adapter)).ok, true);
  assert.equal((await saveMissionEvent(event(), adapter)).ok, true);
  assert.equal((await saveFollowUp(followUp(), adapter)).ok, true);

  const sessions = await listAssessmentSessions(adapter);
  assert.equal(sessions.ok, true);
  if (!sessions.ok) assert.fail("assessment listing failed");
  assert.equal(sessions.value.length, 1);
  assert.deepEqual(sessions.value[0], session);

  const checkIns = await listCheckIns(adapter);
  assert.equal(checkIns.ok, true);
  if (!checkIns.ok) assert.fail("check-in listing failed");
  assert.equal(checkIns.value.length, 1);
  assert.deepEqual(checkIns.value[0], checkIn);

  const dataset = buildRecoveryDataset({ sessions: sessions.value, checkIns: checkIns.value });
  assert.equal(dataset.participants.length, 1);
  const participant = dataset.participants[0];
  assert.equal(participant.observations.length, 1);
  assert.equal(participant.observations[0].sessionId, "legacy-session");
  assert.equal(findRecoveryMetric(participant.observations[0], "movement-time-mean")?.value, 200);
  assert.equal(participant.checkIns[0].association?.assessmentSessionId, "legacy-session");
});

test("offline storage resolves to an explicit unavailable result when IndexedDB is absent", async () => {
  if (globalThis.indexedDB !== undefined) {
    assert.ok(true, "IndexedDB is present in this runtime; unavailability cannot be exercised.");
    return;
  }
  const adapter = await getIndexedDbAdapter();
  assert.equal(adapter.ok, false);
  if (!adapter.ok) assert.equal(adapter.error.code, "unavailable");
});

test("the database module contains no destructive upgrade operation", () => {
  const source = readFileSync(path.resolve(process.cwd(), "src/lib/storage/database.ts"), "utf8");
  assert.equal(source.includes("deleteObjectStore"), false);
  assert.equal(source.includes("objectStoresRequiringCreation"), true);
  assert.equal(source.includes("limen-neuroadaptive"), true);
  assert.equal(/localStorage|sessionStorage|fetch\(/.test(source), false);
});
