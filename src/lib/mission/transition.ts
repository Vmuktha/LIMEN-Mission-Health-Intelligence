/**
 * Pure logic for explicitly recorded mission transitions.
 *
 * A transition states that a mission context moved from one explicitly
 * recorded phase to another. Nothing here infers a transition from a
 * timestamp, a date, or the passage of time.
 */

import { isCanonicalMissionPhase } from "./phases";
import type {
  MissionTransition,
  MissionTransitionDraft,
  MissionTransitionProvenance,
  MissionTransitionSource,
  MissionTransitionValidationResult,
} from "@/types/transition";

export const MISSION_TRANSITION_NOTE_MAX_LENGTH = 1_000;

const SOURCES: readonly MissionTransitionSource[] = ["manual-entry", "simulated-demo"];
const PROVENANCES: readonly MissionTransitionProvenance[] = ["browser-user-generated", "simulated-demo"];

export function validateMissionTransition(value: unknown): MissionTransitionValidationResult {
  if (!isRecord(value)) return invalid("Mission transition must be an object.");
  const errors: string[] = [];
  if (!isNonEmptyString(value.id)) errors.push("Mission transition ID is required.");
  if (!isNonEmptyString(value.missionContextId)) errors.push("Mission transition requires a mission context ID.");
  if (!isNonEmptyString(value.missionId)) errors.push("Mission transition requires a mission identifier.");
  if (!isCanonicalMissionPhase(value.previousPhase)) errors.push("A transition requires an explicitly recorded canonical previous phase.");
  if (!isCanonicalMissionPhase(value.currentPhase)) errors.push("A transition requires an explicitly recorded canonical current phase.");
  if (isCanonicalMissionPhase(value.previousPhase) && isCanonicalMissionPhase(value.currentPhase) && value.previousPhase === value.currentPhase) {
    errors.push("A transition must move between two different phases.");
  }
  if (value.previousPhase === "custom" && !isNonEmptyString(value.previousCustomPhaseLabel)) errors.push("A custom previous phase requires a custom phase label.");
  if (value.currentPhase === "custom" && !isNonEmptyString(value.currentCustomPhaseLabel)) errors.push("A custom current phase requires a custom phase label.");
  if (value.previousPhase !== "custom" && value.previousCustomPhaseLabel !== undefined) errors.push("A previous custom phase label is only valid for a custom previous phase.");
  if (value.currentPhase !== "custom" && value.currentCustomPhaseLabel !== undefined) errors.push("A current custom phase label is only valid for a custom current phase.");
  if (!isValidTimestamp(value.occurredAt)) errors.push("Transition occurrence timestamp must be valid.");
  if (!isValidTimestamp(value.recordedAt)) errors.push("Transition recording timestamp must be valid.");
  if (!isValidTimestamp(value.createdAt)) errors.push("Mission transition createdAt must be valid.");
  if (!isValidTimestamp(value.updatedAt)) errors.push("Mission transition updatedAt must be valid.");
  if (value.note !== undefined && (typeof value.note !== "string" || value.note.length > MISSION_TRANSITION_NOTE_MAX_LENGTH)) {
    errors.push(`Transition note must be at most ${MISSION_TRANSITION_NOTE_MAX_LENGTH} characters.`);
  }
  if (!SOURCES.includes(value.source as MissionTransitionSource)) errors.push("Mission transition source is invalid.");
  if (!PROVENANCES.includes(value.provenance as MissionTransitionProvenance)) errors.push("Mission transition provenance is invalid.");
  if (value.source === "simulated-demo" && value.provenance !== "simulated-demo") errors.push("Simulated-demo transitions must carry simulated-demo provenance.");
  if (value.source !== "simulated-demo" && value.provenance === "simulated-demo") errors.push("Only simulated-demo sources may carry simulated-demo provenance.");
  if (value.interpretation !== "explicitly-recorded-mission-transition-not-inferred") errors.push("Mission transition interpretation must remain explicitly-recorded-mission-transition-not-inferred.");
  return { valid: errors.length === 0, errors };
}

export function createMissionTransition(draft: MissionTransitionDraft, now = new Date().toISOString()): MissionTransition {
  const transition: MissionTransition = {
    id: draft.id,
    missionContextId: draft.missionContextId,
    missionId: draft.missionId,
    previousPhase: draft.previousPhase,
    currentPhase: draft.currentPhase,
    ...(draft.previousCustomPhaseLabel !== undefined ? { previousCustomPhaseLabel: draft.previousCustomPhaseLabel } : {}),
    ...(draft.currentCustomPhaseLabel !== undefined ? { currentCustomPhaseLabel: draft.currentCustomPhaseLabel } : {}),
    occurredAt: draft.occurredAt,
    ...(draft.note !== undefined ? { note: draft.note } : {}),
    source: draft.source,
    provenance: draft.provenance,
    recordedAt: draft.recordedAt ?? now,
    createdAt: now,
    updatedAt: now,
    interpretation: "explicitly-recorded-mission-transition-not-inferred",
  };
  const validation = validateMissionTransition(transition);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return transition;
}

/** Updates descriptive fields only. It never re-times or re-orders a transition. */
export function updateMissionTransition(
  transition: MissionTransition,
  changes: { readonly note?: string; readonly occurredAt?: string },
  now = new Date().toISOString(),
): MissionTransition {
  const next: MissionTransition = {
    ...transition,
    ...(changes.note !== undefined ? { note: changes.note } : {}),
    ...(changes.occurredAt !== undefined ? { occurredAt: changes.occurredAt } : {}),
    updatedAt: now,
  };
  const validation = validateMissionTransition(next);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return next;
}

export function isMissionTransition(value: unknown): value is MissionTransition {
  return validateMissionTransition(value).valid;
}

/** Deterministic chronological order for recorded transitions. */
export function compareMissionTransitions(left: MissionTransition, right: MissionTransition): number {
  return Date.parse(left.occurredAt) - Date.parse(right.occurredAt)
    || Date.parse(left.recordedAt) - Date.parse(right.recordedAt)
    || left.id.localeCompare(right.id);
}

function invalid(error: string): MissionTransitionValidationResult {
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
