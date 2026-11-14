"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { DataCard, DataTable, EmptyState, FormField, PageHeader, ProvenanceLabel, StatusIndicator } from "@/components/ui/InstrumentUI";
import { listAssessmentSessions } from "@/lib/storage/assessment-storage";
import { listCheckIns } from "@/lib/storage/checkin-storage";
import { listMissionContexts } from "@/lib/storage/mission-storage";
import { buildSignalConcordance } from "@/lib/concordance/signal-concordance";
import { loadRecoveryDataset } from "@/lib/analytics/recovery";
import type { AssessmentSession } from "@/types/assessment";
import type { SymptomCheckInRecord } from "@/types/checkin";
import type { SignalConcordanceResult } from "@/types/concordance";
import type { StorageResult } from "@/lib/storage/database";

async function readValue<T>(request: Promise<StorageResult<T>>): Promise<T> {
  const result = await request;
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function loadRecords() {
  const [sessions, checkIns, contexts] = await Promise.all([
    readValue(listAssessmentSessions()),
    readValue(listCheckIns()),
    readValue(listMissionContexts()),
  ]);
  return {
    sessions: sessions.filter((session) => session.status === "completed" && Boolean(session.metadata.completedAt)),
    checkIns,
    contexts,
  };
}

export default function ConcordancePage() {
  const { data, error: loadError, isLoading } = useSWR("concordance-records", loadRecords);
  const sessions = data?.sessions ?? [];
  const checkIns = data?.checkIns ?? [];
  const contexts = data?.contexts ?? [];
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [referenceSessionId, setReferenceSessionId] = useState("");
  const [currentCheckInId, setCurrentCheckInId] = useState("");
  const [referenceCheckInId, setReferenceCheckInId] = useState("");
  const [missionContextId, setMissionContextId] = useState("");
  const [report, setReport] = useState<SignalConcordanceResult | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    setReport(null);
    if (!currentSessionId || !referenceSessionId) {
      setError("Select both a current and a reference completed assessment session.");
      return;
    }
    try {
      const datasetResult = await loadRecoveryDataset();
      if (!datasetResult.ok) {
        setError(datasetResult.error.message);
        return;
      }
      const participant = datasetResult.value.participants.find((item) => item.observations.some((observation) => observation.sessionId === currentSessionId));
      if (!participant) {
        setError("No valid recovery profile is available for the selected current session.");
        return;
      }
      if (!participant.observations.some((observation) => observation.sessionId === referenceSessionId)) {
        setError("The reference session is not part of the same stored participant profile as the current session.");
        return;
      }
      const missionContext = contexts.find((context) => context.id === missionContextId) ?? null;
      setReport(buildSignalConcordance({
        participant,
        currentSessionId,
        referenceSessionId,
        checkIns,
        currentCheckInId: currentCheckInId || undefined,
        referenceCheckInId: referenceCheckInId || undefined,
        missionContext,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to build the comparison from local records.");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader eyebrow="Analyse · explicit record comparison" title="Signal concordance" description="Compare eligible values from completed assessments and explicitly associated self-reports. This is a descriptive co-observation only: no causal, diagnostic, or readiness conclusions are produced." aside={<ProvenanceLabel tone="warning">No composite score</ProvenanceLabel>} />

        {loadError && <p role="alert" className="rounded-control border border-alert/40 bg-alert/10 p-3 text-sm text-alert-ink">Local records could not be read: {loadError.message}</p>}
        <DataCard as="section" className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-glow">Choose existing observations</h2>
              <p className="mt-1 text-sm leading-6 text-glow-muted">Only records already saved in this browser are offered. Check-ins and mission context are linked only by explicit selection.</p>
            </div>
            <StatusIndicator label={isLoading ? "Reading local records" : `${sessions.length} completed sessions`} status={isLoading ? "warning" : sessions.length ? "available" : "unavailable"} />
          </div>
          {loadError ? null : sessions.length === 0 && !isLoading ? (
            <EmptyState title="No completed assessment sessions are available">Complete and save an assessment in this browser before generating a performance comparison. No example results are substituted.</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Current completed session" htmlFor="current-session">
                <select id="current-session" value={currentSessionId} onChange={(event) => setCurrentSessionId(event.target.value)} className="instrument-control">
                  <option value="">Choose a saved session</option>
                  {sessions.map((session, index) => <option key={session.metadata.sessionId} value={session.metadata.sessionId}>{sessionLabel(session, index)}</option>)}
                </select>
              </FormField>
              <FormField label="Reference completed session" htmlFor="reference-session">
                <select id="reference-session" value={referenceSessionId} onChange={(event) => setReferenceSessionId(event.target.value)} className="instrument-control">
                  <option value="">Choose a saved session</option>
                  {sessions.map((session, index) => <option key={session.metadata.sessionId} value={session.metadata.sessionId}>{sessionLabel(session, index)}</option>)}
                </select>
              </FormField>
              <FormField label="Current check-in (optional)" htmlFor="current-check-in" hint="Choose an explicitly linked saved check-in; otherwise self-report comparison stays unavailable.">
                <select id="current-check-in" value={currentCheckInId} onChange={(event) => setCurrentCheckInId(event.target.value)} className="instrument-control">
                  <option value="">No check-in selected</option>
                  {checkIns.map((checkIn) => <option key={checkIn.id} value={checkIn.id}>{checkInLabel(checkIn)}</option>)}
                </select>
              </FormField>
              <FormField label="Reference check-in (optional)" htmlFor="reference-check-in">
                <select id="reference-check-in" value={referenceCheckInId} onChange={(event) => setReferenceCheckInId(event.target.value)} className="instrument-control">
                  <option value="">No check-in selected</option>
                  {checkIns.map((checkIn) => <option key={checkIn.id} value={checkIn.id}>{checkInLabel(checkIn)}</option>)}
                </select>
              </FormField>
              <FormField label="Mission context (optional)" htmlFor="mission-context" hint="Mission phase is shown only when it was explicitly recorded.">
                <select id="mission-context" value={missionContextId} onChange={(event) => setMissionContextId(event.target.value)} className="instrument-control">
                  <option value="">No mission context selected</option>
                  {contexts.map((context) => <option key={context.id} value={context.id}>{context.missionName} · {context.phase}</option>)}
                </select>
              </FormField>
            </div>
          )}
          {error && <p role="alert" className="mt-4 rounded-control border border-alert/40 bg-alert/10 p-3 text-sm text-alert-ink">{error}</p>}
          <button type="button" onClick={() => void generate()} disabled={!sessions.length || isLoading} className="mt-5 rounded-control bg-ion px-4 py-2.5 text-sm font-semibold text-void hover:bg-ion-soft disabled:cursor-not-allowed disabled:opacity-50">Generate from selected records</button>
        </DataCard>

        {report && <ConcordanceReport report={report} />}
      </div>
    </AppShell>
  );
}

function ConcordanceReport({ report }: { readonly report: SignalConcordanceResult }) {
  return (
    <section aria-labelledby="concordance-report-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Derived from selected live records</p>
          <h2 id="concordance-report-heading" className="mt-1 text-xl font-semibold text-glow">Comparison report</h2>
        </div>
        <ProvenanceLabel tone={report.protocol.compatible ? "accent" : "warning"}>{report.protocol.compatible ? "Protocols compatible" : "Protocol mismatch"}</ProvenanceLabel>
      </div>
      <DataCard className="p-5 sm:p-6">
        <h3 className="mb-4 font-semibold text-glow">Assessment performance</h3>
        <DataTable label="Assessment performance comparison">
          <thead className="bg-void/70 text-xs uppercase tracking-wide text-glow-muted"><tr><th scope="col" className="px-3 py-3">Measure</th><th scope="col" className="px-3 py-3">Current</th><th scope="col" className="px-3 py-3">Reference</th><th scope="col" className="px-3 py-3">Change</th><th scope="col" className="px-3 py-3">Availability</th></tr></thead>
          <tbody className="divide-y divide-horizon/70">{report.performanceComparisons.map((item) => <tr key={item.metric} className="align-top"><th scope="row" className="px-3 py-3 font-medium text-glow">{item.label}<span className="mt-1 block text-xs font-normal text-glow-muted">{item.unit}</span></th><td className="px-3 py-3 tabular-nums text-glow">{formatValue(item.sourceValue)}</td><td className="px-3 py-3 tabular-nums text-glow">{formatValue(item.referenceValue)}</td><td className="px-3 py-3 tabular-nums text-glow">{formatValue(item.change)}</td><td className="px-3 py-3 text-xs text-glow-muted">{item.availability.replaceAll("-", " ")}{item.missingDataExplanation && <span className="mt-1 block">{item.missingDataExplanation}</span>}</td></tr>)}</tbody>
        </DataTable>
      </DataCard>
      <DataCard className="p-5 sm:p-6">
        <h3 className="mb-4 font-semibold text-glow">Self-reported observations</h3>
        <DataTable label="Self-reported observation comparison">
          <thead className="bg-void/70 text-xs uppercase tracking-wide text-glow-muted"><tr><th scope="col" className="px-3 py-3">Item</th><th scope="col" className="px-3 py-3">Current</th><th scope="col" className="px-3 py-3">Reference</th><th scope="col" className="px-3 py-3">Availability</th></tr></thead>
          <tbody className="divide-y divide-horizon/70">{report.selfReportComparisons.map((item) => <tr key={item.field} className="align-top"><th scope="row" className="px-3 py-3 font-medium text-glow">{item.label}<span className="mt-1 block text-xs font-normal text-glow-muted">{item.scale} · {item.polarity.replaceAll("-", " ")}</span></th><td className="px-3 py-3 tabular-nums text-glow">{formatValue(item.sourceValue)}</td><td className="px-3 py-3 tabular-nums text-glow">{formatValue(item.referenceValue)}</td><td className="px-3 py-3 text-xs text-glow-muted">{item.availability.replaceAll("-", " ")}{item.explanation && <span className="mt-1 block">{item.explanation}</span>}</td></tr>)}</tbody>
        </DataTable>
      </DataCard>
      <DataCard className="p-5 sm:p-6">
        <h3 className="font-semibold text-glow">Interpretation boundary</h3>
        <p className="mt-2 text-sm leading-6 text-glow-muted">No composite score is calculated. A relationship or difference here is descriptive co-observation only; it does not establish causation, diagnosis, mission readiness, or fitness for duty.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-glow-muted">{report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </DataCard>
    </section>
  );
}

function sessionLabel(session: AssessmentSession, index: number) {
  const date = session.metadata.completedAt ? new Date(session.metadata.completedAt).toLocaleString() : "Completion time unavailable";
  return `Session ${index + 1} · ${date} · protocol ${session.metadata.protocolVersion}`;
}

function checkInLabel(checkIn: SymptomCheckInRecord) {
  const context = checkIn.context === "general" ? "General check-in" : checkIn.context === "pre-assessment" ? "Before assessment" : "After assessment";
  return `${context} · ${new Date(checkIn.recordedAt).toLocaleString()}`;
}

function formatValue(value: number | null) {
  return value === null ? "Unavailable" : Number(value.toFixed(3)).toString();
}
