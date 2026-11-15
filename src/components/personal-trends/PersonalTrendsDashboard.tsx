"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRecoveryDataset } from "@/hooks/useRecoveryDataset";
import { buildRecoveryDashboardModel, formatRecoveryDateTime, RECOVERY_CHECK_IN_FIELDS } from "@/lib/analytics/recovery-dashboard";
import { buildSelfReportTrendSeries } from "@/lib/analytics/personal-trends";
import { RECOVERY_METRICS } from "@/lib/analytics/recovery";
import { AppShell } from "@/components/layout/AppShell";
import { RecoveryTrends } from "@/components/recovery/RecoveryTrends";
import { DataCard, EmptyState, FormField, PageHeader, ProvenanceLabel, StatusIndicator } from "@/components/ui/InstrumentUI";
import { Notice } from "@/components/ui/Notice";
import type { RecoveryMetric, RecoveryCheckInScoreField } from "@/types/recovery";

export function PersonalTrendsDashboard() {
  const loadState = useRecoveryDataset();
  const [metric, setMetric] = useState<RecoveryMetric>(RECOVERY_METRICS[0]);
  const [scoreField, setScoreField] = useState<RecoveryCheckInScoreField>(RECOVERY_CHECK_IN_FIELDS[0].field);
  const model = useMemo(
    () => loadState.status === "ready" ? buildRecoveryDashboardModel(loadState.dataset) : null,
    [loadState],
  );
  const performanceSeries = model?.trendSeries.find((series) => series.metric === metric);
  const selfReportSeries = model?.participant ? buildSelfReportTrendSeries(model.participant.checkIns, scoreField) : null;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-7">
        <PageHeader
          eyebrow="Analyse · browser-local records"
          title="Personal trends"
          description="Explore chronological measurements from this browser profile. Performance measurements and subjective check-ins are shown separately; no relationship, recovery trajectory, or clinical interpretation is inferred."
          aside={<ProvenanceLabel>Descriptive only</ProvenanceLabel>}
        />

        {loadState.status === "loading" && <p role="status" className="text-sm text-glow-muted">Reading saved participant records from this browser…</p>}
        {loadState.status === "error" && (
          <section role="alert" className="rounded-panel border border-alert/40 bg-alert/10 p-5 text-sm text-alert-ink">
            <h2 className="font-semibold">Personal trends are unavailable</h2>
            <p className="mt-2">{loadState.message}</p>
            <button type="button" onClick={() => void loadState.reload()} className="mt-4 rounded-control border border-alert/50 px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion">Retry local read</button>
          </section>
        )}

        {loadState.status === "ready" && model && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusIndicator
                status={model.participant ? "available" : model.participantResolution.status === "ambiguous" ? "warning" : "unavailable"}
                label={model.participant ? `${model.participant.observations.length} completed assessments · ${model.participant.checkIns.length} check-ins` : model.participantResolution.status === "ambiguous" ? "Participant profile unresolved" : "No participant observations"}
              />
              <nav aria-label="Related analysis" className="flex flex-wrap gap-4 text-sm">
                <Link href="/recovery" className="font-medium text-ion-soft underline-offset-4 hover:underline">Recovery & reference</Link>
                <Link href="/assessment" className="font-medium text-ion-soft underline-offset-4 hover:underline">Assessment</Link>
              </nav>
            </div>

            {!model.participant && (
              <EmptyState title={model.participantResolution.status === "ambiguous" ? "Participant profile needs review" : "No personal observations yet"}>
                {model.participantResolution.status === "ambiguous"
                  ? model.participantResolution.message
                  : "Complete an assessment or save a check-in in this browser profile. No sample values are displayed."}
              </EmptyState>
            )}

            {model.participant && (
              <>
                <section aria-labelledby="performance-trends-title" className="flex flex-col gap-4">
                  <header>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Instrument measurements</p>
                    <h2 id="performance-trends-title" className="mt-1 text-2xl font-semibold text-glow">Performance trends</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-glow-muted">Select one metric at a time. Values retain their measurement protocol, eligibility, and missing-data boundaries.</p>
                  </header>
                  {performanceSeries ? (
                    <RecoveryTrends series={performanceSeries} onSelectMetric={setMetric} />
                  ) : (
                    <DataCard className="p-5 text-sm text-glow-muted">No performance series is available for this profile.</DataCard>
                  )}
                </section>

                <SelfReportTrends series={selfReportSeries} onSelectField={setScoreField} />
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function SelfReportTrends({
  series,
  onSelectField,
}: {
  readonly series: ReturnType<typeof buildSelfReportTrendSeries> | null;
  readonly onSelectField: (field: RecoveryCheckInScoreField) => void;
}) {
  return (
    <DataCard as="section" className="p-5 sm:p-7" aria-labelledby="self-report-trends-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Subjective check-ins · separate series</p>
          <h2 id="self-report-trends-title" className="mt-1 text-xl font-semibold text-glow">Self-reported observations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-glow-muted">One selected check-in item is shown at a time. These are subjective reports, not objective performance measures; blank answers stay gaps.</p>
        </div>
        <ProvenanceLabel tone="warning">Self-report · not clinical</ProvenanceLabel>
      </div>

      <div className="mt-5 max-w-sm">
        <FormField label="Check-in item" htmlFor="personal-trends-checkin-field">
          <select id="personal-trends-checkin-field" value={series?.field ?? RECOVERY_CHECK_IN_FIELDS[0].field} onChange={(event) => onSelectField(event.target.value as RecoveryCheckInScoreField)} className="instrument-control">
            {RECOVERY_CHECK_IN_FIELDS.map((field) => <option key={field.field} value={field.field}>{field.label}</option>)}
          </select>
        </FormField>
      </div>

      {series && <SelfReportChart series={series} />}
      {series && series.observations.length === 0 && <Notice className="mt-4" tone="neutral">No check-ins are saved for this participant profile. The chart contains no sample or zero values.</Notice>}
      {series && series.observations.length > 0 && series.points.every((point) => point.value === null) && <Notice className="mt-4" tone="neutral">This item has not been answered in the saved check-ins. Unanswered items remain gaps and are not zero.</Notice>}
      {series?.points.filter((point) => point.value !== null).length === 1 && <Notice className="mt-4" tone="neutral">One answer is available. It is displayed as a single observation, not a trend.</Notice>}

      {series && series.observations.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-control border border-horizon/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion" role="region" aria-label="Self-reported observation records" tabIndex={0}>
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <caption className="sr-only">Saved check-in answers for {series.label}; unanswered items remain blank.</caption>
            <thead className="bg-void/70 text-xs uppercase tracking-wide text-glow-muted"><tr><th scope="col" className="px-3 py-3">Recorded (UTC)</th><th scope="col" className="px-3 py-3">{series.label}</th><th scope="col" className="px-3 py-3">Check-in context</th><th scope="col" className="px-3 py-3">Explicit phase</th></tr></thead>
            <tbody className="divide-y divide-horizon/70">{series.points.map((point, index) => {
              const observation = series.observations[index];
              if (!observation) return null;
              return <tr id={`check-in-${point.checkInId}`} key={point.checkInId}><td className="px-3 py-3 text-glow-muted">{formatRecoveryDateTime(point.recordedAt)}</td><td className="px-3 py-3 font-medium tabular-nums text-glow">{point.value === null ? "Not answered" : `${point.value} / 10`}</td><td className="px-3 py-3 text-glow-muted">{observation.context.replaceAll("-", " ")}</td><td className="px-3 py-3 text-glow-muted">{observation.missionPhase?.replaceAll("-", " ") ?? "Not recorded"}</td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </DataCard>
  );
}

function SelfReportChart({ series }: { readonly series: NonNullable<ReturnType<typeof buildSelfReportTrendSeries>> }) {
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 42, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const count = series.points.length;
  const xFor = (index: number) => padding.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const yFor = (value: number) => padding.top + ((10 - value) / 10) * plotHeight;
  const segments: string[][] = [];
  let segment: string[] = [];
  series.points.forEach((point, index) => {
    if (point.value === null) {
      if (segment.length) segments.push(segment);
      segment = [];
      return;
    }
    segment.push(`${xFor(index)},${yFor(point.value)}`);
  });
  if (segment.length) segments.push(segment);
  const dateIndexes = count <= 5 ? series.points.map((_, index) => index) : [0, Math.round((count - 1) / 2), count - 1];

  return (
    <div className="mt-5 overflow-x-auto rounded-panel border border-horizon/70 bg-void/35 p-3">
      <svg role="img" aria-label={`${series.label} self-reported scores from zero to ten; missing answers are gaps.`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[540px]">
        <title>{series.label} self-reported observations</title>
        <desc>{series.scale}. Scores use the participant&apos;s 0 to 10 answers. Lines stop at unanswered check-ins and do not imply a recovery interpretation.</desc>
        {[0, 5, 10].map((tick) => <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={yFor(tick)} y2={yFor(tick)} stroke="#53627a" strokeOpacity=".55" /><text x={padding.left - 10} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill="#aab5c8">{tick}</text></g>)}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#8793a7" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#8793a7" />
        {segments.map((points, index) => points.length > 1 && <polyline key={index} points={points.join(" ")} fill="none" stroke="#66d6df" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {series.points.map((point, index) => point.value === null ? null : <circle key={point.checkInId} cx={xFor(index)} cy={yFor(point.value)} r="4" fill="#101b2b" stroke="#66d6df" strokeWidth="2"><title>{`${formatRecoveryDateTime(point.recordedAt)} · ${series.label}: ${point.value} / 10`}</title></circle>)}
        {dateIndexes.map((index) => {
          const point = series.points[index];
          if (!point) return null;
          const date = Number.isFinite(Date.parse(point.recordedAt)) ? new Date(point.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "Date unavailable";
          return <text key={`${point.checkInId}-date`} x={xFor(index)} y={height - 13} textAnchor="middle" fontSize="11" fill="#aab5c8">{date}</text>;
        })}
        <text x={padding.left} y={15} fontSize="11" fill="#c7d3e5">Score · 0–10</text>
      </svg>
      <p className="mt-2 text-xs text-glow-muted">Scale polarity: {series.polarity.replaceAll("-", " ")}. A higher or lower score is not classified as good, bad, healthy, or unfit.</p>
    </div>
  );
}
