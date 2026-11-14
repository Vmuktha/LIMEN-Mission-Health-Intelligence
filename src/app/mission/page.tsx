"use client";

import Link from "next/link";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { DataCard, EmptyState, PageHeader, PhaseTimeline, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { listMissionContexts } from "@/lib/storage/mission-storage";
import type { StorageResult } from "@/lib/storage/database";
import type { MissionContext } from "@/types/mission-context";

async function loadMissionContexts(): Promise<readonly MissionContext[]> {
  const result: StorageResult<readonly MissionContext[]> = await listMissionContexts();
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

export default function MissionPage() {
  const { data: contexts, error, isLoading } = useSWR("mission-contexts", loadMissionContexts);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader eyebrow="Context · browser-local records" title="Mission overview" description="A human-entered frame of reference for mission phase and operational context. LIMEN does not receive spacecraft telemetry or infer mission state." aside={<ProvenanceLabel>Manual records only</ProvenanceLabel>} />
        {error && <p role="alert" className="rounded-control border border-alert/40 bg-alert/10 p-3 text-sm text-alert-ink">Mission contexts could not be read: {error.message}</p>}
        {error ? null : isLoading ? <p role="status" className="text-sm text-glow-muted">Reading browser-local mission contexts…</p> : contexts?.length ? (
          <section aria-label="Saved mission contexts" className="grid gap-4 lg:grid-cols-2">
            {contexts.map((context) => (
              <DataCard key={context.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-glow-muted">{context.profile.replaceAll("-", " ")}</p>
                    <h2 className="mt-1 text-lg font-semibold text-glow">{context.missionName}</h2>
                    <p className="mt-1 text-sm text-glow-muted">{context.missionId}</p>
                  </div>
                  <ProvenanceLabel tone="accent">User recorded</ProvenanceLabel>
                </div>
                <div className="mt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-glow-muted">Explicitly recorded phase</p>
                  <PhaseTimeline phases={[context.phase === "custom" ? context.customPhaseLabel ?? "custom" : context.phase]} current={context.phase === "custom" ? context.customPhaseLabel ?? "custom" : context.phase} />
                </div>
                {context.operationalContext && <p className="mt-4 text-sm leading-6 text-glow-muted">{context.operationalContext}</p>}
                <p className="mt-4 text-xs text-glow-faint">Phase recorded {new Date(context.phaseRecordedAt).toLocaleString()}</p>
              </DataCard>
            ))}
          </section>
        ) : (
          <EmptyState concept title="Mission overview layout">
            This view will organize saved mission contexts, explicitly recorded events, and transitions. No mission records exist in this browser yet; no crew profile, phase, or operational value is being illustrated as real.
          </EmptyState>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/mission/contexts" className="rounded-control bg-ion px-4 py-2.5 text-sm font-semibold text-void hover:bg-ion-soft">Manage mission contexts</Link>
          <Link href="/mission/events" className="rounded-control border border-horizon px-4 py-2.5 text-sm font-medium text-glow hover:border-ion/50">Recorded events</Link>
          <Link href="/mission/transitions" className="rounded-control border border-horizon px-4 py-2.5 text-sm font-medium text-glow hover:border-ion/50">Mission transitions</Link>
        </div>
      </div>
    </AppShell>
  );
}
