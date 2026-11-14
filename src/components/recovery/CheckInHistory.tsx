import {
  formatRecoveryDateTime,
  formatSelfReportScore,
  formatSessionId,
  type RecoveryCheckInHistoryEntry,
} from "@/lib/analytics/recovery-dashboard";
import { Badge, Notice } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function CheckInHistory({ entries }: { readonly entries: readonly RecoveryCheckInHistoryEntry[] }) {
  return (
    <RecoverySection
      id="check-in-history"
      eyebrow="Check-in history"
      title="Subjective self-reports, preserved chronologically"
      description="These are 0–10 subjective self-reports, not objective sensorimotor measurements. An unanswered item stays unanswered and is never converted to zero. Association requires an explicit completed-session identifier; timestamp proximity is never used."
    >
      {entries.length === 0 ? (
        <Notice tone="neutral">No check-in records exist in this browser-local participant profile. No check-ins are simulated or inferred.</Notice>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.checkIn.checkInId} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{formatRecoveryDateTime(entry.checkIn.recordedAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Context: {entry.contextLabel}
                    {entry.isAssociated && entry.associatedSessionId
                      ? <> · Session <span className="font-mono">{formatSessionId(entry.associatedSessionId)}</span>{entry.associatedSessionCompletedAt ? ` · completed ${formatRecoveryDateTime(entry.associatedSessionCompletedAt)}` : ""}</>
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={entry.isPostAssessment ? "accent" : "neutral"}>{entry.contextLabel}</Badge>
                  <Badge tone={entry.isAssociated ? "accent" : "warning"}>{entry.isAssociated ? "Explicitly associated" : "Unassociated"}</Badge>
                </div>
              </div>

              {!entry.isAssociated && (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-900">
                  {entry.linkLabel}{entry.linkExplanation ? `: ${entry.linkExplanation}` : ". It remains unassociated and is never linked by timestamp proximity."}
                </p>
              )}

              <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {entry.scores.map((score) => (
                  <div key={score.field} className="border-t border-slate-100 pt-2">
                    <dt className="text-xs font-medium text-slate-700">{score.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-950">{formatSelfReportScore(score.value)}{score.value !== null ? " / 10" : ""}</dd>
                    <dd className="text-[11px] leading-4 text-slate-500">{score.scale}</dd>
                  </div>
                ))}
              </dl>

              {entry.checkIn.freeTextNote && (
                <blockquote className="mt-4 border-l-2 border-slate-300 pl-3 text-xs leading-5 text-slate-600">
                  <span className="font-medium text-slate-700">Participant note:</span> {entry.checkIn.freeTextNote}
                </blockquote>
              )}
            </li>
          ))}
        </ol>
      )}
    </RecoverySection>
  );
}
