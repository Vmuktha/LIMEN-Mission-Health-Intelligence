import assert from "node:assert/strict";
import test from "node:test";

import {
  MISSION_PHASE_LABELS,
  ACCEPTED_MISSION_PHASES,
  CANONICAL_MISSION_PHASES,
  LEGACY_MISSION_PHASES,
  isAcceptedMissionPhase,
  isCanonicalMissionPhase,
  isLegacyMissionPhase,
  missionPhaseLabel,
} from "@/lib/mission/phases";
import {
  MISSION_TEXT_MAX_LENGTH,
  createMissionContext,
  createMissionEvent,
  recordMissionPhase,
  updateMissionEvent,
  validateMissionContext,
  validateMissionEvent,
} from "@/lib/mission/context";
import type { MissionContextDraft } from "@/types/mission-context";
import type { MissionPhase } from "@/types/mission";

const NOW = "2026-01-01T00:00:00.000Z";
const LATER = "2026-01-02T00:00:00.000Z";

function draft(overrides: Partial<MissionContextDraft> = {}): MissionContextDraft {
  return {
    id: "ctx-1",
    missionId: "mission-1",
    missionName: "Synthetic Mission",
    profile: "earth-orbit",
    phase: "preflight",
    source: "manual-entry",
    provenance: "browser-user-generated",
    ...overrides,
  };
}

test("the mission-phase vocabulary is closed, labelled, and split into canonical and legacy sets", () => {
  assert.equal(CANONICAL_MISSION_PHASES.length, 11);
  assert.deepEqual(LEGACY_MISSION_PHASES, ["inflight", "postflight", "reconditioning"]);
  assert.equal(ACCEPTED_MISSION_PHASES.length, 14);
  assert.deepEqual([...ACCEPTED_MISSION_PHASES], [...CANONICAL_MISSION_PHASES, ...LEGACY_MISSION_PHASES]);

  for (const phase of ACCEPTED_MISSION_PHASES) {
    assert.equal(typeof MISSION_PHASE_LABELS[phase], "string");
    assert.ok(MISSION_PHASE_LABELS[phase].length > 0);
    assert.equal(missionPhaseLabel(phase), MISSION_PHASE_LABELS[phase]);
    assert.equal(isAcceptedMissionPhase(phase), true);
    assert.equal(isCanonicalMissionPhase(phase), !LEGACY_MISSION_PHASES.includes(phase));
    assert.equal(isLegacyMissionPhase(phase), LEGACY_MISSION_PHASES.includes(phase));
  }

  assert.equal(isAcceptedMissionPhase("unknown-phase"), false);
  assert.equal(isCanonicalMissionPhase("inflight"), false);
  assert.equal(missionPhaseLabel(null), null);
  assert.equal(missionPhaseLabel(undefined), null);
});

test("a new mission context requires an explicitly selected canonical phase", () => {
  for (const phase of CANONICAL_MISSION_PHASES) {
    const context = createMissionContext(
      draft({ id: `ctx-${phase}`, phase, ...(phase === "custom" ? { customPhaseLabel: "Handover" } : {}) }),
      NOW,
    );
    assert.equal(context.phase, phase);
    assert.equal(context.phaseRecordedAt, NOW);
    assert.equal(context.interpretation, "mission-context-not-telemetry");
    assert.equal(validateMissionContext(context).valid, true);
  }

  assert.throws(() => createMissionContext(draft({ phase: undefined as unknown as MissionPhase }), NOW), /canonical mission phase/);
  assert.throws(() => createMissionContext(draft({ phase: "not-a-phase" as MissionPhase }), NOW), /canonical mission phase/);
  for (const phase of LEGACY_MISSION_PHASES) {
    assert.throws(() => createMissionContext(draft({ phase }), NOW), /canonical mission phase/);
  }
});

test("legacy phase values remain readable in stored records without becoming canonical", () => {
  const canonical = createMissionContext(draft(), NOW);
  for (const phase of LEGACY_MISSION_PHASES) {
    const stored = { ...canonical, phase };
    assert.equal(validateMissionContext(stored).valid, true);
    assert.equal(isCanonicalMissionPhase(stored.phase), false);
  }
});

test("custom phases require an explicit label and a non-custom phase cannot retain one", () => {
  assert.throws(() => createMissionContext(draft({ phase: "custom" }), NOW), /custom phase label/);
  const custom = createMissionContext(draft({ phase: "custom", customPhaseLabel: "Handover" }), NOW);
  assert.equal(custom.customPhaseLabel, "Handover");
  assert.equal(validateMissionContext(custom).valid, true);

  const withoutLabel = { ...custom };
  delete (withoutLabel as { customPhaseLabel?: string }).customPhaseLabel;
  assert.equal(validateMissionContext(withoutLabel).valid, false);

  const mislabelled = { ...canonical(draft()), customPhaseLabel: "Handover" };
  assert.equal(validateMissionContext(mislabelled).valid, false);

  const moved = recordMissionPhase(custom, "inflight-operations", { recordedAt: LATER });
  assert.equal(moved.phase, "inflight-operations");
  assert.equal("customPhaseLabel" in moved, false);
  assert.equal(moved.phaseRecordedAt, LATER);
  assert.equal(moved.updatedAt, LATER);
});

function canonical(source: MissionContextDraft) {
  return createMissionContext(source, NOW);
}

test("phase changes are explicit and never inferred; legacy phases are rejected for new recordings", () => {
  const context = createMissionContext(draft(), NOW);
  const next = recordMissionPhase(context, "eva", { recordedAt: LATER });
  assert.equal(next.phase, "eva");
  assert.equal(next.phaseRecordedAt, LATER);
  assert.equal(context.phase, "preflight", "the original record must not be mutated");

  assert.throws(() => recordMissionPhase(context, "inflight" as MissionPhase, { recordedAt: LATER }), /canonical mission phase/);
  assert.throws(() => recordMissionPhase(context, "custom", { recordedAt: LATER }), /custom phase label/);
});

test("mission-context validation rejects missing, malformed, and contradictory provenance", () => {
  assert.equal(validateMissionContext(null).valid, false);
  assert.equal(validateMissionContext({}).valid, false);

  const missingName = { ...canonical(draft()), missionName: "" };
  assert.equal(validateMissionContext(missingName).valid, false);

  assert.throws(() => createMissionContext(draft({ profile: "mars" as MissionContextDraft["profile"] }), NOW), /profile/);
  assert.throws(() => createMissionContext(draft({ source: "simulated-demo", provenance: "browser-user-generated" }), NOW), /Simulated-demo/);
  assert.throws(() => createMissionContext(draft({ source: "manual-entry", provenance: "simulated-demo" }), NOW), /simulated-demo/);
  assert.throws(() => createMissionContext(draft({ phaseRecordedAt: "not-a-date" }), NOW), /recording timestamp/);

  const backwards = { ...canonical(draft()), createdAt: LATER, updatedAt: NOW };
  assert.equal(validateMissionContext(backwards).valid, false);

  const tooLong = { ...canonical(draft()), operationalContext: "x".repeat(MISSION_TEXT_MAX_LENGTH + 1) };
  assert.equal(validateMissionContext(tooLong).valid, false);

  const contradictory = { ...canonical(draft()), interpretation: "telemetry" };
  assert.equal(validateMissionContext(contradictory).valid, false);
});

test("mission events record their own timestamp, description, and source without a derived phase", () => {
  const event = createMissionEvent(
    {
      id: "evt-1",
      missionContextId: "ctx-1",
      missionId: "mission-1",
      occurredAt: "2024-06-01T12:00:00.000Z",
      description: "Crew reported a handling note.",
      source: "manual-entry",
      provenance: "browser-user-generated",
    },
    NOW,
  );
  assert.equal(event.occurredAt, "2024-06-01T12:00:00.000Z");
  assert.equal(event.recordedAt, NOW);
  assert.equal(event.interpretation, "manually-recorded-mission-event");
  assert.equal("phase" in event, false, "a phase must never be inferred from the event timestamp");
  assert.equal(validateMissionEvent(event).valid, true);

  const phased = createMissionEvent(
    {
      id: "evt-2",
      missionContextId: "ctx-1",
      missionId: "mission-1",
      occurredAt: "2024-06-01T13:00:00.000Z",
      description: "EVA preparation activity was explicitly recorded.",
      phase: "eva-preparation",
      source: "manual-entry",
      provenance: "browser-user-generated",
    },
    NOW,
  );
  assert.equal(phased.phase, "eva-preparation");
});

test("mission event updates change descriptive fields only and preserve identity and phase", () => {
  const event = createMissionEvent(
    {
      id: "evt-1",
      missionContextId: "ctx-1",
      missionId: "mission-1",
      occurredAt: "2024-06-01T12:00:00.000Z",
      description: "Initial description.",
      phase: "early-orbit",
      operationalContext: "Initial context.",
      source: "manual-entry",
      provenance: "browser-user-generated",
    },
    NOW,
  );
  const updated = updateMissionEvent(event, { description: "Revised description.", occurredAt: "2024-06-01T12:30:00.000Z" }, LATER);
  assert.equal(updated.id, event.id);
  assert.equal(updated.phase, "early-orbit");
  assert.equal(updated.description, "Revised description.");
  assert.equal(updated.occurredAt, "2024-06-01T12:30:00.000Z");
  assert.equal(updated.updatedAt, LATER);
  assert.equal(updated.recordedAt, NOW, "the original recording time is preserved");
  assert.throws(() => updateMissionEvent(event, { description: "" }, LATER), /description is required/);
});

test("mission event validation rejects malformed timestamps, missing identifiers, and provenance mismatch", () => {
  const base = {
    id: "evt-1",
    missionContextId: "ctx-1",
    missionId: "mission-1",
    occurredAt: "2024-06-01T12:00:00.000Z",
    description: "A recorded event.",
    source: "manual-entry",
    provenance: "browser-user-generated",
  } as const;

  assert.throws(() => createMissionEvent({ ...base, occurredAt: "never" }, NOW), /timestamp/);
  assert.throws(() => createMissionEvent({ ...base, missionContextId: "" }, NOW), /context ID/);
  assert.throws(() => createMissionEvent({ ...base, source: "simulated-demo" }, NOW), /Simulated-demo/);
  assert.throws(() => createMissionEvent({ ...base, phase: "unknown" as MissionPhase }, NOW), /phase is invalid/);

  const event = createMissionEvent(base, NOW);
  assert.equal(validateMissionEvent({ ...event, interpretation: "telemetry" }).valid, false);
  assert.equal(validateMissionEvent({ ...event, phase: "inflight" }).valid, true, "stored legacy event phases stay readable");
});
