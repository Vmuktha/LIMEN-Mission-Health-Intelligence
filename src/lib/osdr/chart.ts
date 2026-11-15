import type { OsdrDataset, OsdrMeasurement, OsdrTimepointLabel } from "@/types/osdr";

export const OSDR_TIMEPOINT_ORDER: readonly OsdrTimepointLabel[] = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"];

export interface OsdrAnalyteOption {
  readonly key: string;
  readonly role: OsdrMeasurement["role"];
  readonly label: string;
  readonly unit: string | null;
  readonly kind: OsdrMeasurement["kind"];
}

export interface OsdrChartObservation {
  readonly timepoint: OsdrTimepointLabel;
  readonly sampleId: string | null;
  readonly measurement: OsdrMeasurement | null;
}

export interface OsdrChartSegment {
  readonly points: readonly { readonly index: number; readonly observation: OsdrChartObservation; readonly value: number }[];
}

/** Null source values split the line; no gap is bridged or imputed. */
export function buildOsdrChartSegments(observations: readonly OsdrChartObservation[]): readonly OsdrChartSegment[] {
  const segments: { index: number; observation: OsdrChartObservation; value: number }[][] = [];
  let current: { index: number; observation: OsdrChartObservation; value: number }[] = [];
  observations.forEach((observation, index) => {
    const value = observation.measurement?.value;
    if (value === null || value === undefined || !Number.isFinite(value)) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ index, observation, value });
  });
  if (current.length) segments.push(current);
  return segments.map((points) => ({ points }));
}

export function listOsdrAnalytes(dataset: OsdrDataset): readonly OsdrAnalyteOption[] {
  const options = new Map<string, OsdrAnalyteOption>();
  for (const measurement of dataset.measurements) {
    const key = `${measurement.analyteKey}::${measurement.role}`;
    if (!options.has(key)) options.set(key, {
      key: measurement.analyteKey,
      role: measurement.role,
      label: measurement.analyteLabel,
      unit: measurement.unit,
      kind: measurement.kind,
    });
  }
  return [...options.values()].sort((left, right) => left.label.localeCompare(right.label) || left.role.localeCompare(right.role));
}

/** Keeps the selected study, specimen, pseudonymous token, analyte and source timepoints intact. */
export function buildOsdrChartObservations(
  dataset: OsdrDataset,
  participantToken: string,
  analyteKey: string,
  role: OsdrMeasurement["role"],
  timepoint: OsdrTimepointLabel | "all" = "all",
): readonly OsdrChartObservation[] {
  const ordered = timepoint === "all" ? OSDR_TIMEPOINT_ORDER : [timepoint];
  return ordered.map((label) => {
    const sample = dataset.samples.find((item) => item.participantToken === participantToken && item.timepointLabel === label);
    const measurement = sample
      ? dataset.measurements.find((item) => item.sampleId === sample.sampleId && item.analyteKey === analyteKey && item.role === role) ?? null
      : null;
    return { timepoint: label, sampleId: sample?.sampleId ?? null, measurement };
  });
}

