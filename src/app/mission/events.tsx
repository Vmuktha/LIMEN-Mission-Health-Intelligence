"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { listMissionContexts, listMissionEvents, saveMissionEvent } from '@/lib/storage/mission-storage';
import type { MissionContext, MissionEvent } from '@/types/mission-context';
import type { MissionPhase } from '@/types/mission';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('crypto.randomUUID is not supported in this environment');
}

const CANONICAL_PHASES: readonly MissionPhase[] = [
  'preflight',
  'launch',
  'ascent',
  'early-orbit',
  'inflight-operations',
  'eva-preparation',
  'eva',
  'return',
  'landing',
  'postflight-recovery',
  'custom',
];

export default function MissionEventsPage() {
  const [contexts, setContexts] = useState<readonly MissionContext[]>([]);
  const [events, setEvents] = useState<readonly MissionEvent[]>([]);
  const [selectedContextId, setSelectedContextId] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [phase, setPhase] = useState<MissionPhase | ''>('');
  const [operationalContext, setOperationalContext] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    listMissionContexts().then((res) => {
      if (res.ok) {
        setContexts(res.value);
        if (res.value.length > 0) {
          setSelectedContextId(res.value[0].id);
          setPhase(res.value[0].phase);
        }
      }
    });
    listMissionEvents().then((res) => {
      if (res.ok) setEvents(res.value);
    });
  }, []);

  const activeContext = contexts.find((c) => c.id === selectedContextId) ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!activeContext) {
      setError('An existing mission context must be selected. Create one first if none exist.');
      return;
    }
    if (!description.trim()) {
      setError('Event description is required.');
      return;
    }

    const isoOccurred = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString();
    if (isNaN(Date.parse(isoOccurred))) {
      setError('Occurred-at timestamp is invalid.');
      return;
    }

    const id = generateId();
    const now = new Date().toISOString();
    const event: MissionEvent = {
      id,
      missionContextId: activeContext.id,
      missionId: activeContext.missionId,
      occurredAt: isoOccurred,
      description: description.trim(),
      ...(phase ? { phase } : {}),
      ...(operationalContext.trim() ? { operationalContext: operationalContext.trim() } : {}),
      source: 'manual-entry',
      provenance: 'browser-user-generated',
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
      interpretation: 'manually-recorded-mission-event',
    };

    const res = await saveMissionEvent(event);
    if (res.ok) {
      setEvents((prev) => [...prev, res.value]);
      setDescription('');
      setOperationalContext('');
      setSuccessMsg(`Event '${res.value.description}' recorded for mission '${activeContext.missionName}'.`);
    } else {
      setError(res.error.message);
    }
  }

  return (
    <AppShell>
      <section className="max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-2">Mission Events</h1>
        <p className="text-sm text-slate-600 mb-6">
          Record notable operational events linked to an explicit persisted mission context. Events must reference a real mission context.
        </p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {successMsg && <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded">{successMsg}</div>}

        {contexts.length === 0 ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded mb-6 text-center">
            <p className="text-amber-800 font-medium mb-2">No Mission Contexts Found</p>
            <p className="text-sm text-amber-700 mb-4">
              Mission events must be explicitly linked to an existing mission context record.
            </p>
            <Link href="/mission/contexts" className="btn-primary inline-block">
              Create Mission Context First →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Record New Mission Event</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Mission Context</label>
                <select
                  value={selectedContextId}
                  onChange={(e) => {
                    setSelectedContextId(e.target.value);
                    const matching = contexts.find((c) => c.id === e.target.value);
                    if (matching) setPhase(matching.phase);
                  }}
                  className="w-full border rounded p-2 text-sm bg-white"
                >
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.missionName} ({c.missionId} – {c.phase})
                    </option>
                  ))}
                </select>
                {activeContext && (
                  <p className="text-xs text-slate-500 mt-1">
                    Inherits Mission ID: <span className="font-mono">{activeContext.missionId}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Occurred At</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full border rounded p-2 text-sm bg-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Event Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Engine burn completed for orbital insertion"
                  className="w-full border rounded p-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mission Phase at Time of Event (optional)</label>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as MissionPhase)}
                  className="w-full border rounded p-2 text-sm bg-white"
                >
                  <option value="">-- context default ({activeContext?.phase}) --</option>
                  {CANONICAL_PHASES.map((ph) => (
                    <option key={ph} value={ph}>{ph}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Operational Context (optional)</label>
                <input
                  type="text"
                  value={operationalContext}
                  onChange={(e) => setOperationalContext(e.target.value)}
                  placeholder="e.g. Nominal delta-v achieved"
                  className="w-full border rounded p-2 text-sm bg-white"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Record Mission Event</button>
          </form>
        )}

        <h2 className="text-lg font-semibold mb-3">Persisted Mission Events ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-4 bg-slate-100 rounded">
            No mission events recorded yet. Complete the form above to record an event.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="p-3 bg-white border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">{e.description}</div>
                <div className="text-sm text-slate-600">
                  Mission: <span className="font-medium">{e.missionId}</span> | Context ID: <span className="font-mono text-xs">{e.missionContextId}</span>
                  {e.phase && <span> | Phase: <span className="font-medium text-cyan-800">{e.phase}</span></span>}
                </div>
                {e.operationalContext && <div className="text-xs text-slate-500 mt-1">Context: {e.operationalContext}</div>}
                <div className="text-xs text-slate-400 mt-1">Occurred: {new Date(e.occurredAt).toLocaleString()} | ID: {e.id}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-4 mt-6 text-sm">
          <Link href="/mission/contexts" className="text-cyan-700 hover:underline">← Mission Contexts</Link>
          <Link href="/mission/transitions" className="text-cyan-700 hover:underline">Go to Mission Transitions →</Link>
        </div>
      </section>
    </AppShell>
  );
}
