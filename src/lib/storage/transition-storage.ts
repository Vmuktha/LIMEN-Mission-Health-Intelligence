// Transition storage module
// Mirrors the pattern used in mission-storage.ts for the new mission-transitions store.

import {
  MISSION_TRANSITION_STORE,
  failure,
  failureFromError,
  getIndexedDbAdapter,
  success,
  type StorageAdapter,
  type StorageResult,
} from "./database";
import { isMissionTransition } from "@/lib/mission/transition";
import type { MissionTransition } from "@/types/transition";

/** Save a new mission transition record. */
export async function saveMissionTransition(
  transition: MissionTransition,
  adapter?: StorageAdapter,
): Promise<StorageResult<MissionTransition>> {
  if (!isMissionTransition(transition)) {
    return failure("invalid-record", "Mission transition did not pass validation.");
  }
  if (transition.provenance !== "browser-user-generated") {
    return failure(
      "invalid-record",
      "Only user-generated mission transitions can be stored as real records.",
    );
  }
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.add(MISSION_TRANSITION_STORE, transition.id, transition);
    return success(transition);
  } catch (error) {
    return failureFromError(error, "Unable to save the mission transition locally.");
  }
}

/** Replace an existing mission transition (validated update). */
export async function replaceMissionTransition(
  transition: MissionTransition,
  adapter?: StorageAdapter,
): Promise<StorageResult<MissionTransition>> {
  if (!isMissionTransition(transition)) {
    return failure("invalid-record", "Mission transition did not pass validation.");
  }
  if (transition.provenance !== "browser-user-generated") {
    return failure(
      "invalid-record",
      "Only user-generated mission transitions can be stored as real records.",
    );
  }
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.put(MISSION_TRANSITION_STORE, transition.id, transition);
    return success(transition);
  } catch (error) {
    return failureFromError(error, "Unable to update the mission transition locally.");
  }
}

export async function getMissionTransition(
  transitionId: string,
  adapter?: StorageAdapter,
): Promise<StorageResult<MissionTransition | null>> {
  if (!transitionId.trim()) {
    return failure("invalid-record", "Mission transition ID is required.");
  }
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.get<MissionTransition>(MISSION_TRANSITION_STORE, transitionId));
  } catch (error) {
    return failureFromError(error, "Unable to retrieve the mission transition.");
  }
}

export async function listMissionTransitions(
  adapter?: StorageAdapter,
): Promise<StorageResult<readonly MissionTransition[]>> {
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.getAll<MissionTransition>(MISSION_TRANSITION_STORE));
  } catch (error) {
    return failureFromError(error, "Unable to list mission transitions.");
  }
}

export async function deleteMissionTransition(
  transitionId: string,
  adapter?: StorageAdapter,
): Promise<StorageResult<void>> {
  if (!transitionId.trim()) {
    return failure("invalid-record", "Mission transition ID is required.");
  }
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.delete(MISSION_TRANSITION_STORE, transitionId);
    return success(undefined);
  } catch (error) {
    return failureFromError(error, "Unable to delete the mission transition.");
  }
}
