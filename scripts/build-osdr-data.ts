/**
 * Regenerates `data/processed/osdr/` from the unmodified OSDR downloads.
 *
 *   npm run data:build
 *
 * The script is deterministic: it reads the same bytes, applies the same pure
 * transformation, and writes byte-identical JSON. It refuses to write anything
 * when a dataset fails validation.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildOsdrDataset } from "../src/lib/osdr/build";
import { OSDR_ARCHIVED_SOURCES, OSDR_DATASET_DEFINITIONS } from "../src/lib/osdr/definitions";
import type { OsdrDataset, OsdrManifest, OsdrManifestEntry } from "../src/types/osdr";

const SCHEMA_VERSION = "1.0.0" as const;

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function main(): void {
  const root = process.cwd();
  const rawRoot = path.join(root, "data", "raw", "osdr");
  const outputRoot = path.join(root, "data", "processed", "osdr");

  if (!existsSync(rawRoot)) {
    throw new Error(`Cannot find ${path.relative(root, rawRoot)}. Run this script from the repository root.`);
  }

  for (const archived of OSDR_ARCHIVED_SOURCES) {
    if (!existsSync(path.join(root, archived.relativePath))) {
      console.warn(`warning: archived source missing: ${archived.relativePath}`);
    }
  }

  const datasets: OsdrDataset[] = [];
  const failures: string[] = [];

  for (const definition of OSDR_DATASET_DEFINITIONS) {
    const absolute = path.join(root, definition.relativePath);
    if (!existsSync(absolute)) {
      throw new Error(`Missing source file: ${definition.relativePath}`);
    }
    const buffer = readFileSync(absolute);
    const text = buffer.toString("utf8");
    const result = buildOsdrDataset(definition, text, {
      sha256: sha256(buffer),
      byteSize: buffer.byteLength,
    });

    const errors = result.issues.filter((issue) => issue.severity === "error");
    for (const issue of result.issues) {
      console.log(`[${definition.datasetId}] ${issue.severity}: ${issue.code} — ${issue.message}`);
    }

    if (!result.ok || errors.length > 0) {
      failures.push(definition.datasetId);
    }
    datasets.push(result.dataset);
  }

  if (failures.length > 0) {
    throw new Error(`Validation failed for: ${failures.join(", ")}. Nothing was written.`);
  }

  mkdirSync(outputRoot, { recursive: true });

  const entries: OsdrManifestEntry[] = [];

  for (const dataset of datasets) {
    const fileName = `${dataset.datasetId}.json`;
    writeFileSync(path.join(outputRoot, fileName), `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
    const errors = dataset.issues.filter((issue) => issue.severity === "error").length;
    entries.push({
      datasetId: dataset.datasetId,
      studyAccession: dataset.study.accession,
      specimen: dataset.specimen,
      fileName: dataset.source.fileName,
      sha256: dataset.source.sha256,
      byteSize: dataset.source.byteSize,
      sampleCount: dataset.coverage.sampleCount,
      analyteCount: dataset.coverage.analyteCount,
      measurementCount: dataset.coverage.measurementCount,
      processedFile: `data/processed/osdr/${fileName}`,
      issueCount: dataset.issues.length,
      errorCount: errors,
    });
    console.log(
      `${dataset.datasetId}: ${dataset.coverage.sampleCount} samples, ` +
        `${dataset.coverage.analyteCount} analytes, ${dataset.coverage.measurementCount} measurements, ` +
        `${dataset.issues.length} issue(s)`,
    );
  }

  const manifest: OsdrManifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: "scripts/build-osdr-data.ts",
    sourceDirectory: "data/raw/osdr",
    datasets: entries,
  };
  writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${entries.length} dataset(s) and manifest to data/processed/osdr.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
