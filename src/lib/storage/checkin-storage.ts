import { CHECKIN_STORE, failure, failureFromError, getIndexedDbAdapter, success, type StorageAdapter, type StorageResult } from "./database";
import { validateCheckIn } from "./checkin-validation";
import type { SymptomCheckInRecord } from "@/types/checkin";

export async function saveCheckIn(checkIn: SymptomCheckInRecord, adapter?: StorageAdapter): Promise<StorageResult<SymptomCheckInRecord>> {
  const validation = validateCheckIn(checkIn);
  if (!validation.valid) return failure("invalid-record", validation.errors.join(" "));
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { await storage.value.add(CHECKIN_STORE, checkIn.id, checkIn); return success(checkIn); }
  catch (error) { return failureFromError(error, "Unable to save the sensorimotor check-in locally."); }
}

export async function getCheckIn(checkInId: string, adapter?: StorageAdapter): Promise<StorageResult<SymptomCheckInRecord | null>> {
  if (!hasIdentifier(checkInId)) return failure("invalid-record", "Check-in ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { return success(await storage.value.get<SymptomCheckInRecord>(CHECKIN_STORE, checkInId)); }
  catch (error) { return failureFromError(error, "Unable to retrieve the sensorimotor check-in."); }
}

export async function listCheckIns(adapter?: StorageAdapter): Promise<StorageResult<readonly SymptomCheckInRecord[]>> {
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { return success(await storage.value.getAll<SymptomCheckInRecord>(CHECKIN_STORE)); }
  catch (error) { return failureFromError(error, "Unable to list sensorimotor check-ins."); }
}

export async function deleteCheckIn(checkInId: string, adapter?: StorageAdapter): Promise<StorageResult<void>> {
  if (!hasIdentifier(checkInId)) return failure("invalid-record", "Check-in ID is required.");
  const storage = adapter ? success(adapter) : await getIndexedDbAdapter();
  if (!storage.ok) return storage;
  try { await storage.value.delete(CHECKIN_STORE, checkInId); return success(undefined); }
  catch (error) { return failureFromError(error, "Unable to delete the sensorimotor check-in."); }
}

function hasIdentifier(value: string): boolean { return value.trim().length > 0; }
