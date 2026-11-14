"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { listMissionContexts, saveMissionContext } from '@/lib/storage/mission-storage';
import type { MissionContext, MissionProfileKind } from '@/types/mission-context';
import type { MissionPhase } from '@/types/mission';
import { EmptyState, PageHeader, PhaseTimeline } from '@/components/ui/InstrumentUI';

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
  const { data: contexts = [], error: contextsError, isLoading: contextsLoading, mutate } = useSWR("mission-contexts", async () => {
    const result = await listMissionContexts();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  });
  const [missionId, setMissionId] = useState('');
  const [missionName, setMissionName] = useState('');
  const [profile, setProfile] = useState<MissionProfileKind>('earth-orbit');
  const [phase, setPhase] = useState<MissionPhase>('preflight');
  const [customPhaseLabel, setCustomPhaseLabel] = useState('');
  const [operationalContext, setOperationalContext] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      await mutate((current = []) => [...current, res.value], { revalidate: false });
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
      <section className="instrument-page mx-auto max-w-5xl py-4">
        <PageHeader eyebrow="Context · user recorded" title="Mission contexts" description="Record an explicit mission frame of reference. Phases and profiles are user-entered observations, not automated telemetry." />

        {contextsError && <p role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">Mission contexts could not be read: {contextsError.message}</p>}
        {error && <div role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">{error}</div>}
        {successMsg && <div role="status" className="mb-4 rounded-control border border-ion/30 bg-ion/10 p-3 text-ion-soft">{successMsg}</div>}

        <form onSubmit={handleCreate} className="mb-7 rounded-panel border border-horizon bg-hull-raised/65 p-5 shadow-panel sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-glow">Record a mission context</h2>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="mission-id" className="mb-1 block text-sm font-medium">Mission ID</label>
              <input
                type="text"
                id="mission-id"
                value={missionId}
                onChange={(e) => setMissionId(e.target.value)}
                placeholder="e.g. mission-artemis-2"
                className="instrument-control"
              />
            </div>
            <div>
              <label htmlFor="mission-name" className="mb-1 block text-sm font-medium">Mission name</label>
              <input
                type="text"
                id="mission-name"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="e.g. Artemis II Lunar Mission"
                className="instrument-control"
              />
            </div>
            <div>
              <label htmlFor="mission-profile" className="mb-1 block text-sm font-medium">Mission profile</label>
              <select
                id="mission-profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value as MissionProfileKind)}
                className="instrument-control"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mission-phase" className="mb-1 block text-sm font-medium">Mission phase</label>
              <select
                id="mission-phase"
                value={phase}
                onChange={(e) => setPhase(e.target.value as MissionPhase)}
                className="instrument-control"
              >
                {CANONICAL_PHASES.map((ph) => (
                  <option key={ph} value={ph}>{ph}</option>
                ))}
              </select>
            </div>
            {phase === 'custom' && (
              <div className="sm:col-span-2">
                <label htmlFor="custom-phase-label" className="mb-1 block text-sm font-medium">Custom phase label</label>
                <input
                  type="text"
                  id="custom-phase-label"
                  value={customPhaseLabel}
                  onChange={(e) => setCustomPhaseLabel(e.target.value)}
                  placeholder="e.g. translunar-injection-prep"
                  className="instrument-control"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="operational-context" className="mb-1 block text-sm font-medium">Operational context (optional)</label>
              <input
                type="text"
                id="operational-context"
                value={operationalContext}
                onChange={(e) => setOperationalContext(e.target.value)}
                placeholder="e.g. Pre-launch checks completed at launch pad 39B"
                className="instrument-control"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">Record Mission Context</button>
        </form>

        <h2 className="text-lg font-semibold text-glow">Persisted Mission Contexts ({contexts.length})</h2>
        {contextsError ? null : contextsLoading ? <p role="status" className="text-sm text-glow-muted">Reading saved mission contexts…</p> : contexts.length === 0 ? (
          <EmptyState title="No mission contexts recorded">Complete the form above to record an explicit frame of reference. Mission details are never invented or inferred.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {contexts.map((c) => (
              <li key={c.id} className="rounded-card border border-horizon bg-hull-raised/45 p-4">
                <div className="font-semibold text-glow">{c.missionName} <span className="text-xs font-normal text-glow-muted">· {c.missionId}</span></div>
                <div className="text-sm text-glow-muted">
                  Profile: <span className="font-medium text-glow">{c.profile}</span> · Phase: <span className="font-medium text-ion-soft">{c.phase === 'custom' ? `${c.customPhaseLabel} (custom)` : c.phase}</span>
                </div>
                <div className="mt-4"><PhaseTimeline phases={[c.phase === 'custom' ? c.customPhaseLabel ?? 'custom' : c.phase]} current={c.phase === 'custom' ? c.customPhaseLabel ?? 'custom' : c.phase} /></div>
                {c.operationalContext && <div className="mt-2 text-sm leading-6 text-glow-muted">Context: {c.operationalContext}</div>}
                <div className="mt-2 text-xs text-glow-faint">Recorded: {new Date(c.phaseRecordedAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-4 mt-6 text-sm">
          <Link href="/mission/events" className="text-sm font-medium text-ion-soft underline-offset-4 hover:underline">Go to Mission Events →</Link>
          <Link href="/mission/transitions" className="text-sm font-medium text-ion-soft underline-offset-4 hover:underline">Go to Mission Transitions →</Link>
        </div>
      </section>
    </AppShell>
  );
}
