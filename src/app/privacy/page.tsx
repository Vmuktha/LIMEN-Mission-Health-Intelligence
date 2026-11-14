"use client";
import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  CHECKIN_STORE,
  FOLLOW_UP_STORE,
  MISSION_CONTEXT_STORE,
  MISSION_EVENT_STORE,
  MISSION_TRANSITION_STORE,
  runMultiStoreTransaction,
} from '@/lib/storage/database';

export default function PrivacyPage() {
  const [status, setStatus] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setStatus('');
    const result = await runMultiStoreTransaction(
      [
        CHECKIN_STORE,
        MISSION_CONTEXT_STORE,
        MISSION_EVENT_STORE,
        FOLLOW_UP_STORE,
        MISSION_TRANSITION_STORE,
      ],
      'readwrite',
      async (tx) => {
        // delete all records in each store via the adapters
        const stores = tx.objectStoreNames;
        for (const name of stores) {
          const store = tx.objectStore(name);
          const getAllReq = store.getAllKeys();
          const keys = await new Promise<IDBValidKey[]>((res, rej) => {
            getAllReq.onsuccess = () => res(getAllReq.result);
            getAllReq.onerror = () => rej(getAllReq.error);
          });
          for (const key of keys) {
            store.delete(key);
          }
        }
      }
    );
    if (result.ok) {
      setStatus('All user‑generated data deleted successfully.');
    } else {
      setStatus(`Deletion failed: ${result.error.message}`);
    }
    setDeleting(false);
  }

  return (
    <AppShell>
      <section className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Privacy Deletion</h1>
        <p className="mb-4">
          This operation will permanently delete all user‑generated data (check‑ins, mission
          contexts, events, follow‑ups, and mission transitions). Assessment sessions and NASA OSDR
          reference data will be preserved.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-primary"
        >
          {deleting ? 'Deleting...' : 'Delete All User Data'}
        </button>
        {status && <p className="mt-4 text-sm text-green-700">{status}</p>}
      </section>
    </AppShell>
  );
}
