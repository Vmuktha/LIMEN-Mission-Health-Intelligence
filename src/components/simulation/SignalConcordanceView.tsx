"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { CHECK_IN_FIELDS } from "@/lib/checkin/record";
import type { SimulationAstronautProfile } from "@/lib/simulation/profiles";
import type { SimulationMissionEvent, SimulationMissionTransition } from "@/types/simulation";
import type { SimulationSessionAnalysis } from "@/lib/simulation/analysis";

const width = 920;
const height = 190;
const padding = { left: 62, right: 26, top: 18, bottom: 36 };
const plotWidth = width - padding.left - padding.right;
const plotHeight = height - padding.top - padding.bottom;
const missionMinDay = -7;
const missionMaxDay = 42;
const ticks = [-7, 0, 7, 14, 21, 28, 42];
const dateTimeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

type SignalId = "reaction" | "movement" | (typeof CHECK_IN_FIELDS)[number]["field"];
type SourcePoint = {
  readonly id: string;
  readonly signalId: SignalId;
  readonly label: string;
  readonly day: number;
  readonly value: number | null;
  readonly unit: string;
  readonly timestamp: string;
  readonly href: string;
  readonly sourceKind: "assessment" | "check-in";
  readonly phaseId: string;
  readonly eligibility: string;
  readonly calculation: string;
  readonly explicitAssociation?: string;
};
type EventPoint = { readonly id: string; readonly label: string; readonly day: number; readonly timestamp: string; readonly phaseId: string; readonly href: string; readonly kind: "Mission event" | "Phase transition" };

const signalMetadata: Readonly<Record<SignalId, { label: string; unit: string; color: string; source: "assessment" | "check-in" }>> = {
  reaction: { label: "Mean reaction time", unit: "ms", color: "#67e8f9", source: "assessment" },
  movement: { label: "Mean movement time", unit: "ms", color: "#a5b4fc", source: "assessment" },
  dizzinessOrDisorientation: { label: "Dizziness or disorientation", unit: "0–10", color: "#fbbf24", source: "check-in" },
  balanceOrCoordinationDifficulty: { label: "Balance or coordination difficulty", unit: "0–10", color: "#fb923c", source: "check-in" },
  nausea: { label: "Nausea", unit: "0–10", color: "#f472b6", source: "check-in" },
  visualDiscomfort: { label: "Visual discomfort", unit: "0–10", color: "#c4b5fd", source: "check-in" },
  fatigue: { label: "Fatigue", unit: "0–10", color: "#86efac", source: "check-in" },
  movementConfidence: { label: "Movement confidence", unit: "0–10", color: "#7dd3fc", source: "check-in" },
};

export function SignalConcordanceView({ profile, analysis }: { readonly profile: SimulationAstronautProfile; readonly analysis: readonly SimulationSessionAnalysis[] }) {
  const [selectedSignals, setSelectedSignals] = useState<readonly SignalId[]>(["reaction", "dizzinessOrDisorientation"]);
  const [selectedSource, setSelectedSource] = useState<SourcePoint | EventPoint | null>(null);
  const scenario = profile.scenario;
  const points = useMemo(() => buildSignalPoints(profile, analysis), [profile, analysis]);
  const events = useMemo(() => buildEventPoints(profile), [profile]);
  const lanes = selectedSignals.map((signalId) => ({ signalId, points: points.filter((point) => point.signalId === signalId) }));

  function toggleSignal(signalId: SignalId) {
    setSelectedSignals((current) => current.includes(signalId) ? current.filter((item) => item !== signalId) : [...current, signalId]);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ion">Analyse · individual evidence streams</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-glow sm:text-4xl">Signal Concordance</h2>
        <p className="mt-3 text-sm leading-6 text-glow-muted">Inspect instrumented task measurements and subjective check-ins along the same mission-day axis. Each signal keeps its own labelled scale; no composite, correlation, or causal estimate is calculated.</p>
      </header>
      <div className="rounded-control border border-amber-300/30 bg-amber-300/[0.06] px-4 py-3 text-xs leading-5 text-amber-100">Fictional source records only. Co-display is not evidence that one measure explains another. Check-in links to an assessment are shown only when the fixture records the exact session identifier.</div>
      <section aria-label="Select signals to display" className="rounded-panel border border-horizon/70 bg-hull/65 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-glow">Evidence streams</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(signalMetadata) as SignalId[]).map((signalId) => {
            const metadata = signalMetadata[signalId];
            const checked = selectedSignals.includes(signalId);
            return <label key={signalId} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs transition-colors ${checked ? "border-ion/55 bg-ion/10 text-glow" : "border-horizon/70 text-glow-muted hover:border-horizon"}`}><input type="checkbox" checked={checked} onChange={() => toggleSignal(signalId)} className="accent-cyan-300" /><span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: metadata.color }} />{metadata.label}<span className="font-mono text-glow-faint">{metadata.source === "assessment" ? "objective task" : "self-report"}</span></label>;
          })}
        </div>
      </section>
      <section aria-label="Aligned mission timeline visualization" className="flex flex-col gap-3">
        {lanes.length === 0 ? <p className="rounded-panel border border-dashed border-horizon p-6 text-sm text-glow-muted">Select at least one signal to inspect the aligned timeline.</p> : lanes.map(({ signalId, points: lanePoints }) => <SignalLane key={signalId} signalId={signalId} points={lanePoints} events={events} phases={scenario.phases} selectedSourceId={selectedSource?.id ?? ""} onSelectSource={setSelectedSource} />)}
      </section>
      <section aria-labelledby="concordance-source-heading" className="rounded-panel border border-horizon/70 bg-hull/65 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion">Source-level drill-down</p><h3 id="concordance-source-heading" className="mt-1 text-lg font-semibold text-glow">{selectedSource ? selectedSource.label : "Select a plotted point or event marker"}</h3></div><span className="rounded-full border border-amber-300/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">Simulation · not operational</span></div>
        {!selectedSource ? <p className="mt-3 text-sm text-glow-muted">Choose any point or milestone to inspect its timestamp, record identifier, eligibility, and explicit relationships.</p> : "sourceKind" in selectedSource ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <SourceDetail label="Record / provenance">{selectedSource.id} · synthetic fixture</SourceDetail>
            <SourceDetail label="Recorded at · UTC">{dateTimeFormat.format(new Date(selectedSource.timestamp))} · D{selectedSource.day >= 0 ? "+" : ""}{selectedSource.day.toFixed(2)}</SourceDetail>
            <SourceDetail label="Measure / value">{signalMetadata[selectedSource.signalId].label} · {selectedSource.value === null ? "Not eligible / unanswered" : `${selectedSource.value.toFixed(1)} ${selectedSource.unit}`}</SourceDetail>
            <SourceDetail label="Eligibility / calculation">{selectedSource.eligibility} · {selectedSource.calculation}</SourceDetail>
            <SourceDetail label="Explicit assessment association">{selectedSource.explicitAssociation ?? "No assessment-session relationship is recorded; timestamp proximity is not used."}</SourceDetail>
            <div className="flex items-end"><Link href={selectedSource.href} className="text-sm font-medium text-ion-soft underline underline-offset-4">Open underlying source record</Link></div>
          </dl>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <SourceDetail label="Record / type">{selectedSource.id} · {selectedSource.kind}</SourceDetail>
            <SourceDetail label="Recorded at · UTC">{dateTimeFormat.format(new Date(selectedSource.timestamp))} · D{selectedSource.day >= 0 ? "+" : ""}{selectedSource.day.toFixed(2)}</SourceDetail>
            <SourceDetail label="Explicit phase">{selectedSource.phaseId}</SourceDetail>
            <SourceDetail label="Association basis">The event or transition record explicitly names this phase; no assessment or check-in relation is inferred.</SourceDetail>
            <div className="flex items-end"><Link href={selectedSource.href} className="text-sm font-medium text-ion-soft underline underline-offset-4">Open event register</Link></div>
          </dl>
        )}
      </section>
      <p className="text-xs leading-5 text-glow-faint">Method: assessment values are recomputed from trial-level timestamps using the existing calculation functions; check-ins are plotted as separate 0–10 self-report values. Mission phase and events come from explicit fixture records. An unavailable value remains a gap and is never drawn as zero.</p>
    </div>
  );
}

function SignalLane({ signalId, points, events, phases, selectedSourceId, onSelectSource }: { readonly signalId: SignalId; readonly points: readonly SourcePoint[]; readonly events: readonly EventPoint[]; readonly phases: SimulationAstronautProfile["scenario"]["phases"]; readonly selectedSourceId: string; readonly onSelectSource: (source: SourcePoint | EventPoint) => void }) {
  const metadata = signalMetadata[signalId];
  const values = points.flatMap((point) => point.value === null ? [] : [point.value]);
  const fixedScale = metadata.source === "check-in";
  const min = fixedScale ? 0 : Math.max(0, Math.floor((Math.min(...values, 0) - 40) / 40) * 40);
  const max = fixedScale ? 10 : Math.ceil((Math.max(...values, 400) + 40) / 40) * 40;
  const x = (day: number) => padding.left + ((day - missionMinDay) / (missionMaxDay - missionMinDay)) * plotWidth;
  const y = (value: number) => padding.top + ((max - value) / (max - min || 1)) * plotHeight;
  const sortedPoints = [...points].sort((a, b) => a.day - b.day || Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const lines = sortedPoints.slice(1).flatMap((point, index) => {
    const previous = sortedPoints[index];
    if (!previous || previous.value === null || point.value === null) return [];
    return [{ from: previous, to: point }];
  });
  const axisTicks = fixedScale ? [0, 5, 10] : [min, Math.round((min + max) / 2), max];

  function selectOnKey(event: KeyboardEvent<SVGCircleElement>, point: SourcePoint) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectSource(point); }
  }

  return (
    <figure className="overflow-hidden rounded-panel border border-horizon/70 bg-hull/60">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-b border-horizon/50 px-4 py-3"><span className="text-sm font-semibold text-glow">{metadata.label}</span><span className="font-mono text-xs text-glow-muted">{metadata.source === "assessment" ? "instrumented assessment" : "subjective check-in"} · {metadata.unit} · independent axis</span></figcaption>
      <div className="overflow-x-auto p-2 sm:p-4">
        <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${metadata.label} plotted across mission day; select a point or milestone for source details.`} className="h-[190px] w-full min-w-[720px]">
          {phases.map((phase) => {
            const left = Math.max(missionMinDay, phase.relativeStartDay);
            const right = Math.min(missionMaxDay, phase.relativeEndDay);
            if (right <= left) return null;
            return <g key={phase.id}><rect x={x(left)} y={padding.top} width={x(right) - x(left)} height={plotHeight} fill="#67e8f9" opacity=".035"><title>{phase.label}</title></rect>{x(right) - x(left) >= 88 && <text x={(x(left) + x(right)) / 2} y={padding.top + 11} textAnchor="middle" fill="#96a8bd" fontSize="9">{phase.label}</text>}</g>;
          })}
          {axisTicks.map((tick) => <g key={tick}><line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} stroke="#53627a" strokeOpacity=".45" /><text x={padding.left - 9} y={y(tick) + 3} textAnchor="end" fill="#aab5c8" fontSize="10">{tick}</text></g>)}
          <text x={padding.left} y={12} fill="#c7d3e5" fontSize="10">{metadata.label} · {metadata.unit}</text>
          {events.map((event) => <g key={event.id} role="button" tabIndex={0} aria-label={`${event.kind}: ${event.label}, mission day ${event.day.toFixed(2)}; open source details`} onClick={() => onSelectSource(event)} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") { keyboardEvent.preventDefault(); onSelectSource(event); } }} className="cursor-pointer"><line x1={x(event.day)} x2={x(event.day)} y1={padding.top + 12} y2={padding.top + plotHeight} stroke="#fbbf24" strokeDasharray="3 4" strokeOpacity=".55" /><path d={`M ${x(event.day) - 4} ${padding.top + 13} L ${x(event.day) + 4} ${padding.top + 13} L ${x(event.day)} ${padding.top + 19} Z`} fill="#fbbf24"><title>{`${event.kind}: ${event.label} · ${dateTimeFormat.format(new Date(event.timestamp))}`}</title></path></g>)}
          {lines.map(({ from, to }) => <line key={`${from.id}:${to.id}`} x1={x(from.day)} y1={y(from.value!)} x2={x(to.day)} y2={y(to.value!)} stroke={metadata.color} strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
          {sortedPoints.map((point) => point.value === null ? <g key={point.id}><circle cx={x(point.day)} cy={padding.top + plotHeight - 2} r="3" fill="#64748b"><title>{`${point.label}: not eligible or unanswered · ${point.id}`}</title></circle></g> : <circle key={point.id} cx={x(point.day)} cy={y(point.value)} r={selectedSourceId === point.id ? 6 : 4} fill="#0c1724" stroke={metadata.color} strokeWidth={selectedSourceId === point.id ? 3 : 2} vectorEffect="non-scaling-stroke" role="button" tabIndex={0} aria-label={`${point.label}, ${point.value.toFixed(1)} ${point.unit}, day ${point.day.toFixed(2)}; select for source details`} onClick={() => onSelectSource(point)} onKeyDown={(keyboardEvent) => selectOnKey(keyboardEvent, point)} className="cursor-pointer focus:outline-none"><title>{`${point.label} · ${point.value.toFixed(1)} ${point.unit} · ${dateTimeFormat.format(new Date(point.timestamp))}`}</title></circle>)}
          {ticks.map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={padding.top + plotHeight} y2={padding.top + plotHeight + 4} stroke="#8793a7" /><text x={x(tick)} y={height - 9} textAnchor="middle" fill="#aab5c8" fontSize="10">{tick < 0 ? `D${tick}` : `D+${tick}`}</text></g>)}
          <text x={width - padding.right} y={height - 9} textAnchor="end" fill="#7c8da3" fontSize="9">Mission day from launch</text>
        </svg>
      </div>
      <details className="border-t border-horizon/50 px-4 py-3">
        <summary className="cursor-pointer text-xs font-medium text-ion-soft">Accessible data table · {points.length} records</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><caption className="sr-only">{metadata.label} source records across the selected fictional astronaut&apos;s mission timeline.</caption><thead><tr className="border-b border-horizon/70 text-glow-muted"><th scope="col" className="py-2 pr-3">Source record</th><th scope="col" className="py-2 pr-3">Mission day</th><th scope="col" className="py-2 pr-3">Value · {metadata.unit}</th><th scope="col" className="py-2 pr-3">Eligibility</th><th scope="col" className="py-2">Recorded at · UTC</th></tr></thead><tbody>{sortedPoints.map((point) => <tr key={point.id} className="border-b border-horizon/40"><th scope="row" className="py-2 pr-3 font-mono font-medium text-glow">{point.id}</th><td className="py-2 pr-3 font-mono">D{point.day >= 0 ? "+" : ""}{point.day.toFixed(2)}</td><td className="py-2 pr-3 font-mono">{point.value === null ? "Unavailable" : point.value.toFixed(1)}</td><td className="py-2 pr-3 text-glow-muted">{point.eligibility}</td><td className="py-2">{dateTimeFormat.format(new Date(point.timestamp))}</td></tr>)}</tbody></table></div>
      </details>
    </figure>
  );
}

function buildSignalPoints(profile: SimulationAstronautProfile, analysis: readonly SimulationSessionAnalysis[]): readonly SourcePoint[] {
  const scenario = profile.scenario;
  const performance = analysis.flatMap((result) => ([
    { id: result.session.id, signalId: "reaction" as const, label: result.session.label, day: result.session.relativeDay, value: result.meanReactionTimeMs, unit: "ms", timestamp: result.session.completedAt, href: `/simulation/assessments?session=${encodeURIComponent(result.session.id)}`, sourceKind: "assessment" as const, phaseId: result.session.phaseId, eligibility: result.timingEligible ? "Eligible · timing" : "Not eligible", calculation: "Mean reaction time from raw trial timestamps" },
    { id: `${result.session.id}:movement`, signalId: "movement" as const, label: result.session.label, day: result.session.relativeDay, value: result.meanMovementTimeMs, unit: "ms", timestamp: result.session.completedAt, href: `/simulation/assessments?session=${encodeURIComponent(result.session.id)}`, sourceKind: "assessment" as const, phaseId: result.session.phaseId, eligibility: result.timingEligible ? "Eligible · timing" : "Not eligible", calculation: "Mean movement time from raw trial timestamps" },
  ]));
  const selfReports = CHECK_IN_FIELDS.flatMap((field) => scenario.checkIns.map((record): SourcePoint => ({
    id: record.id,
    signalId: field.field,
    label: `${field.label} · ${record.context}`,
    day: record.relativeDay,
    value: record.scores[field.field] ?? null,
    unit: "0–10",
    timestamp: record.recordedAt,
    href: `/simulation/check-ins?checkin=${encodeURIComponent(record.id)}`,
    sourceKind: "check-in",
    phaseId: record.phaseId,
    eligibility: record.scores[field.field] === undefined ? "Not answered" : "Recorded self-report",
    calculation: "Recorded score · no transformation",
    ...(record.assessmentSessionId ? { explicitAssociation: `Explicit session ID: ${record.assessmentSessionId}` } : {}),
  })));
  return [...performance, ...selfReports];
}

function buildEventPoints(profile: SimulationAstronautProfile): readonly EventPoint[] {
  const scenario = profile.scenario;
  const toDay = (timestamp: string) => (Date.parse(timestamp) - Date.parse(scenario.mission.launchAt)) / 86_400_000;
  const events: EventPoint[] = scenario.events.map((record: SimulationMissionEvent) => ({ id: record.id, label: record.title, day: toDay(record.occurredAt), timestamp: record.occurredAt, phaseId: record.phaseId, href: "/simulation/events", kind: "Mission event" }));
  const transitions: EventPoint[] = scenario.transitions.map((record: SimulationMissionTransition) => ({ id: record.id, label: `${record.fromPhaseId} → ${record.toPhaseId}`, day: toDay(record.occurredAt), timestamp: record.occurredAt, phaseId: record.toPhaseId, href: "/simulation/transitions", kind: "Phase transition" }));
  return [...events, ...transitions].filter((event) => event.day >= missionMinDay && event.day <= missionMaxDay).sort((left, right) => left.day - right.day || left.id.localeCompare(right.id));
}

function SourceDetail({ label, children }: { readonly label: string; readonly children: ReactNode }) { return <div className="rounded-control border border-horizon/50 bg-void/30 p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-glow-muted">{label}</dt><dd className="mt-1 text-xs leading-5 text-glow">{children}</dd></div>; }
