"use client";
import { AppShell } from '@/components/layout/AppShell';
import { useEffect, useState } from 'react';
import { listAssessmentSessions } from '@/lib/storage/assessment-storage';
import { listCheckIns } from '@/lib/storage/checkin-storage';
import { listMissionContexts } from '@/lib/storage/mission-storage';
import { buildSignalConcordance } from '@/lib/concordance/signal-concordance';
import { loadRecoveryDataset } from '@/lib/analytics/recovery';
import type { AssessmentSession } from '@/types/assessment';
import type { SymptomCheckInRecord } from '@/types/checkin';
import type { MissionContext } from '@/types/mission-context';
import type { SignalConcordanceResult } from '@/types/concordance';

export default function ConcordancePage() {
  const [sessions, setSessions] = useState<readonly AssessmentSession[]>([]);
  const [checkIns, setCheckIns] = useState<readonly SymptomCheckInRecord[]>([]);
  const [contexts, setContexts] = useState<readonly MissionContext[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [referenceSessionId, setReferenceSessionId] = useState('');
  const [currentCheckInId, setCurrentCheckInId] = useState('');
  const [referenceCheckInId, setReferenceCheckInId] = useState('');
  const [missionContextId, setMissionContextId] = useState('');
  const [report, setReport] = useState<SignalConcordanceResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    listAssessmentSessions().then((r) => r.ok && setSessions(r.value));
    listCheckIns().then((r) => r.ok && setCheckIns(r.value));
    listMissionContexts().then((r) => r.ok && setContexts(r.value));
  }, []);

  async function generate() {
    setError('');
    setReport(null);
    if (!currentSessionId || !referenceSessionId) {
      setError('Both current and reference assessment sessions must be selected.');
      return;
    }
    try {
      const datasetResult = await loadRecoveryDataset();
      if (!datasetResult.ok) {
        setError(datasetResult.error.message);
        return;
      }
      const participant = datasetResult.value.participants.find((p) =>
        p.observations.some((o) => o.sessionId === currentSessionId),
      );
      if (!participant) {
        setError('No participant observation profile found for the selected current session.');
        return;
      }
      if (!participant.observations.some((o) => o.sessionId === referenceSessionId)) {
        setError('The selected reference session does not belong to the same participant profile as the current session.');
        return;
      }
      const selectedContext = contexts.find((c) => c.id === missionContextId) ?? null;
      const result = buildSignalConcordance({
        participant,
        currentSessionId,
        referenceSessionId,
        checkIns,
        currentCheckInId: currentCheckInId || undefined,
        referenceCheckInId: referenceCheckInId || undefined,
        missionContext: selectedContext,
      });
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <AppShell>
      <section className="p-4">
        <h1 className="text-2xl font-bold mb-4">Signal Concordance</h1>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Current assessment session</label>
            <select
              value={currentSessionId}
              onChange={(e) => setCurrentSessionId(e.target.value)}
              className="w-full border rounded"
            >
              <option value="">-- select --</option>
              {sessions.map((s) => (
                <option key={s.metadata.sessionId} value={s.metadata.sessionId}>
                  {s.metadata.sessionId} ({s.metadata.completedAt ? new Date(s.metadata.completedAt).toLocaleDateString() : 'incomplete'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Reference assessment session</label>
            <select
              value={referenceSessionId}
              onChange={(e) => setReferenceSessionId(e.target.value)}
              className="w-full border rounded"
            >
              <option value="">-- select --</option>
              {sessions.map((s) => (
                <option key={s.metadata.sessionId} value={s.metadata.sessionId}>
                  {s.metadata.sessionId} ({s.metadata.completedAt ? new Date(s.metadata.completedAt).toLocaleDateString() : 'incomplete'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Current check‑in (optional)</label>
            <select
              value={currentCheckInId}
              onChange={(e) => setCurrentCheckInId(e.target.value)}
              className="w-full border rounded"
            >
              <option value="">-- none --</option>
              {checkIns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Reference check‑in (optional)</label>
            <select
              value={referenceCheckInId}
              onChange={(e) => setReferenceCheckInId(e.target.value)}
              className="w-full border rounded"
            >
              <option value="">-- none --</option>
              {checkIns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Mission context (optional)</label>
            <select
              value={missionContextId}
              onChange={(e) => setMissionContextId(e.target.value)}
              className="w-full border rounded"
            >
              <option value="">-- none --</option>
              {contexts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} – {c.phase}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={generate}
          className="mt-4 btn-primary"
        >
          Generate Concordance
        </button>
        {report && (
          <pre className="mt-4 bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(report, null, 2)}
          </pre>
        )}
      </section>
    </AppShell>
  );
}
