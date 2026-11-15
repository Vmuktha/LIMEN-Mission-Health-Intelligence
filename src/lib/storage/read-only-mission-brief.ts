import {
  ASSESSMENT_STORE,
  CHECKIN_STORE,
  FOLLOW_UP_STORE,
  LIMEN_DATABASE_NAME,
  LIMEN_DATABASE_VERSION,
  MISSION_CONTEXT_STORE,
  MISSION_EVENT_STORE,
  MISSION_TRANSITION_STORE,
} from "./database";
import type { AssessmentSession } from "@/types/assessment";
import type { SymptomCheckInRecord } from "@/types/checkin";
import type { FollowUpRecord } from "@/types/followup";
import type { MissionContext, MissionEvent } from "@/types/mission-context";
import type { MissionTransition } from "@/types/transition";

export interface MissionBriefRecords {
  readonly contexts: readonly MissionContext[];
  readonly transitions: readonly MissionTransition[];
  readonly events: readonly MissionEvent[];
  readonly assessments: readonly AssessmentSession[];
  readonly checkIns: readonly SymptomCheckInRecord[];
  readonly followUps: readonly FollowUpRecord[];
}

const STORES = {
  contexts: MISSION_CONTEXT_STORE,
  transitions: MISSION_TRANSITION_STORE,
  events: MISSION_EVENT_STORE,
  assessments: ASSESSMENT_STORE,
  checkIns: CHECKIN_STORE,
  followUps: FOLLOW_UP_STORE,
} as const;

/** Reads only an already-existing supported LIMEN database; never creates, upgrades, or writes. */
export async function readMissionBriefRecords(): Promise<MissionBriefRecords> {
  const factory = globalThis.indexedDB;
  if (!factory?.databases) throw new Error("This browser cannot verify whether the local database already exists; the read-only overview was not opened.");
  const listed = await factory.databases();
  const existing = listed.find((entry) => entry.name === LIMEN_DATABASE_NAME);
  if (!existing) return { contexts: [], transitions: [], events: [], assessments: [], checkIns: [], followUps: [] };
  if (typeof existing.version !== "number" || existing.version > LIMEN_DATABASE_VERSION) {
    throw new Error("The existing LIMEN database uses a newer schema; its records were not opened.");
  }

  const database = await openExistingDatabase(factory);
  try {
    const storeNames = Object.values(STORES).filter((name) => database.objectStoreNames.contains(name));
    const values = await Promise.all(storeNames.map((name) => readStore(database, name)));
    const recordsByStore = new Map(storeNames.map((name, index) => [name, values[index] ?? []]));
    return {
      contexts: (recordsByStore.get(STORES.contexts) ?? []) as MissionContext[],
      transitions: (recordsByStore.get(STORES.transitions) ?? []) as MissionTransition[],
      events: (recordsByStore.get(STORES.events) ?? []) as MissionEvent[],
      assessments: (recordsByStore.get(STORES.assessments) ?? []) as AssessmentSession[],
      checkIns: (recordsByStore.get(STORES.checkIns) ?? []) as SymptomCheckInRecord[],
      followUps: (recordsByStore.get(STORES.followUps) ?? []) as FollowUpRecord[],
    };
  } finally {
    database.close();
  }
}

function openExistingDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(LIMEN_DATABASE_NAME);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      reject(new Error("The local database disappeared before it could be read; no database was created."));
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to open the existing local database."));
    request.onsuccess = () => resolve(request.result);
  });
}

function readStore(database: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => reject(request.error ?? new Error(`Unable to read ${storeName}.`));
    transaction.onabort = () => reject(transaction.error ?? new Error(`Reading ${storeName} was interrupted.`));
  });
}
