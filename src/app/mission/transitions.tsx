"use client";
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { listMissionContexts } from '@/lib/storage/mission-storage';
import { listMissionTransitions, saveMissionTransition } from '@/lib/storage/transition-storage';
import type { MissionTransition } from '@/types/transition';
import type { MissionPhase } from '@/types/mission';
import { EmptyState, EventStream, PageHeader, ProvenanceLabel } from '@/components/ui/InstrumentUI';

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
  const { data: contexts = [], error: contextsError, isLoading: contextsLoading } = useSWR("mission-contexts", async () => {
    const result = await listMissionContexts();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  });
  const { data: transitions = [], error: transitionsError, isLoading: transitionsLoading, mutate: mutateTransitions } = useSWR("mission-transitions", async () => {
    const result = await listMissionTransitions();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  });
  const [selectedContextId, setSelectedContextId] = useState('');
  const [previousPhase, setPreviousPhase] = useState<MissionPhase | null>(null);
  const [currentPhase, setCurrentPhase] = useState<MissionPhase | null>(null);
  const [prevCustomLabel, setPrevCustomLabel] = useState('');
  const [currCustomLabel, setCurrCustomLabel] = useState('');
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setOccurredAt(new Date().toISOString().slice(0, 16)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeContext = contexts.find((context) => context.id === selectedContextId) ?? contexts[0] ?? null;
  const previousPhaseValue = previousPhase ?? activeContext?.phase ?? "preflight";
  const currentPhaseValue = currentPhase ?? CANONICAL_PHASES.find((phase) => phase !== previousPhaseValue) ?? "launch";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!activeContext) {
      setError('An existing mission context must be selected. Create one first if none exist.');
      return;
    }
    if (previousPhaseValue === currentPhaseValue) {
      setError('A transition must move between two different phases.');
      return;
    }
    if (previousPhaseValue === 'custom' && !prevCustomLabel.trim()) {
      setError('A custom label is required for the previous custom phase.');
      return;
    }
    if (currentPhaseValue === 'custom' && !currCustomLabel.trim()) {
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
      previousPhase: previousPhaseValue,
      currentPhase: currentPhaseValue,
      ...(previousPhaseValue === 'custom' ? { previousCustomPhaseLabel: prevCustomLabel.trim() } : {}),
      ...(currentPhaseValue === 'custom' ? { currentCustomPhaseLabel: currCustomLabel.trim() } : {}),
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
      await mutateTransitions((current = []) => [...current, res.value], { revalidate: false });
      setNote('');
      setSuccessMsg(`Transition [${res.value.previousPhase} → ${res.value.currentPhase}] recorded for mission '${activeContext.missionName}'.`);
    } else {
      setError(res.error.message);
    }
  }

  return (
    <AppShell>
      <section className="instrument-page mx-auto max-w-5xl py-4">
        <PageHeader eyebrow="Context · user recorded" title="Mission transitions" description="Record explicit phase transitions for a crew mission. Transitions represent user-observed boundaries and are never inferred from timestamps." />

        {contextsError && <p role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">Mission contexts could not be read: {contextsError.message}</p>}
        {transitionsError && <p role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">Mission transitions could not be read: {transitionsError.message}</p>}
        {error && <div role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">{error}</div>}
        {successMsg && <div role="status" className="mb-4 rounded-control border border-ion/30 bg-ion/10 p-3 text-ion-soft">{successMsg}</div>}

        {contextsError ? null : contextsLoading ? <p role="status" className="text-sm text-glow-muted">Reading saved mission contexts…</p> : contexts.length === 0 ? (
          <div className="mb-7 rounded-panel border border-ember/30 bg-ember/5 p-5 text-center sm:p-7">
            <p className="mb-2 font-semibold text-amber-200">No mission contexts found</p>
            <p className="mb-4 text-sm text-glow-muted">
              Mission transitions must be recorded against an existing mission context.
            </p>
            <Link href="/mission/contexts" className="btn-primary inline-block">
              Create Mission Context First →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="mb-7 rounded-panel border border-horizon bg-hull-raised/65 p-5 shadow-panel sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-glow">Record a mission transition</h2>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="transition-mission-context" className="mb-1 block text-sm font-medium">Select mission context</label>
                <select
                  id="transition-mission-context"
                  value={selectedContextId || contexts[0]?.id || ""}
                  onChange={(e) => {
                    setSelectedContextId(e.target.value);
                    const matching = contexts.find((c) => c.id === e.target.value);
                    if (matching) {
                      setPreviousPhase(matching.phase);
                      const next = CANONICAL_PHASES.find((p) => p !== matching.phase) ?? 'launch';
                      setCurrentPhase(next);
                    }
                  }}
                  className="instrument-control"
                >
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.missionName} ({c.missionId} – current: {c.phase})
                    </option>
                  ))}
                </select>
                {activeContext && (
                  <p className="mt-2 text-xs text-glow-muted">
                    Inherits Mission ID: <span className="font-mono">{activeContext.missionId}</span>
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="transition-occurred-at" className="mb-1 block text-sm font-medium">Transition occurred at</label>
                <input
                  id="transition-occurred-at"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="instrument-control"
                />
              </div>
              <div>
                <label htmlFor="transition-previous-phase" className="mb-1 block text-sm font-medium">Previous phase</label>
                <select
                  id="transition-previous-phase"
                  value={previousPhaseValue}
                  onChange={(e) => setPreviousPhase(e.target.value as MissionPhase)}
                  className="instrument-control"
                >
                  {CANONICAL_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="transition-current-phase" className="mb-1 block text-sm font-medium">New phase</label>
                <select
                  id="transition-current-phase"
                  value={currentPhaseValue}
                  onChange={(e) => setCurrentPhase(e.target.value as MissionPhase)}
                  className="instrument-control"
                >
                  {CANONICAL_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              {previousPhaseValue === 'custom' && (
                <div>
                  <label htmlFor="transition-previous-custom" className="mb-1 block text-sm font-medium">Previous custom phase label</label>
                  <input
                    type="text"
                    id="transition-previous-custom"
                    value={prevCustomLabel}
                    onChange={(e) => setPrevCustomLabel(e.target.value)}
                    className="instrument-control"
                  />
                </div>
              )}
              {currentPhaseValue === 'custom' && (
                <div>
                  <label htmlFor="transition-current-custom" className="mb-1 block text-sm font-medium">New custom phase label</label>
                  <input
                    type="text"
                    id="transition-current-custom"
                    value={currCustomLabel}
                    onChange={(e) => setCurrCustomLabel(e.target.value)}
                    className="instrument-control"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="transition-note" className="mb-1 block text-sm font-medium">Transition note (optional)</label>
                <input
                  id="transition-note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Spacecraft reached stable low Earth orbit"
                  className="instrument-control"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Record Transition</button>
          </form>
        )}

        <h2 className="mb-3 text-lg font-semibold text-glow">Persisted mission transitions ({transitionsLoading ? "…" : transitions.length})</h2>
        {transitionsError ? null : transitionsLoading ? <p role="status" className="text-sm text-glow-muted">Reading saved mission transitions…</p> : transitions.length === 0 ? (
          <EmptyState title="No mission transitions recorded">Record an explicit transition above. Phase boundaries are never inferred from timestamps or placeholder scenarios.</EmptyState>
        ) : (
          <EventStream entries={transitions.map((transition) => ({
            id: transition.id,
            title: `${transition.previousPhase === "custom" ? transition.previousCustomPhaseLabel : transition.previousPhase} → ${transition.currentPhase === "custom" ? transition.currentCustomPhaseLabel : transition.currentPhase}`,
            timestamp: transition.occurredAt,
            detail: <span>Mission: {transition.missionId}{transition.note ? ` · ${transition.note}` : ""}</span>,
            badge: <ProvenanceLabel>Manual transition</ProvenanceLabel>,
          }))} />
        )}

        <div className="flex gap-4 mt-6 text-sm">
          <Link href="/mission/contexts" className="text-sm font-medium text-ion-soft underline-offset-4 hover:underline">← Mission Contexts</Link>
          <Link href="/mission/events" className="text-sm font-medium text-ion-soft underline-offset-4 hover:underline">Go to Mission Events →</Link>
        </div>
      </section>
    </AppShell>
  );
}
