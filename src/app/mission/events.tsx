"use client";
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { listMissionContexts, listMissionEvents, saveMissionEvent } from '@/lib/storage/mission-storage';
import type { MissionEvent } from '@/types/mission-context';
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

export default function MissionEventsPage() {
  const { data: contexts = [], error: contextsError, isLoading: contextsLoading } = useSWR("mission-contexts", async () => {
    const result = await listMissionContexts();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  });
  const { data: events = [], error: eventsError, isLoading: eventsLoading, mutate: mutateEvents } = useSWR("mission-events", async () => {
    const result = await listMissionEvents();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  });
  const [selectedContextId, setSelectedContextId] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setOccurredAt(new Date().toISOString().slice(0, 16)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const [phase, setPhase] = useState<MissionPhase | '' | null>(null);
  const [operationalContext, setOperationalContext] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeContext = contexts.find((context) => context.id === selectedContextId) ?? contexts[0] ?? null;
  const selectedPhase = phase === null ? activeContext?.phase ?? "" : phase;

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
      ...(selectedPhase ? { phase: selectedPhase } : {}),
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
      await mutateEvents((current = []) => [...current, res.value], { revalidate: false });
      setDescription('');
      setOperationalContext('');
      setSuccessMsg(`Event '${res.value.description}' recorded for mission '${activeContext.missionName}'.`);
    } else {
      setError(res.error.message);
    }
  }

  return (
    <AppShell>
      <section className="instrument-page mx-auto max-w-5xl py-4">
        <PageHeader eyebrow="Context · user recorded" title="Mission events" description="Record notable operational events linked to an explicit persisted mission context. Each event must reference a real mission context." />

        {contextsError && <p role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">Mission contexts could not be read: {contextsError.message}</p>}
        {eventsError && <p role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">Mission events could not be read: {eventsError.message}</p>}
        {error && <div role="alert" className="mb-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-alert-ink">{error}</div>}
        {successMsg && <div role="status" className="mb-4 rounded-control border border-ion/30 bg-ion/10 p-3 text-ion-soft">{successMsg}</div>}

        {contextsError ? null : contextsLoading ? <p role="status" className="text-sm text-glow-muted">Reading saved mission contexts…</p> : contexts.length === 0 ? (
          <div className="mb-7 rounded-panel border border-ember/30 bg-ember/5 p-5 text-center sm:p-7">
            <p className="mb-2 font-semibold text-amber-200">No mission contexts found</p>
            <p className="mb-4 text-sm text-glow-muted">
              Mission events must be explicitly linked to an existing mission context record.
            </p>
            <Link href="/mission/contexts" className="btn-primary inline-block">
              Create Mission Context First →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="mb-7 rounded-panel border border-horizon bg-hull-raised/65 p-5 shadow-panel sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-glow">Record a mission event</h2>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="event-mission-context" className="mb-1 block text-sm font-medium">Select mission context</label>
                <select
                  id="event-mission-context"
                  value={selectedContextId || contexts[0]?.id || ""}
                  onChange={(e) => {
                    setSelectedContextId(e.target.value);
                    const matching = contexts.find((c) => c.id === e.target.value);
                    if (matching) setPhase(matching.phase);
                  }}
                  className="instrument-control"
                >
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.missionName} ({c.missionId} – {c.phase})
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
                <label htmlFor="event-occurred-at" className="mb-1 block text-sm font-medium">Occurred at</label>
                <input
                  id="event-occurred-at"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="instrument-control"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="event-description" className="mb-1 block text-sm font-medium">Event description</label>
                <input
                  id="event-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Engine burn completed for orbital insertion"
                  className="instrument-control"
                />
              </div>
              <div>
                <label htmlFor="event-phase" className="mb-1 block text-sm font-medium">Mission phase at event time (optional)</label>
                <select
                  id="event-phase"
                  value={selectedPhase}
                  onChange={(e) => setPhase(e.target.value as MissionPhase | "")}
                  className="instrument-control"
                >
                  <option value="">-- context default ({activeContext?.phase}) --</option>
                  {CANONICAL_PHASES.map((ph) => (
                    <option key={ph} value={ph}>{ph}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="event-context" className="mb-1 block text-sm font-medium">Operational context (optional)</label>
                <input
                  id="event-context"
                  type="text"
                  value={operationalContext}
                  onChange={(e) => setOperationalContext(e.target.value)}
                  placeholder="e.g. Nominal delta-v achieved"
                  className="instrument-control"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Record Mission Event</button>
          </form>
        )}

        <h2 className="mb-3 text-lg font-semibold text-glow">Persisted mission events ({eventsLoading ? "…" : events.length})</h2>
        {eventsError ? null : eventsLoading ? <p role="status" className="text-sm text-glow-muted">Reading saved mission events…</p> : events.length === 0 ? (
          <EmptyState title="No mission events recorded">Create an event above and link it to an existing mission context. No event is inferred from a timestamp.</EmptyState>
        ) : (
          <EventStream entries={events.map((event) => ({
            id: event.id,
            title: event.description,
            timestamp: event.occurredAt,
            detail: <span>Mission: {event.missionId}{event.phase ? ` · Phase: ${event.phase}` : ""}{event.operationalContext ? ` · ${event.operationalContext}` : ""}</span>,
            badge: <ProvenanceLabel>Manual record</ProvenanceLabel>,
          }))} />
        )}

        <div className="flex gap-4 mt-6 text-sm">
          <Link href="/mission/contexts" className="text-sm font-medium text-ion-soft underline-offset-4 hover:underline">← Mission Contexts</Link>
          <Link href="/mission/transitions" className="text-sm font-medium text-ion-soft underline-offset-4 hover:underline">Go to Mission Transitions →</Link>
        </div>
      </section>
    </AppShell>
  );
}
