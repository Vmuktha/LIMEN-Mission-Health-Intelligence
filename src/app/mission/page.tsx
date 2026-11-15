"use client";

import Link from "next/link";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { DataCard, EmptyState, PageHeader, PhaseTimeline, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { buildMissionActivityTimeline } from "@/lib/mission/activity-timeline";
import { formatRecoveryDateTime } from "@/lib/analytics/recovery-dashboard";
import { readMissionBriefRecords } from "@/lib/storage/read-only-mission-brief";

async function loadMissionPageData() {
  const records = await readMissionBriefRecords();
  return {
    contexts: records.contexts,
    activities: buildMissionActivityTimeline(records),
  };
}

export default function MissionPage() {
  const { data, error, isLoading } = useSWR("mission-page-records", loadMissionPageData);
  const contexts = data?.contexts;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader eyebrow="Context · browser-local records" title="Mission overview" description="A human-entered frame of reference for mission phase and operational context. LIMEN does not receive spacecraft telemetry or infer mission state." aside={<ProvenanceLabel>Manual records only</ProvenanceLabel>} />
        {error && <p role="alert" className="rounded-control border border-alert/40 bg-alert/10 p-3 text-sm text-alert-ink">Mission records could not be read: {error.message}</p>}
        {error ? null : isLoading ? <p role="status" className="text-sm text-glow-muted">Reading browser-local mission records…</p> : contexts?.length ? (
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
                <p className="mt-4 text-xs text-glow-faint">Phase recorded {formatRecoveryDateTime(context.phaseRecordedAt)}</p>
              </DataCard>
            ))}
          </section>
        ) : (
          <EmptyState title="No mission contexts recorded">
            No mission context or phase has been recorded in this browser profile. Use the mission context form to add an explicit record; no crew profile, phase, or operational value is inferred.
          </EmptyState>
        )}
        {!error && !isLoading && data && (
          <DataCard as="section" className="p-5 sm:p-7" aria-labelledby="mission-activity-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Unified activity</p>
                <h2 id="mission-activity-heading" className="mt-1 text-xl font-semibold text-glow">Recorded mission timeline</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-glow-muted">Explicitly recorded transitions and events, completed assessments, check-ins, and follow-ups. Entries remain distinct by source; no relationship is inferred from timing.</p>
              </div>
              <ProvenanceLabel>Read-only projection</ProvenanceLabel>
            </div>
            {data.activities.length ? (
              <ol className="mt-5 flex flex-col border-l border-horizon pl-5">
                {data.activities.map((entry) => (
                  <li key={`${entry.kind}:${entry.id}`} className="relative border-b border-horizon/40 py-4 last:border-0">
                    <span aria-hidden="true" className="absolute -left-[1.57rem] top-6 size-2 rounded-full border border-ion/70 bg-hull-raised" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-medium text-glow">{entry.title}</h3>
                      <span className="text-[10px] uppercase tracking-wide text-glow-faint">{entry.kind.replaceAll("-", " ")}</span>
                    </div>
                    {entry.phase && <p className="mt-1 text-xs text-glow-muted">Phase explicitly recorded: {entry.phase.replaceAll("-", " ")}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-glow-faint">
                      <span>{entry.occurredAt ? <>Occurred <time dateTime={entry.occurredAt}>{formatRecoveryDateTime(entry.occurredAt)}</time></> : "Occurrence time unavailable"}</span>
                      {entry.recordedAt && entry.recordedAt !== entry.occurredAt && <span>Recorded <time dateTime={entry.recordedAt}>{formatRecoveryDateTime(entry.recordedAt)}</time></span>}
                      <span>{entry.provenance}</span>
                    </div>
                    <Link href={entry.href} className="mt-2 inline-flex text-xs font-medium text-ion-soft underline-offset-4 hover:underline">Open source records<span className="sr-only"> for {entry.title}</span></Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-control border border-dashed border-horizon p-5 text-sm text-glow-muted">No mission activities have been recorded in this browser. This view does not invent entries.</p>
            )}
          </DataCard>
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
