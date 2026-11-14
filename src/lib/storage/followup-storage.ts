import {
  FOLLOW_UP_STORE,
  failure,
  failureFromError,
  getIndexedDbAdapter,
  success,
  type StorageAdapter,
  type StorageResult,
} from "./database";
import { isFollowUp } from "@/lib/followup/workflow";
import type { FollowUpRecord } from "@/types/followup";

export async function saveFollowUp(record: FollowUpRecord, adapter?: StorageAdapter): Promise<StorageResult<FollowUpRecord>> {
  if (!isFollowUp(record)) return failure("invalid-record", "Follow-up record did not pass validation.");
  if (record.provenance !== "browser-user-generated") return failure("invalid-record", "Only user-generated follow-up records can be stored as real records.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.add(FOLLOW_UP_STORE, record.id, record);
    return success(record);
  } catch (error) {
    return failureFromError(error, "Unable to save the follow-up record locally.");
  }
}

/** Replaces a record after a validated workflow transition. */
export async function replaceFollowUp(record: FollowUpRecord, adapter?: StorageAdapter): Promise<StorageResult<FollowUpRecord>> {
  if (!isFollowUp(record)) return failure("invalid-record", "Follow-up record did not pass validation.");
  if (record.provenance !== "browser-user-generated") return failure("invalid-record", "Only user-generated follow-up records can be stored as real records.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.put(FOLLOW_UP_STORE, record.id, record);
    return success(record);
  } catch (error) {
    return failureFromError(error, "Unable to update the follow-up record locally.");
  }
}

export async function getFollowUp(recordId: string, adapter?: StorageAdapter): Promise<StorageResult<FollowUpRecord | null>> {
  if (!hasIdentifier(recordId)) return failure("invalid-record", "Follow-up ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    return success(await storage.value.get<FollowUpRecord>(FOLLOW_UP_STORE, recordId));
  } catch (error) {
    return failureFromError(error, "Unable to retrieve the follow-up record.");
  }
}

export async function listFollowUps(adapter?: StorageAdapter): Promise<StorageResult<readonly FollowUpRecord[]>> {
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    const records = await storage.value.getAll<FollowUpRecord>(FOLLOW_UP_STORE);
    return success([...records].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id)));
  } catch (error) {
    return failureFromError(error, "Unable to list follow-up records.");
  }
}

export async function deleteFollowUp(recordId: string, adapter?: StorageAdapter): Promise<StorageResult<void>> {
  if (!hasIdentifier(recordId)) return failure("invalid-record", "Follow-up ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try {
    await storage.value.delete(FOLLOW_UP_STORE, recordId);
    return success(undefined);
  } catch (error) {
    return failureFromError(error, "Unable to delete the follow-up record.");
  }
}

function hasIdentifier(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
