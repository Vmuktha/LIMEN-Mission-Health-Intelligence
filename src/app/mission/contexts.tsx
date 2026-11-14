"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { listMissionContexts, saveMissionContext } from '@/lib/storage/mission-storage';
import type { MissionContext, MissionProfileKind } from '@/types/mission-context';
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

const PROFILES: readonly MissionProfileKind[] = [
  'earth-orbit',
  'lunar',
  'deep-space',
  'configurable',
];

export default function MissionContextsPage() {
  const [contexts, setContexts] = useState<readonly MissionContext[]>([]);
  const [missionId, setMissionId] = useState('');
  const [missionName, setMissionName] = useState('');
  const [profile, setProfile] = useState<MissionProfileKind>('earth-orbit');
  const [phase, setPhase] = useState<MissionPhase>('preflight');
  const [customPhaseLabel, setCustomPhaseLabel] = useState('');
  const [operationalContext, setOperationalContext] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    listMissionContexts().then((res) => {
      if (res.ok) setContexts(res.value);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!missionId.trim()) {
      setError('Mission ID is required.');
      return;
    }
    if (!missionName.trim()) {
      setError('Mission Name is required.');
      return;
    }
    if (phase === 'custom' && !customPhaseLabel.trim()) {
      setError('Custom phase label is required when phase is custom.');
      return;
    }

    const id = generateId();
    const now = new Date().toISOString();
    const context: MissionContext = {
      id,
      missionId: missionId.trim(),
      missionName: missionName.trim(),
      profile,
      phase,
      ...(phase === 'custom' ? { customPhaseLabel: customPhaseLabel.trim() } : {}),
      phaseRecordedAt: now,
      ...(operationalContext.trim() ? { operationalContext: operationalContext.trim() } : {}),
      source: 'manual-entry',
      provenance: 'browser-user-generated',
      createdAt: now,
      updatedAt: now,
      interpretation: 'mission-context-not-telemetry',
    };

    const res = await saveMissionContext(context);
    if (res.ok) {
      setContexts((prev) => [...prev, res.value]);
      setMissionId('');
      setMissionName('');
      setCustomPhaseLabel('');
      setOperationalContext('');
      setSuccessMsg(`Mission context '${res.value.missionName}' recorded successfully.`);
    } else {
      setError(res.error.message);
    }
  }

  return (
    <AppShell>
      <section className="max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-2">Mission Contexts</h1>
        <p className="text-sm text-slate-600 mb-6">
          Record an explicit mission frame of reference. Phases and profiles are user-entered observations, not automated telemetry.
        </p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {successMsg && <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded">{successMsg}</div>}

        <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Record New Mission Context</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mission ID</label>
              <input
                type="text"
                value={missionId}
                onChange={(e) => setMissionId(e.target.value)}
                placeholder="e.g. mission-artemis-2"
                className="w-full border rounded p-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mission Name</label>
              <input
                type="text"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="e.g. Artemis II Lunar Mission"
                className="w-full border rounded p-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mission Profile</label>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as MissionProfileKind)}
                className="w-full border rounded p-2 text-sm bg-white"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mission Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as MissionPhase)}
                className="w-full border rounded p-2 text-sm bg-white"
              >
                {CANONICAL_PHASES.map((ph) => (
                  <option key={ph} value={ph}>{ph}</option>
                ))}
              </select>
            </div>
            {phase === 'custom' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Custom Phase Label</label>
                <input
                  type="text"
                  value={customPhaseLabel}
                  onChange={(e) => setCustomPhaseLabel(e.target.value)}
                  placeholder="e.g. translunar-injection-prep"
                  className="w-full border rounded p-2 text-sm bg-white"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Operational Context (optional)</label>
              <input
                type="text"
                value={operationalContext}
                onChange={(e) => setOperationalContext(e.target.value)}
                placeholder="e.g. Pre-launch checks completed at launch pad 39B"
                className="w-full border rounded p-2 text-sm bg-white"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">Record Mission Context</button>
        </form>

        <h2 className="text-lg font-semibold mb-3">Persisted Mission Contexts ({contexts.length})</h2>
        {contexts.length === 0 ? (
          <p className="text-sm text-slate-500 italic p-4 bg-slate-100 rounded">
            No mission contexts recorded yet. Complete the form above to record the initial frame of reference.
          </p>
        ) : (
          <ul className="space-y-2">
            {contexts.map((c) => (
              <li key={c.id} className="p-3 bg-white border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">{c.missionName} <span className="text-xs text-slate-500 font-normal">({c.missionId})</span></div>
                <div className="text-sm text-slate-600">
                  Profile: <span className="font-medium">{c.profile}</span> | Phase: <span className="font-medium text-cyan-800">{c.phase === 'custom' ? `${c.customPhaseLabel} (custom)` : c.phase}</span>
                </div>
                {c.operationalContext && <div className="text-xs text-slate-500 mt-1">Context: {c.operationalContext}</div>}
                <div className="text-xs text-slate-400 mt-1">Recorded: {new Date(c.phaseRecordedAt).toLocaleString()} | ID: {c.id}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-4 mt-6 text-sm">
          <Link href="/mission/events" className="text-cyan-700 hover:underline">Go to Mission Events →</Link>
          <Link href="/mission/transitions" className="text-cyan-700 hover:underline">Go to Mission Transitions →</Link>
        </div>
      </section>
    </AppShell>
  );
}
