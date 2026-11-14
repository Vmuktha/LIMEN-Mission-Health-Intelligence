export const LIMEN_DATABASE_NAME = "limen-neuroadaptive";
export const LIMEN_DATABASE_VERSION = 1;
export const ASSESSMENT_STORE = "assessment-sessions";
export const CHECKIN_STORE = "sensorimotor-checkins";

export type StorageFailureCode = "unavailable" | "duplicate-id" | "database-error" | "invalid-record";
export interface StorageFailure { readonly code: StorageFailureCode; readonly message: string; }
export type StorageResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: StorageFailure };

export interface StorageAdapter {
  add<T>(storeName: string, key: string, record: T): Promise<void>;
  get<T>(storeName: string, key: string): Promise<T | null>;
  getAll<T>(storeName: string): Promise<readonly T[]>;
  delete(storeName: string, key: string): Promise<void>;
}

export async function getIndexedDbAdapter(): Promise<StorageResult<StorageAdapter>> {
  const indexedDb = globalThis.indexedDB;
  if (!indexedDb) return failure("unavailable", "IndexedDB is unavailable in this environment.");
  try {
    const database = await openDatabase(indexedDb);
    return success(new IndexedDbAdapter(database));
  } catch (error) {
    return failure("database-error", errorMessage(error, "Unable to initialize the LIMEN local database."));
  }
}

export function createInMemoryStorageAdapter(): StorageAdapter {
  const stores = new Map<string, Map<string, unknown>>();
  const store = (name: string) => {
    const existing = stores.get(name);
    if (existing) return existing;
    const next = new Map<string, unknown>();
    stores.set(name, next);
    return next;
  };
  return {
    async add<T>(storeName: string, key: string, record: T) {
      const records = store(storeName);
      if (records.has(key)) throw new DOMException("A record already exists for this identifier.", "ConstraintError");
      records.set(key, structuredClone(record));
    },
    async get<T>(storeName: string, key: string) {
      const record = store(storeName).get(key);
      return record === undefined ? null : structuredClone(record) as T;
    },
    async getAll<T>(storeName: string) { return [...store(storeName).values()].map((record) => structuredClone(record) as T); },
    async delete(storeName: string, key: string) { store(storeName).delete(key); },
  };
}

export function success<T>(value: T): StorageResult<T> { return { ok: true, value }; }
export function failure(code: StorageFailureCode, message: string): StorageResult<never> { return { ok: false, error: { code, message } }; }

export function failureFromError(error: unknown, fallback: string): StorageResult<never> {
  return error instanceof DOMException && error.name === "ConstraintError" ? failure("duplicate-id", "A record with this identifier already exists. Existing records were not replaced.") : failure("database-error", errorMessage(error, fallback));
}

function openDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(LIMEN_DATABASE_NAME, LIMEN_DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ASSESSMENT_STORE)) database.createObjectStore(ASSESSMENT_STORE);
      if (!database.objectStoreNames.contains(CHECKIN_STORE)) database.createObjectStore(CHECKIN_STORE);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

class IndexedDbAdapter implements StorageAdapter {
  constructor(private readonly database: IDBDatabase) {}
  add<T>(storeName: string, key: string, record: T): Promise<void> { return this.request(storeName, "readwrite", (store) => store.add(record, key)).then(() => undefined); }
  get<T>(storeName: string, key: string): Promise<T | null> { return this.request<T | undefined>(storeName, "readonly", (store) => store.get(key)).then((value) => value ?? null); }
  getAll<T>(storeName: string): Promise<readonly T[]> { return this.request<T[]>(storeName, "readonly", (store) => store.getAll()); }
  delete(storeName: string, key: string): Promise<void> { return this.request(storeName, "readwrite", (store) => store.delete(key)).then(() => undefined); }
  private request<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = this.database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error);
    });
  }
}

function errorMessage(error: unknown, fallback: string): string { return error instanceof Error && error.message ? error.message : fallback; }
