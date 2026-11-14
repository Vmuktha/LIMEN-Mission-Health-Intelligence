import {
  ALIGNMENT_CATEGORY_LABELS,
  formatRecoveryDateTime,
  formatRecoverySignedValue,
  formatSessionId,
  recoveryMetricPresentation,
  type RecoveryAlignmentCategory,
  type RecoveryAlignmentModel,
  type RecoveryAlignmentRow,
  type RecoveryMetricPresentation,
} from "@/lib/analytics/recovery-dashboard";
import type { RecoveryObservation } from "@/types/recovery";
import { Badge, Notice } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function AlignmentSection({
  alignment,
  current,
}: {
  readonly alignment: RecoveryAlignmentModel | null;
  readonly current: RecoveryObservation;
}) {
  const presentation = alignment ? recoveryMetricPresentation(alignment.metric) : null;
  return (
    <RecoverySection
      id="alignment"
      eyebrow="Performance–self-report alignment"
      title="How performance and self-report changed together"
      description={
        <>
          This section compares the metric selected in the <span className="font-medium text-slate-800">Longitudinal performance</span> section with explicitly associated <span className="font-medium text-slate-800">post-assessment</span> check-ins from the current and reference sessions. It describes co-observation only: categories are mathematical directions, not improvement, deterioration, readiness, causation, or a discrepancy score.
        </>
      }
    >
      {alignment === null || presentation === null ? (
        <Notice tone="warning">No aligned comparison is available for this observation.</Notice>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Performance metric</dt>
                <dd className="mt-1 font-medium text-slate-900">{presentation.label}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Performance change</dt>
                <dd className="mt-1 font-semibold tabular-nums text-slate-900">
                  {formatRecoverySignedValue(alignment.performanceChange, presentation)}
                  <span className="ml-1 text-xs font-normal text-slate-500">&nbsp;{presentation.unitLabel}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Current post-check-ins</dt>
                <dd className="mt-1 font-semibold tabular-nums text-slate-900">{alignment.currentCheckInCount}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference post-check-ins</dt>
                <dd className="mt-1 font-semibold tabular-nums text-slate-900">{alignment.referenceCheckInCount}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Current observation {formatRecoveryDateTime(current.completedAt)}
              {alignment.referenceSessionId ? <> · reference session <span className="font-mono">{formatSessionId(alignment.referenceSessionId)}</span></> : ""}.
            </p>
          </div>

          {alignment.status !== "available" ? (
            <div className="mt-4">
              <Notice tone="warning">{alignment.explanation ?? "The alignment comparison is unavailable."}</Notice>
            </div>
          ) : (
            <AlignmentGroups rows={alignment.rows} presentation={presentation} />
          )}

          <p className="mt-4 text-xs leading-5 text-slate-500">
            {alignment.ignoredCheckInCount} check-in{alignment.ignoredCheckInCount === 1 ? " was" : "s were"} not used because they are pre-assessment, general, unassociated, or attached to a different session. Pre-assessment and general check-ins are never treated as post-assessment alignment observations.
          </p>
        </>
      )}
    </RecoverySection>
  );
}

function AlignmentGroups({ rows, presentation }: { readonly rows: readonly RecoveryAlignmentRow[]; readonly presentation: RecoveryMetricPresentation }) {
  const groups = groupRows(rows);
  return (
    <div className="mt-4 space-y-5">
      <p className="text-xs leading-5 text-slate-500">Each explicitly associated check-in pair is preserved separately. Multiple check-ins are not averaged or collapsed into a score.</p>
      {groups.map((group) => {
        const first = group.rows[0];
        return (
          <section key={group.key} aria-label={`Check-in comparison ${first.currentCheckInId} and ${first.referenceCheckInId}`} className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs leading-5 text-slate-600">
              <p><span className="font-medium text-slate-800">Current post-check-in:</span> {formatRecoveryDateTime(first.currentRecordedAt)} · <span className="font-mono">{formatSessionId(first.currentCheckInId)}</span></p>
              <p><span className="font-medium text-slate-800">Reference post-check-in:</span> {formatRecoveryDateTime(first.referenceRecordedAt)} · <span className="font-mono">{formatSessionId(first.referenceCheckInId)}</span></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-3 py-2 font-medium">Self-report item</th>
                    <th scope="col" className="px-3 py-2 font-medium">Current</th>
                    <th scope="col" className="px-3 py-2 font-medium">Reference</th>
                    <th scope="col" className="px-3 py-2 font-medium">Self-report change</th>
                    <th scope="col" className="px-3 py-2 font-medium">Performance change ({presentation.unitLabel})</th>
                    <th scope="col" className="px-3 py-2 font-medium">Observed direction</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.rowId} className="border-b border-slate-100 align-top last:border-b-0">
                      <th scope="row" className="px-3 py-2.5 font-medium text-slate-800">
                        {row.scoreLabel}
                        <span className="block text-[11px] font-normal text-slate-500">{row.scale}</span>
                      </th>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">{row.currentScore === null ? "Not answered" : `${row.currentScore} / 10`}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">{row.referenceScore === null ? "Not answered" : `${row.referenceScore} / 10`}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">{formatSignedScoreChange(row.selfReportChange)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700">{formatRecoverySignedValue(row.performanceChange, presentation)}</td>
                      <td className="px-3 py-2.5">
                        <AlignmentPill category={row.category} />
                        {row.explanation && <p className="mt-1 max-w-[240px] text-[11px] leading-4 text-slate-500">{row.explanation}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AlignmentPill({ category }: { readonly category: RecoveryAlignmentCategory }) {
  const tone = category === "insufficient-data" ? "quiet" : category === "opposite-directions" ? "warning" : "accent";
  const arrow = category === "both-increased" ? "↑↑ " : category === "both-decreased" ? "↓↓ " : category === "opposite-directions" ? "↑↓ " : "";
  return <Badge tone={tone}>{arrow}{ALIGNMENT_CATEGORY_LABELS[category]}</Badge>;
}

function groupRows(rows: readonly RecoveryAlignmentRow[]): readonly { readonly key: string; readonly rows: readonly RecoveryAlignmentRow[] }[] {
  const groups = new Map<string, RecoveryAlignmentRow[]>();
  for (const row of rows) {
    const key = `${row.currentCheckInId}\u0000${row.referenceCheckInId}`;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }
  return [...groups.entries()].map(([key, groupRowsForPair]) => ({ key, rows: groupRowsForPair }));
}

function formatSignedScoreChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Unavailable";
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
}
