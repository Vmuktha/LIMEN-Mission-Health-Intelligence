"use client";
import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { OSDR_DATASETS } from '@/lib/osdr/processed';
import type { OsdrDataset } from '@/types/osdr';

export default function OsdrViewerPage() {
  const [selectedId, setSelectedId] = useState<string>('');
  const [dataset, setDataset] = useState<OsdrDataset | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    const ds = OSDR_DATASETS.find((d) => d.datasetId === id) ?? null;
    setDataset(ds);
  };

  return (
    <AppShell>
      <section className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">NASA OSDR Viewer</h1>
        <p className="mb-2 text-sm text-gray-600">
          The datasets below are retrospective research data from NASA&apos;s Open Science Data Repository. They are not mission telemetry.
        </p>
        <label className="block mb-2 font-medium">Select dataset:</label>
        <select value={selectedId} onChange={handleChange} className="border rounded p-1 mb-4 w-full">
          <option value="">-- choose a dataset --</option>
          {OSDR_DATASETS.map((d) => (
            <option key={d.datasetId} value={d.datasetId}>
              {d.datasetId} – {d.study.title}
            </option>
          ))}
        </select>

        {dataset && (
          <div>
            <h2 className="text-2xl font-semibold mb-2">{dataset.datasetId} – {dataset.study.title}</h2>
            <p className="mb-1"><strong>Specimen:</strong> {dataset.specimen}</p>
            <p className="mb-1"><strong>Samples:</strong> {dataset.samples.length}</p>
            <p className="mb-1"><strong>Measurements:</strong> {dataset.measurements.length}</p>
            <p className="mb-4"><strong>Coverage:</strong> {dataset.coverage.participantTokenCount} participants, {dataset.coverage.timepointsObserved.length} time‑points observed.</p>

            <h3 className="text-xl font-medium mb-2">Sample measurements (first 10)</h3>
            <table className="w-full table-auto border-collapse border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-1">Sample ID</th>
                  <th className="border p-1">Specimen</th>
                  <th className="border p-1">Timepoint</th>
                  <th className="border p-1">Analyte</th>
                  <th className="border p-1">Value</th>
                  <th className="border p-1">Missing?</th>
                  <th className="border p-1">Unit</th>
                </tr>
              </thead>
              <tbody>
                {dataset.measurements.slice(0, 10).map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-1">{m.sampleId}</td>
                    <td className="border p-1">{m.specimen}</td>
                    <td className="border p-1">{m.timepointLabel}</td>
                    <td className="border p-1">{m.analyteLabel}</td>
                    <td className="border p-1 text-right">{m.value !== null ? m.value : ''}</td>
                    <td className="border p-1 text-center">{m.missingToken ? '✓' : ''}</td>
                    <td className="border p-1">{m.unit ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-gray-600 italic">
              All original missing‑value tokens, units, and reference ranges are preserved in the dataset objects.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
