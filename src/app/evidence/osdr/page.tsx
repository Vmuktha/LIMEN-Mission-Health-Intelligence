"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DataCard, DataTable, EmptyState, FormField, MetricCard, PageHeader, ProvenanceLabel } from "@/components/ui/InstrumentUI";
import { OSDR_DATASETS } from "@/lib/osdr/processed";
import type { OsdrDataset } from "@/types/osdr";

export default function OsdrViewerPage() {
  const [selectedId, setSelectedId] = useState("");
  const dataset = OSDR_DATASETS.find((item) => item.datasetId === selectedId) ?? null;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader eyebrow="Analyse · retrospective source data" title="NASA OSDR explorer" description="Browse bundled, processed study-level measurements from NASA’s Open Science Data Repository. These are retrospective research data, not LIMEN user records, clinical interpretation, or live mission telemetry." aside={<ProvenanceLabel tone="warning">NASA does not endorse LIMEN</ProvenanceLabel>} />
        <DataCard as="section" className="p-5 sm:p-6">
          <FormField label="Verified dataset" htmlFor="osdr-dataset" hint="Source files, DOI, study accession and original missing-value tokens are retained with the processed records.">
            <select id="osdr-dataset" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="instrument-control">
              <option value="">Choose a bundled dataset</option>
              {OSDR_DATASETS.map((item) => <option key={item.datasetId} value={item.datasetId}>{item.datasetId.toUpperCase()} · {item.study.title}</option>)}
            </select>
          </FormField>
        </DataCard>

        {dataset ? <DatasetDetails dataset={dataset} /> : (
          <EmptyState title="Select a source dataset">No measurements are displayed until a specific bundled NASA OSDR dataset is selected. Nothing here is synthesized to fill empty values.</EmptyState>
        )}
      </div>
    </AppShell>
  );
}

function DatasetDetails({ dataset }: { readonly dataset: OsdrDataset }) {
  return (
    <section aria-labelledby="dataset-heading" className="flex flex-col gap-5">
      <DataCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ion">{dataset.study.accession} · source dataset</p>
            <h2 id="dataset-heading" className="mt-2 max-w-4xl text-xl font-semibold leading-7 text-glow">{dataset.study.title}</h2>
          </div>
          <ProvenanceLabel tone="accent">NASA OSDR · CC0 1.0</ProvenanceLabel>
        </div>
        <p className="mt-3 text-sm leading-6 text-glow-muted">{dataset.study.attribution}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Specimen" value={dataset.specimen} />
          <MetricCard label="Samples" value={String(dataset.samples.length)} />
          <MetricCard label="Measurements" value={String(dataset.measurements.length)} />
          <MetricCard label="Observed timepoints" value={String(dataset.coverage.timepointsObserved.length)} detail={`${dataset.coverage.participantTokenCount} participant tokens in source data`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <a href={dataset.study.recordUrl} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">Open NASA study record</a>
          <a href={dataset.study.doiUrl} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">Open DOI</a>
          <a href={dataset.study.licence.url} target="_blank" rel="noreferrer" className="font-medium text-ion-soft underline-offset-4 hover:underline">CC0 licence</a>
        </div>
      </DataCard>

      <DataCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-glow">Source measurements</h3>
            <p className="mt-1 text-sm text-glow-muted">Showing the first ten bundled rows. Original missing tokens are displayed verbatim.</p>
          </div>
          <ProvenanceLabel>Processed source values</ProvenanceLabel>
        </div>
        <DataTable label={`${dataset.datasetId} source measurements`}>
          <thead className="bg-void/70 text-xs uppercase tracking-wide text-glow-muted"><tr><th scope="col" className="px-3 py-3">Sample</th><th scope="col" className="px-3 py-3">Specimen</th><th scope="col" className="px-3 py-3">Timepoint</th><th scope="col" className="px-3 py-3">Analyte</th><th scope="col" className="px-3 py-3 text-right">Value</th><th scope="col" className="px-3 py-3">Missing token</th><th scope="col" className="px-3 py-3">Unit</th></tr></thead>
          <tbody className="divide-y divide-horizon/70">{dataset.measurements.slice(0, 10).map((measurement, index) => <tr key={`${measurement.sampleId}-${measurement.analyteLabel}-${index}`} className="text-glow"><td className="px-3 py-3 font-mono text-xs">{measurement.sampleId}</td><td className="px-3 py-3">{measurement.specimen}</td><td className="px-3 py-3">{measurement.timepointLabel}</td><td className="px-3 py-3">{measurement.analyteLabel}</td><td className="px-3 py-3 text-right tabular-nums">{measurement.value === null ? "—" : measurement.value}</td><td className="px-3 py-3 text-glow-muted">{measurement.missingToken ?? "—"}</td><td className="px-3 py-3">{measurement.unit ?? "—"}</td></tr>)}</tbody>
        </DataTable>
        <p className="mt-4 text-xs leading-5 text-glow-muted">Source identifiers, units, and missing-value tokens are retained. These data are not used by LIMEN’s assessment, recovery, or concordance calculations.</p>
      </DataCard>
    </section>
  );
}
