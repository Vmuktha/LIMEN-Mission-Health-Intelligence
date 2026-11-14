import {
  buildRecoveryChartGeometry,
  buildRecoveryChartPointLabel,
  formatRecoveryChartValue,
  recoveryChartProtocolColor,
} from "@/lib/analytics/recovery-chart";
import {
  formatRecoveryDate,
  formatRecoveryShortDate,
  measurementProtocolShortLabel,
  RECOVERY_METRIC_PRESENTATIONS,
  recoveryMetricPresentation,
  type RecoveryMetricPresentation,
  type RecoveryTrendSeries,
} from "@/lib/analytics/recovery-dashboard";
import type { RecoveryMetric } from "@/types/recovery";
import { Badge, Notice } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function RecoveryTrends({
  series,
  onSelectMetric,
}: {
  readonly series: RecoveryTrendSeries;
  readonly onSelectMetric: (metric: RecoveryMetric) => void;
}) {
  const presentation = recoveryMetricPresentation(series.metric);
  return (
    <RecoverySection
      id="recovery-trends"
      eyebrow="Longitudinal performance"
      title="Chronological metric observations"
      description="Values are plotted only where a metric is eligible. Each measurement protocol is drawn as a separate series; incompatible protocol versions and missing observations break the line rather than being connected, interpolated, or replaced with zero. Connecting lines are visual guides only."
      actions={
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Metric
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            value={series.metric}
            onChange={(event) => onSelectMetric(event.target.value as RecoveryMetric)}
          >
            {RECOVERY_METRIC_PRESENTATIONS.map((item) => (
              <option key={item.metric} value={item.metric}>{item.label}</option>
            ))}
          </select>
        </label>
      }
    >
      <TrendChart series={series} presentation={presentation} />
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Measurement protocol</span>
        {series.protocols.length === 0 ? <span>No eligible points</span> : series.protocols.map((protocol) => (
          <span key={protocol ?? "unknown"} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-5 rounded-full" style={{ backgroundColor: recoveryChartProtocolColor(protocol) }} />
            {measurementProtocolShortLabel(protocol)}
          </span>
        ))}
        <span className="ml-auto">Unit: {presentation.unitLabel}</span>
      </div>

      {series.points.length === 0 && (
        <Notice tone="warning">No completed observation has an eligible {presentation.label.toLowerCase()} value. The chart is empty rather than filled with inferred or zero values.</Notice>
      )}
      {series.points.length === 1 && (
        <Notice tone="neutral">Only one eligible observation is available, so no trend line is drawn. Adding an observation does not imply a recovery trajectory.</Notice>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <caption className="pb-2 text-left text-xs text-slate-500">
            Every completed observation is listed chronologically. A gap means the metric was not eligible; it is not a zero measurement.
          </caption>
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-2 pr-4 font-medium">Completed (UTC)</th>
              <th scope="col" className="py-2 pr-4 font-medium">{presentation.label} ({presentation.unitLabel})</th>
              <th scope="col" className="py-2 pr-4 font-medium">Eligible / total</th>
              <th scope="col" className="py-2 pr-4 font-medium">Protocol</th>
              <th scope="col" className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {series.observations.map((observation) => {
              const point = series.points.find((candidate) => candidate.observation.sessionId === observation.sessionId) ?? null;
              return (
                <tr key={observation.sessionId} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-2 pr-4 text-slate-700">{formatRecoveryDate(observation.completedAt)}</td>
                  <td className="py-2 pr-4 font-medium tabular-nums text-slate-900">{point ? formatRecoveryChartValue(point.value, presentation.precision) : "Unavailable"}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-600">{point ? `${point.eligibleTrialCount} / ${point.totalTrialCount}` : "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{measurementProtocolShortLabel(observation.measurementProtocolVersion)}</td>
                  <td className="py-2">{point ? <Badge tone="accent">Eligible</Badge> : <Badge tone="warning">Gap — not eligible</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </RecoverySection>
  );
}

function TrendChart({ series, presentation }: { readonly series: RecoveryTrendSeries; readonly presentation: RecoveryMetricPresentation }) {
  const geometry = buildRecoveryChartGeometry(series);
  const description = series.points.length === 0
    ? `No eligible ${presentation.label.toLowerCase()} values.`
    : `${presentation.label} across ${series.points.length} eligible observation${series.points.length === 1 ? "" : "s"} and ${series.protocols.length} measurement protocol group${series.protocols.length === 1 ? "" : "s"}. Missing observations are gaps.`;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2">
      <svg
        role="img"
        aria-label={description}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="h-auto w-full min-w-[560px]"
      >
        <title>{presentation.label} trend</title>
        <desc>{description}</desc>
        {geometry.ticks.map((tick) => (
          <g key={tick.value}>
            <line x1={geometry.padding.left} x2={geometry.width - geometry.padding.right} y1={tick.y} y2={tick.y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={geometry.padding.left - 10} y={tick.y + 4} textAnchor="end" fontSize={11} fill="#64748b">{formatRecoveryChartValue(tick.value, presentation.precision)}</text>
          </g>
        ))}
        {geometry.zeroLineY !== null && (
          <line
            x1={geometry.padding.left}
            x2={geometry.width - geometry.padding.right}
            y1={geometry.zeroLineY}
            y2={geometry.zeroLineY}
            stroke="#94a3b8"
            strokeWidth={1.25}
            strokeDasharray="4 4"
          />
        )}
        <line x1={geometry.padding.left} x2={geometry.padding.left} y1={geometry.padding.top} y2={geometry.height - geometry.padding.bottom} stroke="#cbd5e1" />
        <line x1={geometry.padding.left} x2={geometry.width - geometry.padding.right} y1={geometry.height - geometry.padding.bottom} y2={geometry.height - geometry.padding.bottom} stroke="#cbd5e1" />
        {geometry.xIndices.map((index) => {
          const observation = series.observations[index];
          const x = geometry.xPositions[index];
          if (!observation || x === undefined) return null;
          return (
            <g key={observation.sessionId}>
              <line x1={x} x2={x} y1={geometry.height - geometry.padding.bottom} y2={geometry.height - geometry.padding.bottom + 4} stroke="#cbd5e1" />
              <text x={x} y={geometry.height - geometry.padding.bottom + 18} textAnchor="middle" fontSize={11} fill="#64748b">{formatRecoveryShortDate(observation.completedAt)}</text>
            </g>
          );
        })}
        {geometry.segments.map((segment, segmentIndex) => {
          const color = recoveryChartProtocolColor(segment.protocolVersion);
          const polyline = segment.points.map((point) => `${point.x},${point.y}`).join(" ");
          return (
            <g key={`${segment.protocolVersion ?? "unknown"}-${segmentIndex}`}>
              {segment.points.length >= 2 && <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {segment.points.map((point) => (
                <circle key={point.point.observation.sessionId} cx={point.x} cy={point.y} r={3.75} fill="#ffffff" stroke={color} strokeWidth={2}>
                  <title>{buildRecoveryChartPointLabel(point.point, presentation)}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {geometry.domain !== null && (
          <text x={geometry.padding.left} y={14} fontSize={11} fill="#475569">{presentation.unitLabel}</text>
        )}
      </svg>
    </div>
  );
}
