/**
 * Column classification for the OSDR transformed tables.
 *
 * Transformed OSDR files encode both the analyte and the unit inside the column
 * header, e.g. `albumin_value_gram_per_deciliter`. Nothing is inferred from a
 * filename or from a separate unit column, because no separate unit column
 * exists. A header that does not match an expected shape is reported as an
 * unexpected column rather than guessed at.
 */

import type { OsdrColumnRole, OsdrMissingToken } from "../../types/osdr";

export type OsdrColumnShape = "value-range" | "concentration-percent";

/**
 * Unit tokens that appear verbatim as header suffixes in the selected datasets.
 * `gram_per_deciliter` and `grams_per_deciliter` are both present in the source
 * files; the inconsistency is preserved rather than normalised away.
 */
export const OSDR_UNIT_TOKENS = [
  "gram_per_deciliter",
  "grams_per_deciliter",
  "milligram_per_deciliter",
  "units_per_liter",
  "millimol_per_liter",
  "milliliter_per_minute_per_1.73_meter_squared",
  "picogram_per_milliliter",
  "nanogram_per_milliliter",
  "cells_per_microliter",
  "thousand_per_microliter",
  "million_per_microliter",
  "femtoliter",
  "picogram",
  "percent",
] as const;

export type OsdrUnitToken = (typeof OSDR_UNIT_TOKENS)[number];

const UNIT_TOKEN_SET: ReadonlySet<string> = new Set(OSDR_UNIT_TOKENS);

const VALUE_RANGE_PATTERN = /^(.+?)_(value|range_min|range_max|max)(?:_(.+))?$/;
const CONCENTRATION_PERCENT_PATTERN = /^(.+?)_(concentration|percent_normalized_value|percent)(?:_(.+))?$/;

const VALUE_RANGE_ROLES: Readonly<Record<string, OsdrColumnRole>> = {
  value: "value",
  range_min: "range-min",
  range_max: "range-max",
  // ALT and AST name their upper bound `*_max_units_per_liter` rather than
  // `*_range_max_*`. The values are range maxima (9-46 U/L for ALT, 10-40 U/L
  // for AST) and the position is unambiguous, so the alias is accepted.
  max: "range-max",
};

const CONCENTRATION_PERCENT_ROLES: Readonly<Record<string, OsdrColumnRole>> = {
  concentration: "concentration",
  percent: "percent",
  percent_normalized_value: "percent",
};

export interface OsdrColumnSpec {
  readonly header: string;
  readonly analyteKey: string;
  readonly role: OsdrColumnRole;
  /** Unit token taken from the header suffix, or null when there is none. */
  readonly unitToken: string | null;
  /** False when a suffix is present but is not a known unit token. */
  readonly unitRecognized: boolean;
}

export function classifyColumn(header: string, shape: OsdrColumnShape): OsdrColumnSpec | null {
  const pattern = shape === "value-range" ? VALUE_RANGE_PATTERN : CONCENTRATION_PERCENT_PATTERN;
  const match = pattern.exec(header);
  if (!match) return null;

  const [, analyteKey, rawRole, rawUnit] = match;
  const role = (shape === "value-range" ? VALUE_RANGE_ROLES : CONCENTRATION_PERCENT_ROLES)[rawRole];
  if (!role) return null;

  if (role === "percent") {
    // Vendor-normalised fields carry no unit and no documented formula.
    return { header, analyteKey, role, unitToken: null, unitRecognized: true };
  }

  if (rawUnit === undefined) {
    return { header, analyteKey, role, unitToken: null, unitRecognized: true };
  }

  return {
    header,
    analyteKey,
    role,
    unitToken: rawUnit,
    unitRecognized: UNIT_TOKEN_SET.has(rawUnit),
  };
}

/**
 * Missing encodings observed in the source files. The token itself is retained so
 * that `NA`, `N/A` and an empty cell stay distinguishable downstream.
 */
export function classifyMissing(raw: string): OsdrMissingToken | null {
  if (raw === "") return "empty";
  if (raw === "NA") return "NA";
  if (raw === "N/A") return "N/A";
  return null;
}

const NUMERIC_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** Strict numeric parse. Returns null for anything that is not a plain number. */
export function parseNumericCell(raw: string): number | null {
  if (!NUMERIC_PATTERN.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Deterministic display label derived mechanically from the analyte token. */
export function analyteLabelFromKey(analyteKey: string): string {
  return analyteKey.replace(/_/g, " ");
}
