/**
 * Pure mission-context domain logic.
 *
 * No function here derives a phase from an event timestamp. Phase changes are
 * explicit operations that require a supplied phase and recording timestamp.
 */

import { isAcceptedMissionPhase, isCanonicalMissionPhase } from "./phases";
import type {
  MissionContext,
  MissionContextDraft,
  MissionEvent,
  MissionEventDraft,
  MissionProfileKind,
  MissionRecordProvenance,
  MissionRecordSource,
  MissionValidationResult,
} from "@/types/mission-context";
import type { MissionPhase } from "@/types/mission";

const PROFILE_KINDS: readonly MissionProfileKind[] = ["earth-orbit", "lunar", "deep-space", "configurable"];
const RECORD_SOURCES: readonly MissionRecordSource[] = ["manual-entry", "imported-record", "simulated-demo"];
const RECORD_PROVENANCES: readonly MissionRecordProvenance[] = ["browser-user-generated", "simulated-demo"];
export const MISSION_TEXT_MAX_LENGTH = 2_000;

export function validateMissionContext(value: unknown): MissionValidationResult {
  if (!isRecord(value)) return invalid("Mission context must be an object.");
  const errors: string[] = [];
  if (!isNonEmptyString(value.id)) errors.push("Mission context ID is required.");
  if (!isNonEmptyString(value.missionId)) errors.push("Mission identifier is required.");
  if (!isNonEmptyString(value.missionName)) errors.push("Mission name is required.");
  if (!PROFILE_KINDS.includes(value.profile as MissionProfileKind)) errors.push("Mission profile must be earth-orbit, lunar, deep-space, or configurable.");

  if (!isAcceptedMissionPhase(value.phase)) {
    errors.push("A mission phase must be explicitly selected from the closed vocabulary.");
  } else if (value.phase === "custom") {
    if (!isNonEmptyString(value.customPhaseLabel)) errors.push("A custom phase requires an explicit custom phase label.");
  } else if (value.customPhaseLabel !== undefined) {
    errors.push("A custom phase label is only valid when the phase is custom.");
  }

  if (!isValidTimestamp(value.phaseRecordedAt)) errors.push("The phase must carry a valid recording timestamp.");
  if (!isValidTimestamp(value.createdAt)) errors.push("Mission context createdAt must be a valid timestamp.");
  if (!isValidTimestamp(value.updatedAt)) errors.push("Mission context updatedAt must be a valid timestamp.");
  if (isValidTimestamp(value.createdAt) && isValidTimestamp(value.updatedAt) && Date.parse(value.updatedAt as string) < Date.parse(value.createdAt as string)) {
    errors.push("Mission context updatedAt cannot precede createdAt.");
  }
  validateOptionalText(value.operationalContext, "Operational context", errors);
  validateSourceAndProvenance(value.source, value.provenance, errors);
  if (value.interpretation !== "mission-context-not-telemetry") errors.push("Mission context interpretation must remain mission-context-not-telemetry.");
  return { valid: errors.length === 0, errors };
}

export function validateMissionEvent(value: unknown): MissionValidationResult {
  if (!isRecord(value)) return invalid("Mission event must be an object.");
  const errors: string[] = [];
  if (!isNonEmptyString(value.id)) errors.push("Mission event ID is required.");
  if (!isNonEmptyString(value.missionContextId)) errors.push("Mission event requires a mission context ID.");
  if (!isNonEmptyString(value.missionId)) errors.push("Mission event requires a mission identifier.");
  if (!isValidTimestamp(value.occurredAt)) errors.push("Event timestamp must be a valid timestamp.");
  if (!isNonEmptyString(value.description)) errors.push("Event description is required.");
  if (!isValidTimestamp(value.recordedAt)) errors.push("Event recording timestamp must be valid.");
  if (!isValidTimestamp(value.createdAt)) errors.push("Mission event createdAt must be valid.");
  if (!isValidTimestamp(value.updatedAt)) errors.push("Mission event updatedAt must be valid.");
  if (value.phase !== undefined && !isAcceptedMissionPhase(value.phase)) errors.push("Event phase is invalid when provided.");
  validateOptionalText(value.operationalContext, "Operational context", errors);
  validateSourceAndProvenance(value.source, value.provenance, errors);
  if (value.interpretation !== "manually-recorded-mission-event") errors.push("Mission event interpretation must remain manually-recorded-mission-event.");
  return { valid: errors.length === 0, errors };
}

export function createMissionContext(draft: MissionContextDraft, now = new Date().toISOString()): MissionContext {
  if (!isCanonicalMissionPhase(draft.phase)) {
    throw new Error("New mission contexts must use a canonical mission phase.");
  }
  if (draft.phase === "custom" && !isNonEmptyString(draft.customPhaseLabel)) {
    throw new Error("A custom mission phase requires an explicit custom phase label.");
  }
  const record: MissionContext = {
    id: draft.id,
    missionId: draft.missionId,
    missionName: draft.missionName,
    profile: draft.profile,
    phase: draft.phase,
    ...(draft.customPhaseLabel !== undefined ? { customPhaseLabel: draft.customPhaseLabel } : {}),
    phaseRecordedAt: draft.phaseRecordedAt ?? now,
    ...(draft.operationalContext !== undefined ? { operationalContext: draft.operationalContext } : {}),
    source: draft.source,
    provenance: draft.provenance,
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
    interpretation: "mission-context-not-telemetry",
  };
  const validation = validateMissionContext(record);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return record;
}

/** Explicitly changes the recorded phase. Never called automatically. */
export function recordMissionPhase(
  context: MissionContext,
  phase: MissionPhase,
  options: { readonly recordedAt: string; readonly customPhaseLabel?: string },
): MissionContext {
  if (!isCanonicalMissionPhase(phase)) throw new Error("Phase changes must use a canonical mission phase.");
  if (phase === "custom" && !isNonEmptyString(options.customPhaseLabel)) throw new Error("A custom mission phase requires an explicit custom phase label.");
  const next: MissionContext = {
    ...context,
    phase,
    ...(phase === "custom" && options.customPhaseLabel !== undefined ? { customPhaseLabel: options.customPhaseLabel } : {}),
    phaseRecordedAt: options.recordedAt,
    updatedAt: options.recordedAt,
  };
  if (phase !== "custom") delete (next as { customPhaseLabel?: string }).customPhaseLabel;
  const validation = validateMissionContext(next);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return next;
}

export function createMissionEvent(draft: MissionEventDraft, now = new Date().toISOString()): MissionEvent {
  const event: MissionEvent = {
    id: draft.id,
    missionContextId: draft.missionContextId,
    missionId: draft.missionId,
    occurredAt: draft.occurredAt,
    description: draft.description,
    ...(draft.operationalContext !== undefined ? { operationalContext: draft.operationalContext } : {}),
    ...(draft.phase !== undefined ? { phase: draft.phase } : {}),
    source: draft.source,
    provenance: draft.provenance,
    recordedAt: draft.recordedAt ?? now,
    createdAt: now,
    updatedAt: now,
    interpretation: "manually-recorded-mission-event",
  };
  const validation = validateMissionEvent(event);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return event;
}

/** Updates descriptive fields only. It never infers or changes the mission phase. */
export function updateMissionEvent(
  event: MissionEvent,
  changes: { readonly description?: string; readonly operationalContext?: string; readonly occurredAt?: string },
  now = new Date().toISOString(),
): MissionEvent {
  const next: MissionEvent = {
    ...event,
    ...(changes.description !== undefined ? { description: changes.description } : {}),
    ...(changes.operationalContext !== undefined ? { operationalContext: changes.operationalContext } : {}),
    ...(changes.occurredAt !== undefined ? { occurredAt: changes.occurredAt } : {}),
    updatedAt: now,
  };
  const validation = validateMissionEvent(next);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return next;
}

function validateSourceAndProvenance(source: unknown, provenance: unknown, errors: string[]): void {
  if (!RECORD_SOURCES.includes(source as MissionRecordSource)) errors.push("Mission record source is invalid.");
  if (!RECORD_PROVENANCES.includes(provenance as MissionRecordProvenance)) errors.push("Mission record provenance is invalid.");
  if (source === "simulated-demo" && provenance !== "simulated-demo") errors.push("Simulated-demo records must carry simulated-demo provenance.");
  if (source !== "simulated-demo" && provenance === "simulated-demo") errors.push("Only simulated-demo sources may carry simulated-demo provenance.");
}

function validateOptionalText(value: unknown, label: string, errors: string[]): void {
  if (value === undefined) return;
  if (typeof value !== "string") errors.push(`${label} must be text when provided.`);
  else if (value.length > MISSION_TEXT_MAX_LENGTH) errors.push(`${label} must be at most ${MISSION_TEXT_MAX_LENGTH} characters.`);
}

export function isMissionContext(value: unknown): value is MissionContext {
  return validateMissionContext(value).valid;
}

export function isMissionEvent(value: unknown): value is MissionEvent {
  return validateMissionEvent(value).valid;
}

function invalid(error: string): MissionValidationResult {
  return { valid: false, errors: [error] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidTimestamp(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
