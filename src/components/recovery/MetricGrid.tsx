import {
  formatRecoveryDate,
  formatRecoveryMetricValue,
  formatRecoverySignedValue,
  formatSessionId,
  measurementProtocolShortLabel,
  type RecoveryMetricView,
} from "@/lib/analytics/recovery-dashboard";
import type { RecoveryMetric, RecoveryObservation } from "@/types/recovery";
import { Badge } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function MetricGrid({
  current,
  metricViews,
  focusMetric,
  onFocusMetric,
}: {
  readonly current: RecoveryObservation;
  readonly metricViews: readonly RecoveryMetricView[];
  readonly focusMetric: RecoveryMetric;
  readonly onFocusMetric: (metric: RecoveryMetric) => void;
}) {
  return (
    <RecoverySection
      id="recovery-metrics"
      eyebrow="Performance metrics"
      title="Eight separate descriptive metrics"
      description={
        <>
          Each metric is reported independently; there is no composite recovery or readiness score. Difference is always <span className="font-medium text-slate-800">current − reference</span>. A positive or negative sign is a mathematical direction only, not an improvement or deterioration label.
        </>
      }
      actions={<p className="text-xs text-slate-500">Observation: {formatRecoveryDate(current.completedAt)}</p>}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {metricViews.map((view) => (
          <MetricCard
            key={view.metric}
            view={view}
            current={current}
            focused={view.metric === focusMetric}
            onFocusMetric={onFocusMetric}
          />
        ))}
      </div>
    </RecoverySection>
  );
}

function MetricCard({
  view,
  current,
  focused,
  onFocusMetric,
}: {
  readonly view: RecoveryMetricView;
  readonly current: RecoveryObservation;
  readonly focused: boolean;
  readonly onFocusMetric: (metric: RecoveryMetric) => void;
}) {
  const currentValue = view.currentValue?.eligible ? view.currentValue.value : null;
  const referenceValue = view.comparisonAvailable && view.referenceValue?.eligible ? view.referenceValue.value : null;
  const deltaValue = view.delta?.comparisonValid ? view.delta.change : null;
  const eligibleTrials = view.currentValue?.eligibleTrialCount ?? 0;
  const totalTrials = view.currentValue?.totalTrialCount ?? 0;

  return (
    <article
      aria-labelledby={`metric-${view.metric}`}
      className={`rounded-xl border p-4 transition-colors ${focused ? "border-cyan-500 bg-cyan-50/40 ring-2 ring-cyan-100" : "border-slate-200 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`metric-${view.metric}`} className="text-sm font-semibold text-slate-950">{view.presentation.label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{view.presentation.description}</p>
        </div>
        <Badge tone={view.comparisonAvailable ? "accent" : "warning"}>
          {view.comparisonAvailable ? "Comparison available" : "Unavailable"}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Current</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-950">{formatRecoveryMetricValue(currentValue, view.presentation.precision)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Reference</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{formatRecoveryMetricValue(referenceValue, view.presentation.precision)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Difference</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-cyan-800">{formatRecoverySignedValue(deltaValue, view.presentation)}</dd>
        </div>
      </dl>

      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        Unit: <span className="font-medium text-slate-700">{view.presentation.unitLabel}</span> · difference is current − reference
      </p>

      <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-[11px] leading-5 text-slate-500 sm:grid-cols-2">
        <p><span className="font-medium text-slate-600">Eligible trials:</span> {eligibleTrials} / {totalTrials}</p>
        <p><span className="font-medium text-slate-600">Protocol:</span> {measurementProtocolShortLabel(current.measurementProtocolVersion)}</p>
        <p className="sm:col-span-2">
          <span className="font-medium text-slate-600">Reference:</span>{" "}
          {view.referenceSessionId
            ? <>{formatRecoveryDate(view.referenceCompletedAt)} · <span className="font-mono">{formatSessionId(view.referenceSessionId)}</span> · {measurementProtocolShortLabel(view.referenceProtocolVersion)}</>
            : "No protocol-compatible reference session"}
        </p>
      </div>

      {view.explanation && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-900">{view.explanation}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {view.referenceSessionId && !view.referenceCompatible && <Badge tone="warning">Reference not comparable</Badge>}
          {view.legacyTimingOnly && <Badge tone="warning">Legacy timing only</Badge>}
          {current.dataQuality.totalTrials > 0 && eligibleTrials < totalTrials && (
            <Badge tone="quiet">{totalTrials - eligibleTrials} trial{totalTrials - eligibleTrials === 1 ? "" : "s"} not eligible</Badge>
          )}
        </div>
        <button
          type="button"
          onClick={() => onFocusMetric(view.metric)}
          aria-pressed={focused}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-cyan-600 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          {focused ? "Shown in trend" : "View trend"}
        </button>
      </div>
    </article>
  );
}
