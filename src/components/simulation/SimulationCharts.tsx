import Link from "next/link";
import type { ReactNode } from "react";

export interface TrendPoint {
  readonly label: string;
  readonly value: number | null;
  readonly detail?: string;
  readonly href?: string;
}

export function TrendChart({ title, unit, points, precision = 0 }: { readonly title: string; readonly unit: string; readonly points: readonly TrendPoint[]; readonly precision?: number }) {
  const values = points.flatMap((point) => point.value !== null && Number.isFinite(point.value) ? [point.value] : []);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = Math.max(max - min, 1);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length <= 1 ? 50 : 7 + (index * 86) / (points.length - 1),
    y: point.value === null ? null : 72 - ((point.value - min) / span) * 58,
  }));
  return (
    <figure className="rounded-xl border border-slate-700/80 bg-slate-950/70 p-4 sm:p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        <span className="text-xs text-slate-400">{unit}</span>
      </figcaption>
      <svg className="mt-4 h-56 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${title}; ${values.length} eligible values of ${points.length} records.`}>
        <title>{title}</title>
        <desc>{values.length ? `Values range from ${min.toFixed(precision)} to ${max.toFixed(precision)} ${unit}.` : "No eligible values are available for this measure."} Missing values are shown as gaps.</desc>
        {[14, 43, 72].map((y) => <line key={y} x1="4" x2="96" y1={y} y2={y} stroke="#26354b" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />)}
        {coordinates.slice(0, -1).map((point, index) => {
          const next = coordinates[index + 1];
          if (point.y === null || next?.y === null || next === undefined) return null;
          return <line key={`${point.label}-${next.label}`} x1={point.x} y1={point.y} x2={next.x} y2={next.y} stroke="#5ee7f4" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
        })}
        {coordinates.map((point) => point.y === null ? <g key={point.label}><circle cx={point.x} cy="89" r="2.2" fill="#64748b" /><text x={point.x} y="85" textAnchor="middle" fill="#94a3b8" fontSize="3.5">n/a</text></g> : <circle key={point.label} cx={point.x} cy={point.y} r="2.4" fill="#082f49" stroke="#67e8f9" strokeWidth="1.5" vectorEffect="non-scaling-stroke"><title>{`${point.label}: ${point.value?.toFixed(precision)} ${unit}`}</title></circle>)}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        {coordinates.map((point) => <div key={point.label} className="min-w-0 border-l border-slate-700 pl-2 text-[11px] leading-4"><span className="block truncate text-slate-400">{point.label}</span><span className="font-mono tabular-nums text-slate-200">{point.value === null ? "Not eligible" : `${point.value.toFixed(precision)} ${unit}`}</span>{point.href && <Link href={point.href} className="mt-1 inline-flex text-[10px] text-cyan-300 underline decoration-slate-700 underline-offset-4">Inspect source</Link>}</div>)}
      </div>
      <details className="mt-4 rounded-lg border border-slate-800 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-cyan-200">View data table</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">{title} underlying values</caption><thead><tr className="border-b border-slate-700 text-slate-400"><th className="py-2 pr-4">Record</th><th className="py-2 pr-4">Value</th><th className="py-2">Traceability</th></tr></thead><tbody>{points.map((point) => <tr key={point.label} className="border-b border-slate-800/80"><th scope="row" className="py-2 pr-4 font-medium text-slate-200">{point.label}</th><td className="py-2 pr-4 font-mono">{point.value === null ? "Not eligible" : `${point.value.toFixed(precision)} ${unit}`}</td><td className="py-2 text-slate-400">{point.detail ?? "See source record"}</td></tr>)}</tbody></table></div>
      </details>
    </figure>
  );
}

export function TrajectoryPlot({ title, children, points, origin, target }: { readonly title: string; readonly children?: ReactNode; readonly points: readonly { readonly x: number; readonly y: number }[]; readonly origin: { readonly x: number; readonly y: number }; readonly target: { readonly x: number; readonly y: number } }) {
  const pointString = points.map(({ x, y }) => `${x},${y}`).join(" ");
  return (
    <figure className="rounded-xl border border-slate-700/80 bg-slate-950/70 p-4">
      <figcaption className="text-sm font-semibold text-slate-100">{title}</figcaption>
      <svg className="mt-4 aspect-[4/3] w-full" viewBox="250 150 300 300" role="img" aria-label={`${title}, raw recorded cursor trajectory`}>
        <title>{title}</title>        <desc>Raw synthetic trajectory samples plotted from the explicitly recorded actual start coordinate toward the recorded target. Values are unchanged from the fixture.</desc>
        <circle cx={400} cy={300} r={120} fill="none" stroke="#26354b" strokeDasharray="3 5" />
        <line x1={origin.x} y1={origin.y} x2={target.x} y2={target.y} stroke="#64748b" strokeDasharray="5 5" />
        {points.length > 1 && <polyline points={pointString} fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
        <circle cx={origin.x} cy={origin.y} r={6} fill="#082f49" stroke="#67e8f9" strokeWidth="2"><title>{`Actual recorded start: x ${origin.x.toFixed(2)}, y ${origin.y.toFixed(2)}`}</title></circle>
        <circle cx={target.x} cy={target.y} r={6} fill="#713f12" stroke="#fbbf24" strokeWidth="2"><title>{`Recorded target: x ${target.x.toFixed(2)}, y ${target.y.toFixed(2)}`}</title></circle>
        {points.map((point, index) => <circle key={`${index}-${point.x}-${point.y}`} cx={point.x} cy={point.y} r={3} fill="#22d3ee"><title>{`Raw sample ${index + 1}: x ${point.x.toFixed(2)}, y ${point.y.toFixed(2)}`}</title></circle>)}
      </svg>
      <p className="mt-2 text-xs leading-5 text-slate-400">Start, target, and trajectory points are the recorded coordinates. The dotted start-to-target line is a visual reference, not a derived score.</p>
      {children}
    </figure>
  );
}
