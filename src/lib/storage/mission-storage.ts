import {
  MISSION_CONTEXT_STORE,
  MISSION_EVENT_STORE,
  failure,
  failureFromError,
  getIndexedDbAdapter,
  success,
  type StorageAdapter,
  type StorageResult,
} from "./database";
import { isMissionContext, isMissionEvent } from "@/lib/mission/context";
import type { MissionContext, MissionEvent } from "@/types/mission-context";

export async function saveMissionContext(context: MissionContext, adapter?: StorageAdapter): Promise<StorageResult<MissionContext>> {
  if (!isMissionContext(context)) return failure("invalid-record", "Mission context did not pass validation.");
  if (context.provenance !== "browser-user-generated") return failure("invalid-record", "Only user-generated mission contexts can be stored as real records.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.add(MISSION_CONTEXT_STORE, context.id, context);
    return success(context);
  } catch (error) {
    return failureFromError(error, "Unable to save the mission context locally.");
  }
}

/** Replaces an explicitly updated mission context. Validation and provenance still apply. */
export async function replaceMissionContext(context: MissionContext, adapter?: StorageAdapter): Promise<StorageResult<MissionContext>> {
  if (!isMissionContext(context)) return failure("invalid-record", "Mission context did not pass validation.");
  if (context.provenance !== "browser-user-generated") return failure("invalid-record", "Only user-generated mission contexts can be stored as real records.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.put(MISSION_CONTEXT_STORE, context.id, context);
    return success(context);
  } catch (error) {
    return failureFromError(error, "Unable to update the mission context locally.");
  }
}

export async function getMissionContext(contextId: string, adapter?: StorageAdapter): Promise<StorageResult<MissionContext | null>> {
  if (!hasIdentifier(contextId)) return failure("invalid-record", "Mission context ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.get<MissionContext>(MISSION_CONTEXT_STORE, contextId));
  } catch (error) {
    return failureFromError(error, "Unable to retrieve the mission context.");
  }
}

export async function listMissionContexts(adapter?: StorageAdapter): Promise<StorageResult<readonly MissionContext[]>> {
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.getAll<MissionContext>(MISSION_CONTEXT_STORE));
  } catch (error) {
    return failureFromError(error, "Unable to list mission contexts.");
  }
}

export async function deleteMissionContext(contextId: string, adapter?: StorageAdapter): Promise<StorageResult<void>> {
  if (!hasIdentifier(contextId)) return failure("invalid-record", "Mission context ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.delete(MISSION_CONTEXT_STORE, contextId);
    return success(undefined);
  } catch (error) {
    return failureFromError(error, "Unable to delete the mission context.");
  }
}

export async function saveMissionEvent(event: MissionEvent, adapter?: StorageAdapter): Promise<StorageResult<MissionEvent>> {
  if (!isMissionEvent(event)) return failure("invalid-record", "Mission event did not pass validation.");
  if (event.provenance !== "browser-user-generated") return failure("invalid-record", "Only user-generated mission events can be stored as real records.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.add(MISSION_EVENT_STORE, event.id, event);
    return success(event);
  } catch (error) {
    return failureFromError(error, "Unable to save the mission event locally.");
  }
}

export async function replaceMissionEvent(event: MissionEvent, adapter?: StorageAdapter): Promise<StorageResult<MissionEvent>> {
  if (!isMissionEvent(event)) return failure("invalid-record", "Mission event did not pass validation.");
  if (event.provenance !== "browser-user-generated") return failure("invalid-record", "Only user-generated mission events can be stored as real records.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.put(MISSION_EVENT_STORE, event.id, event);
    return success(event);
  } catch (error) {
    return failureFromError(error, "Unable to update the mission event locally.");
  }
}

export async function getMissionEvent(eventId: string, adapter?: StorageAdapter): Promise<StorageResult<MissionEvent | null>> {
  if (!hasIdentifier(eventId)) return failure("invalid-record", "Mission event ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.get<MissionEvent>(MISSION_EVENT_STORE, eventId));
  } catch (error) {
    return failureFromError(error, "Unable to retrieve the mission event.");
  }
}

export async function listMissionEvents(adapter?: StorageAdapter): Promise<StorageResult<readonly MissionEvent[]>> {
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.getAll<MissionEvent>(MISSION_EVENT_STORE));
  } catch (error) {
    return failureFromError(error, "Unable to list mission events.");
  }
}

export async function deleteMissionEvent(eventId: string, adapter?: StorageAdapter): Promise<StorageResult<void>> {
  if (!hasIdentifier(eventId)) return failure("invalid-record", "Mission event ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.delete(MISSION_EVENT_STORE, eventId);
    return success(undefined);
  } catch (error) {
    return failureFromError(error, "Unable to delete the mission event.");
  }
}

function hasIdentifier(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
