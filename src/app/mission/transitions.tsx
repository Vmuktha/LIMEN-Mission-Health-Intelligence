"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { listMissionContexts } from '@/lib/storage/mission-storage';
import { listMissionTransitions, saveMissionTransition } from '@/lib/storage/transition-storage';
import type { MissionContext } from '@/types/mission-context';
import type { MissionTransition } from '@/types/transition';
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

export default function MissionTransitionsPage() {
  const [contexts, setContexts] = useState<readonly MissionContext[]>([]);
  const [transitions, setTransitions] = useState<readonly MissionTransition[]>([]);
  const [selectedContextId, setSelectedContextId] = useState('');
  const [previousPhase, setPreviousPhase] = useState<MissionPhase>('preflight');
  const [currentPhase, setCurrentPhase] = useState<MissionPhase>('launch');
  const [prevCustomLabel, setPrevCustomLabel] = useState('');
  const [currCustomLabel, setCurrCustomLabel] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    listMissionContexts().then((res) => {
      if (res.ok) {
        setContexts(res.value);
        if (res.value.length > 0) {
          setSelectedContextId(res.value[0].id);
          setPreviousPhase(res.value[0].phase);
          const next = CANONICAL_PHASES.find((p) => p !== res.value[0].phase) ?? 'launch';
          setCurrentPhase(next);
        }
      }
    });
    listMissionTransitions().then((res) => {
      if (res.ok) setTransitions(res.value);
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
    if (previousPhase === currentPhase) {
      setError('A transition must move between two different phases.');
      return;
    }
    if (previousPhase === 'custom' && !prevCustomLabel.trim()) {
      setError('A custom label is required for the previous custom phase.');
      return;
    }
    if (currentPhase === 'custom' && !currCustomLabel.trim()) {
      setError('A custom label is required for the current custom phase.');
      return;
    }

    const isoOccurred = occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString();
    if (isNaN(Date.parse(isoOccurred))) {
      setError('Occurred-at timestamp is invalid.');
      return;
    }

    const id = generateId();
    const now = new Date().toISOString();
    const transition: MissionTransition = {
      id,
      missionContextId: activeContext.id,
      missionId: activeContext.missionId,
      previousPhase,
      currentPhase,
      ...(previousPhase === 'custom' ? { previousCustomPhaseLabel: prevCustomLabel.trim() } : {}),
      ...(currentPhase === 'custom' ? { currentCustomPhaseLabel: currCustomLabel.trim() } : {}),
      occurredAt: isoOccurred,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
      ...(note.trim() ? { note: note.trim() } : {}),
      source: 'manual-entry',
      provenance: 'browser-user-generated',
      interpretation: 'explicitly-recorded-mission-transition-not-inferred',
    };

    const res = await saveMissionTransition(transition);
    if (res.ok) {
      setTransitions((prev) => [...prev, res.value]);
      setNote('');
      setSuccessMsg(`Transition [${res.value.previousPhase} → ${res.value.currentPhase}] recorded for mission '${activeContext.missionName}'.`);
    } else {
      setError(res.error.message);
    }
  }

  return (
    <AppShell>
      <section className="max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-2">Mission Transitions</h1>
        <p className="text-sm text-slate-600 mb-6">
          Record explicit phase transitions for a crew mission. Transitions represent user-observed boundaries and are never inferred from timestamps.
        </p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {successMsg && <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded">{successMsg}</div>}

        {contexts.length === 0 ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded mb-6 text-center">
            <p className="text-amber-800 font-medium mb-2">No Mission Contexts Found</p>
            <p className="text-sm text-amber-700 mb-4">
              Mission transitions must be recorded against an existing mission context.
            </p>
            <Link href="/mission/contexts" className="btn-primary inline-block">
              Create Mission Context First →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Record New Mission Transition</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Mission Context</label>
                <select
                  value={selectedContextId}
                  onChange={(e) => {
                    setSelectedContextId(e.target.value);
                    const matching = contexts.find((c) => c.id === e.target.value);
                    if (matching) {
                      setPreviousPhase(matching.phase);
                      const next = CANONICAL_PHASES.find((p) => p !== matching.phase) ?? 'launch';
                      setCurrentPhase(next);
                    }
                  }}
                  className="w-full border rounded p-2 text-sm bg-white"
                >
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.missionName} ({c.missionId} – current: {c.phase})
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
                <label className="block text-sm font-medium mb-1">Transition Occurred At</label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full border rounded p-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Previous Phase</label>
                <select
                  value={previousPhase}
                  onChange={(e) => setPreviousPhase(e.target.value as MissionPhase)}
                  className="w-full border rounded p-2 text-sm bg-white"
                >
                  {CANONICAL_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Phase</label>
                <select
                  value={currentPhase}
                  onChange={(e) => setCurrentPhase(e.target.value as MissionPhase)}
                  className="w-full border rounded p-2 text-sm bg-white"
                >
                  {CANONICAL_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              {previousPhase === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Previous Custom Phase Label</label>
                  <input
                    type="text"
                    value={prevCustomLabel}
                    onChange={(e) => setPrevCustomLabel(e.target.value)}
                    className="w-full border rounded p-2 text-sm bg-white"
                  />
                </div>
              )}
              {currentPhase === 'custom' && (
                <div>
                  <label className="block text-sm font-medium mb-1">New Custom Phase Label</label>
                  <input
                    type="text"
                    value={currCustomLabel}
                    onChange={(e) => setCurrCustomLabel(e.target.value)}
                    className="w-full border rounded p-2 text-sm bg-white"
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Transition Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Spacecraft reached stable low Earth orbit"
                  className="w-full border rounded p-2 text-sm bg-white"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Record Transition</button>
          </form>
        )}

        <h2 className="text-lg font-semibold mb-3">Persisted Mission Transitions ({transitions.length})</h2>
        {transitions.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-4 bg-slate-100 rounded">
            No mission transitions recorded yet. Complete the form above to record a phase change.
          </p>
        ) : (
          <ul className="space-y-2">
            {transitions.map((t) => (
              <li key={t.id} className="p-3 bg-white border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">
                  <span className="text-cyan-800 font-bold">{t.previousPhase}</span>
                  <span className="mx-2 text-slate-400">→</span>
                  <span className="text-emerald-800 font-bold">{t.currentPhase}</span>
                </div>
                <div className="text-sm text-slate-600">
                  Mission: <span className="font-medium">{t.missionId}</span> | Context ID: <span className="font-mono text-xs">{t.missionContextId}</span>
                </div>
                {t.note && <div className="text-xs text-slate-500 mt-1">Note: {t.note}</div>}
                <div className="text-xs text-slate-400 mt-1">Occurred: {new Date(t.occurredAt).toLocaleString()} | ID: {t.id}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-4 mt-6 text-sm">
          <Link href="/mission/contexts" className="text-cyan-700 hover:underline">← Mission Contexts</Link>
          <Link href="/mission/events" className="text-cyan-700 hover:underline">Go to Mission Events →</Link>
        </div>
      </section>
    </AppShell>
  );
}
