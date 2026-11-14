import { readFileSync } from "node:fs";
import path from "node:path";

import { buildOsdrDataset } from "@/lib/osdr/build";
import type { OsdrIntegrity } from "@/lib/osdr/build";
import { OSDR_DATASET_DEFINITIONS } from "@/lib/osdr/definitions";
import type { OsdrDatasetDefinition } from "@/lib/osdr/definitions";
import type { OsdrDatasetId } from "@/types/osdr";

/**
 * Tests read the real, unmodified OSDR downloads from the repository. Nothing is
 * fabricated: mutations below only reshape a real file to provoke a validation
 * failure.
 */
export const RAW_ROOT = "data/raw/osdr";

export const CMP_SOURCE = `${RAW_ROOT}/OSD-575/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`;
export const CARDIOVASCULAR_SOURCE = `${RAW_ROOT}/OSD-575/LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv`;
export const CBC_SOURCE = `${RAW_ROOT}/OSD-569/LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`;
export const ALAMAR_SOURCE = `${RAW_ROOT}/OSD-575/LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv`;
export const IMMUNE_SOURCE = `${RAW_ROOT}/OSD-575/LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv`;

export function readSource(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

export function definitionFor(datasetId: OsdrDatasetId): OsdrDatasetDefinition {
  const definition = OSDR_DATASET_DEFINITIONS.find((candidate) => candidate.datasetId === datasetId);
  if (!definition) throw new Error(`Unknown dataset definition: ${datasetId}`);
  return definition;
}

const TEST_INTEGRITY: OsdrIntegrity = { sha256: "test-integrity", byteSize: 0 };

export function buildFrom(datasetId: OsdrDatasetId, sourceOverride?: string) {
  const definition = definitionFor(datasetId);
  const text = sourceOverride ?? readSource(definition.relativePath);
  return buildOsdrDataset(definition, text, TEST_INTEGRITY);
}

/**
 * Applies a line-by-line edit while preserving the file's own line endings.
 *
 * The OSDR downloads are CRLF files. Splitting on "\n" alone would leave a
 * trailing "\r" inside every edited line and silently reshape the record.
 */
export function editLines(text: string, edit: (lines: string[]) => string[]): string {
  const lineEnding = text.includes("\r\n") ? "\r\n" : "\n";
  const trailingNewline = text.endsWith(lineEnding);
  const lines = text.split(lineEnding);
  if (trailingNewline) lines.pop();
  const edited = edit(lines);
  return `${edited.join(lineEnding)}${trailingNewline ? lineEnding : ""}`;
}
