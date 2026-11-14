"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildRecoveryDashboardModel,
  formatRecoveryDateTime,
  type RecoveryDashboardModel,
  type RecoveryParticipantResolution,
} from "@/lib/analytics/recovery-dashboard";
import { useRecoveryDataset } from "@/hooks/useRecoveryDataset";
import type { RecoveryMetric } from "@/types/recovery";
import { AlignmentSection } from "./AlignmentSection";
import { CheckInHistory } from "./CheckInHistory";
import { MetricGrid } from "./MetricGrid";
import { RecoveryHeader } from "./RecoveryHeader";
import { RecoveryOverview } from "./RecoveryOverview";
import { RecoveryQualitySection } from "./RecoveryQualitySection";
import { Notice, Stat } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";
import { RecoveryTrends } from "./RecoveryTrends";
import { ReferenceSessionPanel } from "./ReferenceSessionPanel";

export function RecoveryDashboard() {
  const loadState = useRecoveryDataset();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [referenceSessionId, setReferenceSessionId] = useState<string | null>(null);
  const [focusMetric, setFocusMetric] = useState<RecoveryMetric | null>(null);

  const model = useMemo(() => {
    if (loadState.status !== "ready") return null;
    return buildRecoveryDashboardModel(loadState.dataset, {
      ...(currentSessionId ? { currentSessionId } : {}),
      ...(referenceSessionId ? { referenceSessionId } : {}),
      ...(focusMetric ? { focusMetric } : {}),
    });
  }, [loadState, currentSessionId, referenceSessionId, focusMetric]);

  const completedSessions = loadState.status === "ready" ? model?.overview.completedSessions ?? 0 : null;

  const selectCurrent = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setReferenceSessionId(null);
  };

  const selectReference = (sessionId: string | null) => {
    if (sessionId && sessionId === model?.current?.sessionId) return;
    setReferenceSessionId(sessionId);
  };

  return (
    <div className="recovery-dashboard mx-auto w-full max-w-6xl space-y-6">
      <RecoveryHeader completedSessions={completedSessions} />

      {loadState.status === "loading" && <RecoveryLoading />}
      {loadState.status === "error" && <RecoveryError message={loadState.message} onRetry={() => { void loadState.reload(); }} />}

      {loadState.status === "ready" && model && (
        model.participant && model.current ? (
          <RecoveryContent
            model={model}
            onSelectCurrent={selectCurrent}
            onSelectReference={selectReference}
            onSelectMetric={setFocusMetric}
          />
        ) : (
          <RecoveryEmpty model={model} />
        )
      )}
    </div>
  );
}

function RecoveryContent({
  model,
  onSelectCurrent,
  onSelectReference,
  onSelectMetric,
}: {
  readonly model: RecoveryDashboardModel;
  readonly onSelectCurrent: (sessionId: string) => void;
  readonly onSelectReference: (sessionId: string | null) => void;
  readonly onSelectMetric: (metric: RecoveryMetric) => void;
}) {
  if (!model.participant || !model.current) return null;
  const focusMetric = model.focusMetric;
  const focusSeries = model.trendSeries.find((series) => series.metric === focusMetric) ?? model.trendSeries[0];

  return (
    <div className="space-y-6">
      <RecoveryOverview overview={model.overview} dataset={model.dataset} />
      <ReferenceSessionPanel
        current={model.current}
        currentOptions={model.currentOptions}
        referenceOptions={model.referenceOptions}
        explicitReferenceSessionId={model.explicitReferenceSessionId}
        referenceMode={model.referenceMode}
        metricViews={model.metricViews}
        onSelectCurrent={onSelectCurrent}
        onSelectReference={onSelectReference}
      />
      <MetricGrid
        current={model.current}
        metricViews={model.metricViews}
        focusMetric={focusMetric}
        onFocusMetric={onSelectMetric}
      />
      {focusSeries && <RecoveryTrends series={focusSeries} onSelectMetric={onSelectMetric} />}
      <AlignmentSection alignment={model.alignment} current={model.current} />
      <CheckInHistory entries={model.checkIns} />
      <RecoveryQualitySection quality={model.quality} dataset={model.dataset} />
    </div>
  );
}

function RecoveryLoading() {
  return (
    <section aria-busy="true" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Reading local records</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">Loading recovery observations…</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Reading completed assessment sessions and check-ins from this browser profile. No sample observations are generated, and no historical record is modified.
      </p>
      <div aria-hidden="true" className="mt-5 grid animate-pulse gap-3 sm:grid-cols-2">
        <div className="h-16 rounded-lg bg-slate-100" />
        <div className="h-16 rounded-lg bg-slate-100" />
      </div>
    </section>
  );
}

function RecoveryError({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Local data unavailable</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">Recovery observations could not be loaded</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{message}</p>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
        LIMEN reads local IndexedDB records in this browser profile. Private browsing, storage policy, eviction, or an unavailable database can prevent access. No data is invented to replace inaccessible records.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        Retry local read
      </button>
    </section>
  );
}

function RecoveryEmpty({ model }: { readonly model: RecoveryDashboardModel }) {
  const resolution = model.participantResolution;
  const title = emptyTitle(resolution);
  const description = emptyDescription(resolution);
  return (
    <div className="space-y-6">
      <RecoverySection id="recovery-empty" eyebrow="No observations" title={title} description={description}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Stored session records" value={String(model.dataset.loadedSessionCount)} />
          <Stat label="Excluded sessions" value={String(model.dataset.excludedSessions.length)} detail="Incomplete or missing a valid completion timestamp." />
          <Stat label="Rejected records" value={String(model.dataset.rejectedRecords.length)} detail="Malformed, simulated, non-browser, or invalid." />
          <Stat label="Check-in records" value={String(model.dataset.loadedCheckInCount)} />
        </dl>

        <div className="mt-5 space-y-3">
          {resolution.status === "ambiguous" && (
            <Notice tone="warning">{resolution.message}</Notice>
          )}
          {resolution.status === "not-found" && (
            <Notice tone="warning">{resolution.message}</Notice>
          )}
          <Notice tone="neutral">
            Complete an assessment in this browser profile to create the first recovery observation. Eligibility and a Personal Reference Session require completed data; they are not estimated in advance.
          </Notice>
          {model.dataset.excludedSessions.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <p className="font-medium">Excluded session reasons</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {model.dataset.excludedSessions.slice(0, 8).map((session) => (
                  <li key={session.sessionId}>{session.sessionId}: {session.explanation}</li>
                ))}
              </ul>
              {model.dataset.excludedSessions.length > 8 && (
                <p className="mt-1">…and {model.dataset.excludedSessions.length - 8} more excluded session{model.dataset.excludedSessions.length - 8 === 1 ? "" : "s"}.</p>
              )}
            </div>
          )}
          {model.dataset.rejectedRecords.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
              <p className="font-medium">Rejected record reasons</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {model.dataset.rejectedRecords.slice(0, 8).map((record, index) => (
                  <li key={`${record.kind}-${record.recordId ?? index}`}>{record.kind}{record.recordId ? ` (${record.recordId})` : ""}: {record.reason}</li>
                ))}
              </ul>
              {model.dataset.rejectedRecords.length > 8 && (
                <p className="mt-1">…and {model.dataset.rejectedRecords.length - 8} more rejected record{model.dataset.rejectedRecords.length - 8 === 1 ? "" : "s"}.</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/assessment" className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              Open assessment
            </Link>
            <p className="text-xs text-slate-500">Local records last read: {formatRecoveryDateTime(new Date().toISOString())}</p>
          </div>
        </div>
      </RecoverySection>

      {model.checkIns.length > 0 && <CheckInHistory entries={model.checkIns} />}
    </div>
  );
}

function emptyTitle(resolution: RecoveryParticipantResolution): string {
  if (resolution.status === "empty") return "No browser-local records are stored";
  if (resolution.status === "ambiguous") return "Several participant profiles are present";
  if (resolution.status === "not-found") return "The requested participant profile is not available";
  return "No completed assessment observations are available";
}

function emptyDescription(resolution: RecoveryParticipantResolution): string {
  if (resolution.status === "empty") {
    return "This browser profile contains no completed assessment sessions or check-ins. The recovery dashboard is built only from validated completed browser assessment sessions and never generates demonstration observations.";
  }
  if (resolution.status === "ambiguous") {
    return "LIMEN keeps one browser-local participant profile and does not merge, choose between, or manage multiple profiles. The records remain stored exactly as they were written.";
  }
  if (resolution.status === "not-found") {
    return "The requested browser-local participant profile does not exist in this browser profile.";
  }
  return "The recovery dashboard is built only from validated completed browser assessment sessions. It does not generate demonstration observations, sample metric values, or a simulated recovery trajectory.";
}
