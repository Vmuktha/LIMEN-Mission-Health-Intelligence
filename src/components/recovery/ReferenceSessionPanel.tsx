import {
  formatRecoveryDate,
  formatRecoveryDateTime,
  formatSessionId,
  measurementProtocolShortLabel,
  type RecoveryMetricView,
  type RecoveryObservationOption,
  type RecoveryReferenceMode,
  type RecoveryReferenceOption,
} from "@/lib/analytics/recovery-dashboard";
import type { RecoveryObservation } from "@/types/recovery";
import { Badge, Notice } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function ReferenceSessionPanel({
  current,
  currentOptions,
  referenceOptions,
  explicitReferenceSessionId,
  referenceMode,
  metricViews,
  onSelectCurrent,
  onSelectReference,
}: {
  readonly current: RecoveryObservation;
  readonly currentOptions: readonly RecoveryObservationOption[];
  readonly referenceOptions: readonly RecoveryReferenceOption[];
  readonly explicitReferenceSessionId: string | null;
  readonly referenceMode: RecoveryReferenceMode;
  readonly metricViews: readonly RecoveryMetricView[];
  readonly onSelectCurrent: (sessionId: string) => void;
  readonly onSelectReference: (sessionId: string | null) => void;
}) {
  const selectedOption = explicitReferenceSessionId
    ? referenceOptions.find((option) => option.sessionId === explicitReferenceSessionId) ?? null
    : null;

  return (
    <RecoverySection
      id="reference-session"
      eyebrow="Personal Reference Session"
      title="Choose the observation and its comparison reference"
      description="A Personal Reference Session is an explicit within-person comparison reference. It is not a clinical baseline, and earlier does not mean healthier. The default is the earliest completed observation eligible for each metric; LIMEN never chooses the best-performing or most recent session automatically."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Observation under review</span>
          <select
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            value={current.sessionId}
            onChange={(event) => onSelectCurrent(event.target.value)}
          >
            {currentOptions.map((option) => (
              <option key={option.sessionId} value={option.sessionId}>
                {option.label} · {option.protocolLabel} · {option.eligibleMetricCount}/8 metrics eligible
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Reference session</span>
          <select
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            value={explicitReferenceSessionId ?? ""}
            onChange={(event) => onSelectReference(event.target.value || null)}
          >
            <option value="">Automatic — earliest eligible per metric</option>
            {referenceOptions.map((option) => (
              <option key={option.sessionId} value={option.sessionId}>
                {option.label} · {option.protocolLabel} · {option.compatibleMetricCount}/8 comparable
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs leading-5 text-slate-500">
          Current observation: {formatRecoveryDateTime(current.completedAt)} · {measurementProtocolShortLabel(current.measurementProtocolVersion)} · assessment protocol {current.assessmentProtocolVersion || "unknown"}. The current observation is excluded from its own reference options.
        </p>
        {referenceMode === "explicit-override" && (
          <Notice tone="neutral">
            Explicit override. The selected session keeps its identity and protocol below. Metrics that cannot be compared with it stay unavailable with their reason; LIMEN never silently substitutes a different session.
          </Notice>
        )}
        {referenceMode === "self-reference-rejected" && (
          <Notice tone="warning">
            The current observation cannot be its own Personal Reference Session. Choose another session or return to automatic selection.
          </Notice>
        )}
        {referenceMode === "metric-specific-default" && (
          <Notice tone="neutral">
            Automatic mode resolves the reference separately for each metric: the earliest completed observation eligible for that metric and compatible with the current observation&apos;s measurement protocol. A session may be eligible for timing metrics but not for origin-sensitive metrics.
          </Notice>
        )}
        {selectedOption && !selectedOption.protocolCompatible && (
          <Notice tone="warning">
            {selectedOption.protocolExplanation} The explicit selection is retained, but incompatible metrics remain unavailable rather than being silently compared.
          </Notice>
        )}
      </div>

      {referenceOptions.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Candidate reference sessions</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Every candidate shows how many metrics it could be compared with and why the others are unavailable. Select a candidate to use it as the explicit reference.
          </p>
          <ul className="mt-3 space-y-2">
            {referenceOptions.map((option) => (
              <li key={option.sessionId} className="rounded-lg border border-slate-200">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs text-slate-700">
                    <span className="font-medium text-slate-900">{formatRecoveryDate(option.completedAt)}</span>
                    <span className="font-mono text-[11px] text-slate-500">{formatSessionId(option.sessionId)}</span>
                    <span>{option.protocolLabel}</span>
                    <Badge tone={option.compatibleMetricCount > 0 ? "accent" : "warning"}>{option.compatibleMetricCount}/8 comparable</Badge>
                    <span className="text-slate-500">{option.eligibleMetricCount}/8 eligible in that session</span>
                    {option.protocolCompatible
                      ? <span className="text-slate-500">Protocol compatible with the current observation</span>
                      : <span className="text-amber-800">{option.protocolExplanation}</span>}
                  </summary>
                  <div className="border-t border-slate-100 px-3 py-3">
                    <dl className="grid gap-1.5 text-[11px] leading-5 sm:grid-cols-2">
                      {option.metricEligibility.map((metric) => (
                        <div key={metric.metric} className="flex flex-wrap items-baseline gap-x-2">
                          <dt className="font-medium text-slate-700">{metric.label}:</dt>
                          <dd className={metric.eligible ? "text-cyan-800" : "text-amber-900"}>
                            {metric.eligible ? "eligible" : metric.reason}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onSelectReference(option.sessionId)}
                        disabled={explicitReferenceSessionId === option.sessionId}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-cyan-600 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50"
                      >
                        {explicitReferenceSessionId === option.sessionId ? "Selected as reference" : "Use as reference"}
                      </button>
                      <span className="text-[11px] text-slate-500">Measurement validity: {option.measurementValidityLabel}</span>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="pb-2 text-left text-xs text-slate-500">
            Reference resolution for each metric. A missing reference is shown with its reason; no fallback value is substituted.
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-4 font-medium">Metric</th>
              <th scope="col" className="py-2 pr-4 font-medium">Reference session</th>
              <th scope="col" className="py-2 pr-4 font-medium">Protocol</th>
              <th scope="col" className="py-2 font-medium">Comparison status</th>
            </tr>
          </thead>
          <tbody>
            {metricViews.map((view) => (
              <tr key={view.metric} className="border-b border-slate-100 align-top last:border-b-0">
                <th scope="row" className="py-2.5 pr-4 font-medium text-slate-800">{view.presentation.label}</th>
                <td className="py-2.5 pr-4 text-slate-600">
                  {view.referenceSessionId
                    ? <>{formatRecoveryDate(view.referenceCompletedAt)} <span className="font-mono text-xs text-slate-500">{formatSessionId(view.referenceSessionId)}</span></>
                    : "No protocol-compatible reference"}
                </td>
                <td className="py-2.5 pr-4 text-slate-600">
                  {measurementProtocolShortLabel(view.referenceProtocolVersion)}
                  {view.referenceAssessmentProtocolVersion && (
                    <span className="block text-[11px] text-slate-500">assessment protocol {view.referenceAssessmentProtocolVersion}</span>
                  )}
                </td>
                <td className="py-2.5">
                  {view.comparisonAvailable ? (
                    <Badge tone="accent">Available</Badge>
                  ) : (
                    <span className="block">
                      <Badge tone="warning">{view.referenceStatus === "resolved" ? "Not comparable" : "Unavailable"}</Badge>
                      <span className="mt-1 block text-xs leading-5 text-amber-900">{view.referenceExplanation ?? view.explanation ?? "Comparison unavailable."}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <p className="font-medium text-slate-700">Why a session can be ineligible</p>
        <p className="mt-1">Eligibility is metric-specific. Legacy sessions may supply timing values but not origin-sensitive values; a session with no eligible trials for a metric cannot serve as its reference. Comparisons also require the same measurement protocol and assessment protocol version.</p>
      </div>
    </RecoverySection>
  );
}
