"use client";
import { AppShell } from '@/components/layout/AppShell';
import { useEffect, useState } from 'react';
import { listCheckIns, saveCheckIn } from '@/lib/storage/checkin-storage';
import type { SymptomCheckInRecord } from '@/types/checkin';

// Secure UUID generation using crypto.randomUUID()
function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // If unavailable, throw to avoid weak fallback
  throw new Error('crypto.randomUUID is not supported in this environment');
}

export default function CheckInPage() {
  const [checkIns, setCheckIns] = useState<readonly SymptomCheckInRecord[]>([]);

  useEffect(() => {
    listCheckIns().then((res) => {
      if (res.ok) setCheckIns(res.value);
    });
  }, []);

  async function handleCreate() {
    const id = uuidv4();
    const now = new Date().toISOString();
    const checkIn: SymptomCheckInRecord = {
      id,
      participantId: 'participant-1',
      recordedAt: now,
      context: 'general',
      fatigue: 0,
      provenance: 'browser-user-generated',
      interpretation: 'self-report-not-an-objective-vestibular-measurement',
    };
    const res = await saveCheckIn(checkIn);
    if (res.ok) setCheckIns([...checkIns, res.value]);
  }

  return (
    <AppShell>
      <section>
        <h1 className="text-2xl font-bold">Check‑ins</h1>
        <ul>
          {checkIns.map((c) => (
            <li key={c.id}>ID: {c.id}</li>
          ))}
        </ul>
        <button onClick={handleCreate} className="btn-primary mt-4">Create Check‑in</button>
      </section>
    </AppShell>
  );
}
