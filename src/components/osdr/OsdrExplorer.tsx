"use client";

import { useMemo, useState } from "react";
import { DataCard, DataTable, EmptyState, FormField, MetricCard, PageHeader, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { buildOsdrChartObservations, buildOsdrChartSegments, listOsdrAnalytes, OSDR_TIMEPOINT_ORDER } from "@/lib/osdr/chart";
import { OSDR_DATASETS } from "@/lib/osdr/processed";
import type { OsdrDataset, OsdrMeasurement, OsdrTimepointLabel } from "@/types/osdr";

const TIMEPOINTS: readonly (OsdrTimepointLabel | "all")[] = ["all", ...OSDR_TIMEPOINT_ORDER];

export function OsdrExplorer() {
  const [datasetId, setDatasetId] = useState("");
  const dataset = OSDR_DATASETS.find((item) => item.datasetId === datasetId) ?? null;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7">
      <PageHeader eyebrow="Analyse · retrospective source data" title="NASA OSDR explorer" description="Explore bundled, processed study-level biospecimen measurements from NASA’s Open Science Data Repository. These are retrospective research data, not LIMEN participant records, clinical interpretation, or live mission telemetry." aside={<ProvenanceLabel tone="warning">NASA does not endorse LIMEN</ProvenanceLabel>} />
      <DataCard as="section" className="p-5 sm:p-6">
        <FormField label="Verified source dataset" htmlFor="osdr-dataset" hint="Dataset selection never merges studies or specimens. Sample identifiers and original missing-value tokens remain visible.">
          <select id="osdr-dataset" value={datasetId} onChange={(event) => setDatasetId(event.target.value)} className="instrument-control">
            <option value="">Choose a bundled dataset</option>
            {OSDR_DATASETS.map((item) => <option key={item.datasetId} value={item.datasetId}>{item.datasetId.toUpperCase()} · {item.study.title}</option>)}
          </select>
        </FormField>
      </DataCard>
      {dataset ? <DatasetView dataset={dataset} /> : <EmptyState title="Select a source dataset">No measurements are displayed until a specific bundled NASA OSDR dataset is selected. Nothing is synthesized to fill empty values.</EmptyState>}
    </div>
  );
}

function DatasetView({ dataset }: { readonly dataset: OsdrDataset }) {
  const analytes = useMemo(() => listOsdrAnalytes(dataset), [dataset]);
  const [selectedAnalyte, setSelectedAnalyte] = useState("");
  const [participantToken, setParticipantToken] = useState("");
  const [timepoint, setTimepoint] = useState<OsdrTimepointLabel | "all">("all");
  const analyteKey = analytes.some((item) => `${item.key}::${item.role}` === selectedAnalyte) ? selectedAnalyte : (analytes[0] ? `${analytes[0].key}::${analytes[0].role}` : "");
  const [key, role] = analyteKey.split("::");
  const analyte = analytes.find((item) => item.key === key && item.role === role) ?? null;
  const tokens = dataset.coverage.participantTokens;
  const token = tokens.includes(participantToken) ? participantToken : (tokens[0] ?? "");
  const observations = analyte && token ? buildOsdrChartObservations(dataset, token, analyte.key, analyte.role, timepoint) : [];
  const selectedMeasurements = dataset.measurements.filter((measurement) => measurement.analyteKey === analyte?.key && measurement.role === analyte?.role);
  const missingCount = selectedMeasurements.filter((measurement) => measurement.value === null).length;

  return (
    <section aria-labelledby="osdr-study-title" className="flex flex-col gap-5">
      <DataCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ion">{dataset.study.accession} · source dataset</p>
            <h2 id="osdr-study-title" className="mt-2 max-w-4xl text-xl font-semibold leading-7 text-glow">{dataset.study.title}</h2>
          </div>
          <ProvenanceLabel tone="warning">NASA OSDR · CC0 1.0</ProvenanceLabel>
        </div>
        <p className="mt-3 text-sm leading-6 text-glow-muted">{dataset.study.attribution} This study’s pseudonymous sample tokens are not verified identities and are not linked to operational participant records.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Specimen" value={dataset.specimen} />
          <MetricCard label="Assay" value={dataset.assay.name} detail={`${dataset.assay.platform} · ${dataset.assay.vendor} · ${dataset.assay.analyteCount} analytes`} />
          <MetricCard label="Source samples" value={String(dataset.coverage.sampleCount)} />
          <MetricCard label="Source measurements" value={String(dataset.coverage.measurementCount)} />
          <MetricCard label="Observed timepoints" value={String(dataset.coverage.timepointsObserved.length)} detail={`${dataset.coverage.participantTokenCount} pseudonymous participant tokens`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <a href={dataset.study.recordUrl} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">Open NASA study record</a>
          <a href={dataset.study.doiUrl} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">DOI {dataset.study.doi}</a>
          <a href={dataset.source.downloadUrl} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">Open original source file</a>
          <a href={dataset.study.licence.url} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">{dataset.study.licence.name}</a>
        </div>
      </DataCard>

      <DataCard as="section" aria-labelledby="osdr-exploration-title" className="p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ion">Study-level measurements</p>
          <h3 id="osdr-exploration-title" className="mt-1 text-lg font-semibold text-glow">Explore one analyte within one sample series</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-glow-muted">Each chart is limited to one dataset, specimen, pseudonymous sample token, analyte and source role. Points are joined only across this ordered source series; absent measurements break the line.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <FormField label="Analyte and source role" htmlFor="osdr-analyte">
            <select id="osdr-analyte" value={analyteKey} onChange={(event) => setSelectedAnalyte(event.target.value)} className="instrument-control">
              {analytes.map((item) => <option key={`${item.key}::${item.role}`} value={`${item.key}::${item.role}`}>{item.label} · {item.role.replaceAll("-", " ")}{item.unit ? ` · ${item.unit}` : " · unit not supplied"}</option>)}
            </select>
          </FormField>
          <FormField label="Pseudonymous sample token" htmlFor="osdr-token" hint="A source token, not a verified identity.">
            <select id="osdr-token" value={token} onChange={(event) => setParticipantToken(event.target.value)} className="instrument-control">
              {tokens.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FormField>
          <FormField label="Source timepoint" htmlFor="osdr-timepoint">
            <select id="osdr-timepoint" value={timepoint} onChange={(event) => setTimepoint(event.target.value as OsdrTimepointLabel | "all")} className="instrument-control">
              {TIMEPOINTS.map((value) => <option key={value} value={value}>{value === "all" ? "All documented source order" : value}</option>)}
            </select>
          </FormField>
        </div>
        {analyte && <OsdrChart observations={observations} label={analyte.label} unit={analyte.unit} sampleCount={selectedMeasurements.length} missingCount={missingCount} />}
      </DataCard>

      <DataCard as="section" className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="font-semibold text-glow">Source measurements in the selected series</h3><p className="mt-1 text-sm text-glow-muted">Original sample IDs, timepoints, analyte identity, units, values and missing tokens are retained.</p></div>
          <ProvenanceLabel>Bundled processed source</ProvenanceLabel>
        </div>
        <DataTable label={`${dataset.datasetId} selected source measurement series`}>
          <thead className="bg-void/70 text-xs uppercase tracking-wide text-glow-muted"><tr><th scope="col" className="px-3 py-3">Source sample ID</th><th scope="col" className="px-3 py-3">Specimen</th><th scope="col" className="px-3 py-3">Timepoint</th><th scope="col" className="px-3 py-3">Analyte · role</th><th scope="col" className="px-3 py-3 text-right">Value</th><th scope="col" className="px-3 py-3">Missing token</th><th scope="col" className="px-3 py-3">Unit</th></tr></thead>
          <tbody className="divide-y divide-horizon/70">{observations.map((entry) => <MeasurementRow key={entry.timepoint} measurement={entry.measurement} sampleId={entry.sampleId} timepoint={entry.timepoint} />)}</tbody>
        </DataTable>
        <p className="mt-4 text-xs leading-5 text-glow-muted">{dataset.transformation.missingValuePolicy} Source file: {dataset.source.fileName} · SHA-256: <span className="break-all font-mono">{dataset.source.sha256}</span></p>
        {dataset.issues.length > 0 && <div className="mt-3 rounded-control border border-ember/40 bg-ember/10 p-3 text-xs leading-5 text-glow-muted"><strong className="text-amber-200">Source processing notes ({dataset.issues.length})</strong><ul className="mt-2 list-disc pl-5">{dataset.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul></div>}
      </DataCard>
      <p className="text-xs leading-5 text-glow-muted">OSDR values are retrospective research measurements. They are not mission telemetry, are not joined with browser-local records, and are not used by LIMEN&apos;s assessment, recovery or concordance calculations. Study coverage and sample counts describe these bundled files only.</p>
    </section>
  );
}

function OsdrChart({ observations, label, unit, sampleCount, missingCount }: { readonly observations: ReturnType<typeof buildOsdrChartObservations>; readonly label: string; readonly unit: string | null; readonly sampleCount: number; readonly missingCount: number }) {
  const chartSegments = buildOsdrChartSegments(observations);
  const valid = chartSegments.flatMap((segment) => segment.points);
  const width = 760; const height = 300; const pad = { top: 28, right: 24, bottom: 48, left: 74 };
  const min = valid.length ? Math.min(...valid.map((item) => item.value)) : null;
  const max = valid.length ? Math.max(...valid.map((item) => item.value)) : null;
  const span = min === null || max === null ? null : max === min ? Math.max(Math.abs(min) * .1, 1) : max - min;
  const low = min === null || span === null ? null : min - span * .1;
  const high = max === null || span === null ? null : max + span * .1;
  const xFor = (index: number) => observations.length < 2 ? (width + pad.left - pad.right) / 2 : pad.left + index / (observations.length - 1) * (width - pad.left - pad.right);
  const yFor = (value: number) => high === null || low === null ? height / 2 : pad.top + (high - value) / (high - low) * (height - pad.top - pad.bottom);
  const segments = chartSegments.map((segment) => segment.points.map((point) => ({
    x: xFor(point.index), y: yFor(point.value), index: point.index, value: point.value,
  })));
  const described = `${label}, ${unit ?? "unit not supplied"}; ${valid.length} numeric measurements out of ${observations.length} displayed source timepoints. Missing values remain gaps.`;
  return (
    <div className="mt-5 overflow-x-auto rounded-control border border-horizon/70 bg-void/35 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-glow-muted"><span>Observed values · {unit ?? "unit not supplied"}</span><span className="font-mono tabular-nums">{valid.length} numeric / {observations.length} displayed · {missingCount} missing among {sampleCount} source rows</span></div>
      {valid.length ? <svg role="img" aria-label={described} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[540px]">
        <title>{label} by source timepoint</title><desc>{described} Timepoints follow the source study order and are categorical labels, not equally spaced elapsed time.</desc>
        {[0, 1, 2, 3, 4].map((step) => { const value = high !== null && low !== null ? high - step * (high - low) / 4 : 0; const y = yFor(value); return <g key={step}><line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#53627a" strokeOpacity=".55" /><text x={pad.left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#aab5c8">{Number(value.toPrecision(4))}</text></g>; })}
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="#8793a7" /><line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="#8793a7" />
        {segments.map((points, index) => points.length > 1 && <polyline key={index} points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#66d6df" strokeWidth="2" />)}
        {valid.map(({ index, value }) => { const item = observations[index]; if (!item) return null; return <circle key={item.sampleId ?? item.timepoint} cx={xFor(index)} cy={yFor(value)} r="4" fill="#101b2b" stroke="#66d6df" strokeWidth="2"><title>{`${item.timepoint} · ${item.sampleId ?? "sample unavailable"} · ${value} ${unit ?? "unit not supplied"}`}</title></circle>; })}
        {observations.map((item, index) => <text key={item.timepoint} x={xFor(index)} y={height - 16} textAnchor="middle" fontSize="11" fill="#aab5c8">{item.timepoint}</text>)}
      </svg> : <p role="status" className="py-8 text-center text-sm text-glow-muted">No numeric source values are available in this selected series. Missingness is preserved, not imputed.</p>}
      <p className="mt-2 text-xs text-glow-muted">The line is a visual guide across recorded source timepoints only; no values are interpolated. Timepoint spacing is categorical.</p>
    </div>
  );
}

function MeasurementRow({ measurement, sampleId, timepoint }: { readonly measurement: OsdrMeasurement | null; readonly sampleId: string | null; readonly timepoint: OsdrTimepointLabel }) {
  return <tr className="text-glow"><td className="px-3 py-3 font-mono text-xs">{sampleId ?? "Sample not recorded"}</td><td className="px-3 py-3">{measurement?.specimen ?? "—"}</td><td className="px-3 py-3">{timepoint}</td><td className="px-3 py-3">{measurement ? `${measurement.analyteLabel} · ${measurement.role.replaceAll("-", " ")}` : "No matching source record"}</td><td className="px-3 py-3 text-right tabular-nums">{measurement?.value ?? "—"}</td><td className="px-3 py-3 text-glow-muted">{measurement?.missingToken ?? (measurement ? "—" : "No record")}</td><td className="px-3 py-3">{measurement?.unit ?? "—"}</td></tr>;
}
