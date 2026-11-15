import assert from "node:assert/strict";
import test from "node:test";
import { buildMissionActivityTimeline } from "@/lib/mission/activity-timeline";
import type { MissionActivitySources } from "@/lib/mission/activity-timeline";

const empty: MissionActivitySources = { transitions: [], events: [], assessments: [], checkIns: [], followUps: [] };

test("timeline sorts by event time and preserves distinct recording time and explicit phase", () => {
  const entries = buildMissionActivityTimeline({
    ...empty,
    events: [{ id: "event-1", missionContextId: "ctx", missionId: "m", occurredAt: "2026-05-01T10:00:00-04:00", description: "Manual event", phase: "inflight-operations", source: "manual-entry", provenance: "browser-user-generated", recordedAt: "2026-05-01T15:00:00Z", createdAt: "2026-05-01T15:00:00Z", updatedAt: "2026-05-01T15:00:00Z", interpretation: "manually-recorded-mission-event" }],
    checkIns: [{ id: "check-1", participantId: "p", recordedAt: "2026-05-01T13:00:00Z", context: "general", provenance: "browser-user-generated", interpretation: "self-report-not-an-objective-vestibular-measurement" }],
  });
  assert.deepEqual(entries.map((entry) => entry.id), ["event-1", "check-1"]);
  assert.equal(entries[0]?.occurredAt, "2026-05-01T10:00:00-04:00");
  assert.equal(entries[0]?.recordedAt, "2026-05-01T15:00:00Z");
  assert.equal(entries[0]?.phase, "inflight-operations");
  assert.equal(entries[1]?.phase, null);
});

test("simulated records are omitted and malformed timestamps sort after dated records", () => {
  const entries = buildMissionActivityTimeline({
    ...empty,
    events: [
      { id: "simulated", missionContextId: "ctx", missionId: "m", occurredAt: "2026-05-02T00:00:00Z", description: "not operational", source: "simulated-demo", provenance: "simulated-demo", recordedAt: "2026-05-02T00:00:00Z", createdAt: "2026-05-02T00:00:00Z", updatedAt: "2026-05-02T00:00:00Z", interpretation: "manually-recorded-mission-event" },
      { id: "missing-time", missionContextId: "ctx", missionId: "m", occurredAt: "invalid", description: "No valid timestamp", source: "manual-entry", provenance: "browser-user-generated", recordedAt: "invalid", createdAt: "invalid", updatedAt: "invalid", interpretation: "manually-recorded-mission-event" },
      { id: "dated", missionContextId: "ctx", missionId: "m", occurredAt: "2026-05-01T00:00:00Z", description: "Dated", source: "manual-entry", provenance: "browser-user-generated", recordedAt: "2026-05-01T00:00:00Z", createdAt: "2026-05-01T00:00:00Z", updatedAt: "2026-05-01T00:00:00Z", interpretation: "manually-recorded-mission-event" },
    ],
  });
  assert.deepEqual(entries.map((entry) => entry.id), ["dated", "missing-time"]);
});
