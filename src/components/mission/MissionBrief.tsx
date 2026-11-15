"use client";

import Link from "next/link";
import useSWR from "swr";
import type { ReactNode } from "react";
import { DataCard, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { buildMissionActivityTimeline, latestRecordedMissionContext } from "@/lib/mission/activity-timeline";
import { summarizeAssessmentResults } from "@/lib/analytics/session-summary";
import { formatRecoveryDateTime } from "@/lib/analytics/recovery-dashboard";
import { readMissionBriefRecords } from "@/lib/storage/read-only-mission-brief";
import type { SymptomCheckInRecord } from "@/types/checkin";

async function loadBrief() {
  const records = await readMissionBriefRecords();
  return {
    contexts: records.contexts,
    activities: buildMissionActivityTimeline(records),
    assessments: records.assessments,
    checkIns: records.checkIns,
  };
}

export function MissionBrief() {
  const { data, error, isLoading } = useSWR("mission-brief-read-only", loadBrief);
  const context = data ? latestRecordedMissionContext(data.contexts) : null;
  const latestAssessment = data?.assessments.filter((item) => item.status === "completed" && item.metadata.provenance === "browser-user-generated" && item.metadata.simulated === false).slice().sort((a, b) => Date.parse(b.metadata.completedAt ?? "") - Date.parse(a.metadata.completedAt ?? ""))[0];
  const latestCheckIn = data?.checkIns.filter((item) => item.provenance === "browser-user-generated").slice().sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
  const latestAssessmentSummary = latestAssessment ? summarizeAssessmentResults(latestAssessment) : null;

  return (
    <section aria-labelledby="mission-brief-title" className="relative border-y border-horizon/60 bg-hull/65 px-6 py-12 md:px-10 md:py-16 lg:px-14">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ion">Mission Brief · browser-local records</p>
            <h2 id="mission-brief-title" className="mt-2 text-display-md font-semibold tracking-tight text-glow">A grounded view of this browser.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-glow-muted">Only saved participant records appear here. The latest recorded context is not assumed to be current, and no record is inferred from timing or nearby entries.</p>
          </div>
          <ProvenanceLabel>Read-only overview</ProvenanceLabel>
        </header>

        {error ? <p role="alert" className="rounded-control border border-alert/40 bg-alert/10 p-4 text-sm text-alert-ink">Local records could not be read: {error.message} No participant values are shown.</p> : isLoading ? <p role="status" className="text-sm text-glow-muted">Reading saved records from this browser…</p> : data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <BriefCard title="Mission context" href="/mission/contexts" empty="No mission context recorded.">
                {context ? <><p className="text-lg font-semibold text-glow">{context.missionName}</p><p className="mt-1 text-sm text-glow-muted">Explicitly recorded phase: {context.phase === "custom" ? context.customPhaseLabel ?? "Custom" : context.phase.replaceAll("-", " ")}</p><time className="mt-2 block text-xs text-glow-faint" dateTime={context.phaseRecordedAt}>Recorded {formatRecoveryDateTime(context.phaseRecordedAt)}</time></> : null}
              </BriefCard>
              <BriefCard title="Assessment" href="/assessment" empty="No completed browser assessment recorded.">
                {latestAssessment ? <><p className="text-lg font-semibold text-glow">Completed session</p><p className="mt-1 text-sm text-glow-muted">Protocol {latestAssessment.metadata.protocolVersion}</p>{latestAssessmentSummary && <p className="mt-2 text-xs leading-5 text-glow-muted">{latestAssessmentSummary.measurementValidity.replaceAll("-", " ")} · {latestAssessmentSummary.completedTrials} / {latestAssessmentSummary.totalTrials} trials completed</p>}<time className="mt-2 block text-xs text-glow-faint" dateTime={latestAssessment.metadata.completedAt ?? undefined}>{formatRecoveryDateTime(latestAssessment.metadata.completedAt ?? null)}</time></> : null}
              </BriefCard>
              <BriefCard title="Self-report" href="/check-in" empty="No check-in recorded.">
                {latestCheckIn ? <><p className="text-lg font-semibold text-glow">{answeredCount(latestCheckIn)} of 12 items answered</p><p className="mt-1 text-sm text-glow-muted">Subjective report · unanswered items remain blank</p><time className="mt-2 block text-xs text-glow-faint" dateTime={latestCheckIn.recordedAt}>Recorded {formatRecoveryDateTime(latestCheckIn.recordedAt)}</time></> : null}
              </BriefCard>
            </div>

            <DataCard as="section" className="p-5 sm:p-7" aria-labelledby="mission-activity-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Unified activity</p><h3 id="mission-activity-heading" className="mt-1 text-xl font-semibold text-glow">Recent recorded observations</h3></div>
                <Link href="/mission" className="text-sm text-ion-soft underline-offset-4 hover:underline">Open mission overview</Link>
              </div>
              {data.activities.length ? <ol className="mt-5 flex flex-col border-l border-horizon pl-5">{data.activities.slice(0, 6).map((entry) => <li key={`${entry.kind}:${entry.id}`} className="relative border-b border-horizon/40 py-4 last:border-0"><span aria-hidden="true" className="absolute -left-[1.57rem] top-6 size-2 rounded-full border border-ion/70 bg-hull-raised"/><div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-medium text-glow">{entry.title}</h4><span className="text-[10px] uppercase tracking-wide text-glow-faint">{entry.kind.replaceAll("-", " ")}</span></div>{entry.phase && <p className="mt-1 text-xs text-glow-muted">Phase explicitly recorded: {entry.phase.replaceAll("-", " ")}</p>}<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-glow-faint"><span>{entry.occurredAt ? <>Occurred <time dateTime={entry.occurredAt}>{formatRecoveryDateTime(entry.occurredAt)}</time></> : "Occurrence time unavailable"}</span>{entry.recordedAt && entry.recordedAt !== entry.occurredAt && <span>Recorded <time dateTime={entry.recordedAt}>{formatRecoveryDateTime(entry.recordedAt)}</time></span>}<span>{entry.provenance}</span></div><Link href={entry.href} className="mt-2 inline-flex text-xs font-medium text-ion-soft underline-offset-4 hover:underline">Open source records<span className="sr-only"> for {entry.title}</span></Link></li>)}</ol> : <p className="mt-5 rounded-control border border-dashed border-horizon p-5 text-sm text-glow-muted">No mission activities have been recorded in this browser. This view does not invent entries.</p>}
            </DataCard>
            <div className="flex flex-wrap gap-3">
              <Link href="/check-in" className="rounded-control bg-ion px-5 py-3 text-sm font-semibold text-void hover:bg-ion-soft">Quick check-in</Link>
              <Link href="/assessment" className="rounded-control border border-horizon px-5 py-3 text-sm font-medium text-glow hover:border-ion/50">Start assessment</Link>
              <Link href="/personal-trends" className="rounded-control border border-horizon px-5 py-3 text-sm font-medium text-glow hover:border-ion/50">Personal trends</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function BriefCard({ title, href, empty, children }: { readonly title: string; readonly href: string; readonly empty: string; readonly children: ReactNode }) {
  const hasContent = children !== null;
  return <DataCard as="article" className="flex min-h-40 flex-col p-5"><div className="flex items-center justify-between gap-2"><h3 className="text-[11px] font-semibold uppercase tracking-[0.17em] text-glow-muted">{title}</h3><Link href={href} className="text-xs text-ion-soft underline-offset-4 hover:underline">View records</Link></div><div className="mt-4">{hasContent ? children : <p className="text-sm text-glow-faint">{empty}</p>}</div></DataCard>;
}

function answeredCount(record: SymptomCheckInRecord): number {
  return [record.dizzinessOrDisorientation, record.balanceOrCoordinationDifficulty, record.nausea, record.visualDiscomfort, record.fatigue, record.movementConfidence, record.sleepQuality, record.sleepScheduleDisruption, record.workload, record.stress, record.generalWellbeing, record.existingSymptoms].filter((answer) => answer !== undefined).length;
}
