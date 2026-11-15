"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { listFollowUps } from "@/lib/storage/followup-storage";
import { listMissionEvents } from "@/lib/storage/mission-storage";
import { listMissionTransitions } from "@/lib/storage/transition-storage";
import { loadRecoveryDataset } from "@/lib/analytics/recovery";
import { buildObservationNotices, observationLoadErrorMessage, OBSERVATION_NOTICE_MODEL_VERSION, OBSERVATION_NOTICE_RULES, type ObservationNotice } from "@/lib/observations/notices";
import { formatRecoveryDateTime } from "@/lib/analytics/recovery-dashboard";
import { AppShell } from "@/components/layout/AppShell";
import { DataCard, EmptyState, PageHeader, ProvenanceLabel } from "@/components/ui/InstrumentUI";

type CentreData = Awaited<ReturnType<typeof readCentreData>>;
async function readCentreData() {
  const [events, transitions, followUps, recovery] = await Promise.all([listMissionEvents(), listMissionTransitions(), listFollowUps(), loadRecoveryDataset()]);
  const failed = [events, transitions, followUps, recovery].find((result) => !result.ok);
  if (failed && !failed.ok) throw new Error(failed.error.message);
  if (!events.ok || !transitions.ok || !followUps.ok || !recovery.ok) throw new Error("Browser-local records could not be read.");
  return { events: events.value, transitions: transitions.value, followUps: followUps.value, recovery: recovery.value };
}

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  "mission-event-recorded.v1": "Mission event",
  "mission-transition-recorded.v1": "Mission transition",
  "follow-up-workflow-record.v1": "Follow-up workflow",
  "assessment-metric-difference.v1": "Assessment observation",
  "self-report-difference.v1": "Self-report observation",
};

export function ObservationsCentre() {
  const { data, error, isLoading, mutate } = useSWR<CentreData>("observations-centre-browser-records-v1", readCentreData);
  const [filter, setFilter] = useState("all");
  const result = useMemo(() => data ? buildObservationNotices({ events: data.events, transitions: data.transitions, followUps: data.followUps, participants: data.recovery.participants }) : null, [data]);
  const notices = result?.notices.filter((notice) => filter === "all" || notice.ruleId === filter) ?? [];

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-7">
        <PageHeader eyebrow="Analyse · browser-local records" title="Observations & events" description="A versioned, deterministic index of explicitly recorded mission events and transitions, follow-up workflow records, and strictly eligible descriptive within-profile differences. It is not a monitoring, diagnosis, causal or readiness system." aside={<ProvenanceLabel>Rule set v{OBSERVATION_NOTICE_MODEL_VERSION}</ProvenanceLabel>} />
        {isLoading && <p role="status" className="text-sm text-glow-muted">Reading browser-local records…</p>}
        {error && <section role="alert" className="rounded-panel border border-alert/40 bg-alert/10 p-5 text-sm text-alert-ink"><h2 className="font-semibold">Observation records are unavailable</h2><p className="mt-2">{observationLoadErrorMessage(error)}</p><button type="button" onClick={() => void mutate()} className="mt-4 rounded-control border border-alert/50 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion">Retry local read</button></section>}
        {result && (
          <>
            <DataCard as="section" className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-glow">Evidence basis</h2><p className="mt-1 text-sm leading-6 text-glow-muted">All reads use the existing browser-local stores. Simulated/demo provenance is excluded. NASA OSDR is never read or joined here.</p></div><ProvenanceLabel tone="warning">Descriptive only · not a health assessment</ProvenanceLabel></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Count label="Assessment metric pairs" value={result.evidenceCounts.eligibleAssessmentMetricPairs} />
                <Count label="Self-report pairs" value={result.evidenceCounts.eligibleSelfReportPairs} />
                <Count label="Protocol-incompatible pairs" value={result.evidenceCounts.excludedProtocolPairs} />
                <Count label="Metric pairs unavailable" value={result.evidenceCounts.missingMetricPairs} />
                <Count label="Self-report gaps" value={result.evidenceCounts.missingSelfReportPairs} />
              </div>
              <label htmlFor="observation-rule-filter" className="mt-5 flex max-w-xl flex-col gap-2 text-sm font-medium text-glow">Filter record type
                <select id="observation-rule-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="instrument-control"><option value="all">All observations</option>{OBSERVATION_NOTICE_RULES.map((rule) => <option key={rule.id} value={rule.id}>{CATEGORY_LABELS[rule.id]}</option>)}</select>
              </label>
            </DataCard>
            {notices.length > 0 ? <section aria-label="Observation notices" className="flex flex-col gap-4">{notices.map((notice) => <NoticeCard key={notice.id} notice={notice} />)}</section> : (
              <EmptyState title={filter === "all" ? "No eligible notices in the available records" : "No notices match this record type"}>
                {filter === "all" ? "The current browser-local records did not satisfy a version 1 notice rule, or no eligible records were available. Absence of a notice is not evidence that everything is normal." : "No available browser-local record satisfies this selected rule. This does not indicate a normal or abnormal state."}
              </EmptyState>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Count({ label, value }: { readonly label: string; readonly value: number }) { return <div className="rounded-control border border-horizon/70 bg-void/35 p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-glow-muted">{label}</p><p className="mt-2 font-mono text-lg tabular-nums text-glow">{value}</p></div>; }

function NoticeCard({ notice }: { readonly notice: ObservationNotice }) {
  return <DataCard as="article" id={notice.id} className="p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.13em] text-ion">{notice.ruleId}</p><h2 className="mt-2 text-lg font-semibold text-glow">{notice.title}</h2></div><ProvenanceLabel>{notice.metric ? "Operational assessment" : notice.ruleId.startsWith("mission-") ? "Explicit record" : notice.ruleId.startsWith("follow-up") ? "Workflow record" : "Operational self-report"}</ProvenanceLabel></div>
    <p className="mt-3 text-sm leading-6 text-glow">{notice.detail}</p>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      <Meta label="Timestamp(s)">{notice.timestamps.map((timestamp) => `${timestamp.label}: ${formatRecoveryDateTime(timestamp.value)}`).join(" · ")}</Meta>
      <Meta label="Rule / version">{`${notice.ruleId} · notice model v${OBSERVATION_NOTICE_MODEL_VERSION}`}</Meta>
      <Meta label="Metric · protocol">{notice.metric ? `${notice.metric} · ${notice.protocol ?? "Unknown protocol"}` : "Not applicable"}</Meta>
      <Meta label="Eligible / total">{notice.eligibleDenominators === null ? "Not applicable" : notice.eligibleDenominators.map((counts) => `${counts.eligible}/${counts.total}`).join(" and ")}</Meta>
      <Meta label="Missingness">{notice.missingness}</Meta>
      <Meta label="Association basis">{notice.associationBasis}</Meta>
      <Meta label="Limitations">{notice.limitations}</Meta>
    </dl>
    <div className="mt-4 border-t border-horizon/60 pt-4"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-glow-muted">Supporting source records</h3><ul className="mt-2 flex flex-col gap-2">{notice.records.map((record) => <li key={`${record.kind}:${record.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"><span className="font-mono text-glow">{record.kind} · {record.id}</span><time dateTime={record.timestamp} className="text-glow-muted">{formatRecoveryDateTime(record.timestamp)}</time><a href={record.href} className="font-medium text-ion-soft underline-offset-4 hover:underline">Open source register</a></li>)}</ul></div>
  </DataCard>;
}

function Meta({ label, children }: { readonly label: string; readonly children: string }) { return <div className="rounded-control border border-horizon/50 bg-void/25 p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-glow-muted">{label}</dt><dd className="mt-1 text-xs leading-5 text-glow">{children}</dd></div>; }
