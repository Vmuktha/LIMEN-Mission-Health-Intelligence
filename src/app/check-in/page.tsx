"use client";

import { useState } from "react";
import useSWR from "swr";
import { AppShell } from "@/components/layout/AppShell";
import { CheckInForm } from "@/components/check-in/CheckInForm";
import { DataCard, EmptyState, FormField, PageHeader, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { EXTENDED_CHECK_IN_FIELDS } from "@/lib/checkin/record";
import { listCheckIns } from "@/lib/storage/checkin-storage";
import { listAssessmentSessions } from "@/lib/storage/assessment-storage";
import { listMissionContexts } from "@/lib/storage/mission-storage";
import type { CheckInContext, SymptomCheckInRecord } from "@/types/checkin";
import type { AssessmentSession } from "@/types/assessment";
import type { MissionContext } from "@/types/mission-context";
import type { StorageResult } from "@/lib/storage/database";

async function readValue<T>(request: Promise<StorageResult<T>>): Promise<T> {
  const result = await request;
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function loadCheckIns() {
  const records = await readValue(listCheckIns());
  return [...records].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
}

async function loadAssociations() {
  const [sessions, contexts] = await Promise.all([
    readValue(listAssessmentSessions()),
    readValue(listMissionContexts()),
  ]);
  return {
    sessions: sessions.filter((session) => session.status === "completed" && Boolean(session.metadata.completedAt)),
    contexts,
  };
}

export default function CheckInPage() {
  const { data: checkIns, error: checkInError, isLoading, mutate } = useSWR<readonly SymptomCheckInRecord[]>("check-in-records", loadCheckIns);
  const { data: associations, error: associationError, isLoading: associationsLoading } = useSWR("check-in-associations", loadAssociations);
  const contexts = associations?.contexts ?? [];
  const sessions = associations?.sessions ?? [];

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          eyebrow="Operate · browser-local self-report"
          title="Crew check-in"
          description="Record subjective observations using the same check-in flow available before and after an assessment. Values stay on this device and are never treated as objective clinical measurements."
          aside={<ProvenanceLabel tone="warning">Not a diagnosis</ProvenanceLabel>}
        />

        {associationError && <p role="status" className="rounded-control border border-ember/30 bg-ember/10 p-3 text-sm text-amber-200">Saved mission and assessment associations could not be loaded; this check-in can still be saved without a link.</p>}
        {associationsLoading && <p role="status" className="text-xs text-glow-muted">Checking for existing mission contexts and completed assessments…</p>}
        <StandaloneForm contexts={contexts} sessions={sessions} onSaved={() => { void mutate(); }} />

        <section aria-labelledby="check-in-history-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Persisted on this device</p>
              <h2 id="check-in-history-heading" className="mt-1 text-xl font-semibold text-glow">Check-in history</h2>
            </div>
            <p className="text-xs text-glow-muted">{isLoading ? "Loading records…" : `${checkIns?.length ?? 0} saved ${checkIns?.length === 1 ? "entry" : "entries"}`}</p>
          </div>
          {checkInError ? (
            <EmptyState title="Local records are unavailable">{checkInError.message} Check your browser storage settings and try again.</EmptyState>
          ) : (checkIns?.length ?? 0) === 0 && !isLoading ? (
            <EmptyState title="No check-ins recorded yet">Saved check-ins will appear here as human-readable self-report summaries. No records are created until you choose to save one.</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {(checkIns ?? []).map((record) => <CheckInHistoryCard key={record.id} record={record} />)}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-glow-faint">Local records can be removed from Privacy &amp; local data. Check-ins are not sent to a server.</p>
      </div>
    </AppShell>
  );
}

function StandaloneForm({ contexts, sessions, onSaved }: { readonly contexts: readonly MissionContext[]; readonly sessions: readonly AssessmentSession[]; readonly onSaved: () => void }) {
  const [context, setContext] = useState<CheckInContext>("general");
  const [missionContextId, setMissionContextId] = useState("");
  const [assessmentSessionId, setAssessmentSessionId] = useState("");
  const selectedContext = contexts.find((item) => item.id === missionContextId);
  const validSessionId = sessions.some((session) => session.metadata.sessionId === assessmentSessionId) ? assessmentSessionId : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="sr-only" aria-live="polite">Current check-in context: {contextLabel(context)}. Mission association: {selectedContext?.missionName ?? "none"}. Assessment association: {validSessionId ? "selected" : "none"}.</div>
      <AssociationControls
        context={context}
        contexts={contexts}
        sessions={sessions}
        missionContextId={missionContextId}
        assessmentSessionId={assessmentSessionId}
        onContextChange={setContext}
        onMissionContextChange={setMissionContextId}
        onAssessmentSessionChange={setAssessmentSessionId}
      />
      <CheckInForm
        context={context}
        assessmentSessionId={validSessionId}
        missionContextId={selectedContext?.id}
        missionPhase={selectedContext?.phase}
        onSaved={onSaved}
      />
    </div>
  );
}

function AssociationControls({ context, contexts, sessions, missionContextId, assessmentSessionId, onContextChange, onMissionContextChange, onAssessmentSessionChange }: {
  readonly context: CheckInContext;
  readonly contexts: readonly MissionContext[];
  readonly sessions: readonly AssessmentSession[];
  readonly missionContextId: string;
  readonly assessmentSessionId: string;
  readonly onContextChange: (value: CheckInContext) => void;
  readonly onMissionContextChange: (value: string) => void;
  readonly onAssessmentSessionChange: (value: string) => void;
}) {
  return (
    <DataCard as="section" className="p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-glow">Optional associations</h2>
        <p className="mt-1 text-sm leading-6 text-glow-muted">Link this entry only to existing records. Leaving either field unselected is valid.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Check-in context" htmlFor="check-in-context" hint="Describes when you are reporting, not a derived phase.">
          <select id="check-in-context" value={context} onChange={(event) => onContextChange(event.target.value as CheckInContext)} className="instrument-control">
            <option value="general">General</option><option value="pre-assessment">Before an assessment</option><option value="post-assessment">After an assessment</option>
          </select>
        </FormField>
        <FormField label="Mission context (optional)" htmlFor="check-in-mission-context">
          <select id="check-in-mission-context" value={missionContextId} onChange={(event) => onMissionContextChange(event.target.value)} className="instrument-control">
            <option value="">No mission context</option>
            {contexts.map((item) => <option key={item.id} value={item.id}>{item.missionName} · {item.phase}</option>)}
          </select>
        </FormField>
        <FormField label="Completed assessment (optional)" htmlFor="check-in-assessment-session" hint="Only completed sessions on this device are listed.">
          <select id="check-in-assessment-session" value={assessmentSessionId} onChange={(event) => onAssessmentSessionChange(event.target.value)} className="instrument-control">
            <option value="">No assessment association</option>
            {sessions.map((session, index) => <option key={session.metadata.sessionId} value={session.metadata.sessionId}>Completed session {index + 1} · {formatDate(session.metadata.completedAt)}</option>)}
          </select>
        </FormField>
      </div>
    </DataCard>
  );
}

function CheckInHistoryCard({ record }: { readonly record: SymptomCheckInRecord }) {
  const answers = EXTENDED_CHECK_IN_FIELDS.filter((field) => record[field.field] !== undefined);
  return (
    <DataCard className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-glow">{contextLabel(record.context)}</h3>
          <time dateTime={record.recordedAt} className="mt-1 block text-xs text-glow-muted">{new Date(record.recordedAt).toLocaleString()}</time>
        </div>
        <ProvenanceLabel>Live self-report</ProvenanceLabel>
      </div>
      {answers.length ? (
        <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {answers.map((field) => <div key={field.field} className="flex items-baseline justify-between gap-3 border-b border-horizon/50 py-2"><dt className="text-sm text-glow-muted">{field.label}</dt><dd className="font-mono text-sm tabular-nums text-glow">{record[field.field]}</dd></div>)}
        </dl>
      ) : <p className="mt-4 text-sm text-glow-muted">No scale items were answered. This is a saved check-in with unanswered items, not a set of zero scores.</p>}
      {record.missionPhase && <p className="mt-4 text-xs text-glow-muted">Mission phase recorded with context: <span className="text-glow">{record.missionPhase}</span></p>}
      {record.assessmentSessionId && <p className="mt-2 text-xs text-glow-muted">Explicitly linked to a completed assessment session.</p>}
      {record.freeTextNote && <p className="mt-4 border-t border-horizon/60 pt-3 text-sm leading-6 text-glow-muted">{record.freeTextNote}</p>}
    </DataCard>
  );
}

function contextLabel(context: string) {
  if (context === "pre-assessment") return "Before an assessment";
  if (context === "post-assessment") return "After an assessment";
  return "General check-in";
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "date not available";
}
