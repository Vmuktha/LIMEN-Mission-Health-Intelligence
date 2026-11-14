/**
 * Pure retrospective access to the generated OSDR datasets.
 *
 * This module imports no processed JSON, so a caller can decide when (or
 * whether) to load a dataset. It never joins OSDR measurements to browser
 * assessments, check-ins, mission events, or follow-ups. Serum and whole-blood
 * series remain separate, and a reference range is carried through verbatim
 * without being evaluated.
 */

import { OSDR_TIMEPOINTS } from "@/lib/osdr/definitions";
import type { OsdrColumnRole, OsdrDataset, OsdrMissingToken, OsdrReferenceRange, OsdrTimepointLabel } from "@/types/osdr";

export type OsdrTimelineRole = "value" | "concentration" | "percent";
export type OsdrTimelineRoleFilter = OsdrTimelineRole | "measurable" | "all";

export interface OsdrTimelinePoint {
  readonly timepointLabel: OsdrTimepointLabel;
  readonly sampleId: string;
  readonly header: string;
  readonly value: number | null;
  readonly missingToken: OsdrMissingToken | null;
  readonly unit: string | null;
  /** Source-provided laboratory reference interval; never evaluated here. */
  readonly referenceRange: OsdrReferenceRange | null;
}

export interface OsdrAnalyteTimeline {
  readonly datasetId: OsdrDataset["datasetId"];
  readonly studyAccession: OsdrDataset["study"]["accession"];
  readonly specimen: OsdrDataset["specimen"];
  readonly participantToken: string;
  readonly analyteKey: string;
  readonly analyteLabel: string;
  readonly role: OsdrTimelineRole;
  readonly unit: string | null;
  readonly points: readonly OsdrTimelinePoint[];
  readonly measurementCount: number;
  readonly missingCount: number;
}

export interface OsdrTimelineCollection {
  readonly datasets: readonly {
    readonly datasetId: OsdrDataset["datasetId"];
    readonly studyAccession: OsdrDataset["study"]["accession"];
    readonly specimen: OsdrDataset["specimen"];
    readonly sampleCount: number;
  }[];
  readonly series: readonly OsdrAnalyteTimeline[];
}

const TIMEPOINT_INDEX: ReadonlyMap<OsdrTimepointLabel, number> = new Map(
  OSDR_TIMEPOINTS.map((timepoint, index) => [timepoint, index]),
);

/** Canonical display order. It is the study's own label order, not a computed date. */
export const OSDR_TIMEPOINT_ORDER: readonly OsdrTimepointLabel[] = OSDR_TIMEPOINTS;

export function buildOsdrAnalyteTimelines(
  dataset: OsdrDataset,
  options: { readonly role?: OsdrTimelineRoleFilter; readonly participantToken?: string } = {},
): readonly OsdrAnalyteTimeline[] {
  const filter = options.role ?? "measurable";
  const groups = new Map<string, OsdrTimelinePoint[]>();

  for (const measurement of dataset.measurements) {
    if (!roleMatches(measurement.role, filter)) continue;
    if (options.participantToken && measurement.participantToken !== options.participantToken) continue;
    const key = `${measurement.participantToken}::${measurement.analyteKey}::${measurement.role}`;
    const points = groups.get(key) ?? [];
    points.push({
      timepointLabel: measurement.timepointLabel,
      sampleId: measurement.sampleId,
      header: measurement.header,
      value: measurement.value,
      missingToken: measurement.missingToken,
      unit: measurement.unit,
      referenceRange: measurement.referenceRange,
    });
    groups.set(key, points);
  }

  return [...groups.entries()]
    .map(([key, points]) => {
      const [participantToken, analyteKey, role] = key.split("::") as [string, string, OsdrTimelineRole];
      const ordered = [...points].sort((left, right) => timepointRank(left.timepointLabel) - timepointRank(right.timepointLabel) || left.sampleId.localeCompare(right.sampleId));
      const first = ordered[0];
      const datasetMeasurement = dataset.measurements.find(
        (measurement) => measurement.participantToken === participantToken && measurement.analyteKey === analyteKey && measurement.role === role,
      );
      return {
        datasetId: dataset.datasetId,
        studyAccession: dataset.study.accession,
        specimen: dataset.specimen,
        participantToken,
        analyteKey,
        analyteLabel: datasetMeasurement?.analyteLabel ?? analyteKey.replace(/_/g, " "),
        role,
        unit: first?.unit ?? null,
        points: ordered,
        measurementCount: ordered.length,
        missingCount: ordered.filter((point) => point.missingToken !== null).length,
      } satisfies OsdrAnalyteTimeline;
    })
    .sort((left, right) => left.participantToken.localeCompare(right.participantToken) || left.analyteKey.localeCompare(right.analyteKey) || left.role.localeCompare(right.role));
}

/** All series for one participant, across the analytes and roles in one dataset. */
export function buildOsdrParticipantTimeline(
  dataset: OsdrDataset,
  participantToken: string,
  role: OsdrTimelineRoleFilter = "measurable",
): readonly OsdrAnalyteTimeline[] {
  return buildOsdrAnalyteTimelines(dataset, { role, participantToken });
}

/**
 * Concatenates series from several datasets without merging them. Each series
 * retains its originating dataset and specimen, so serum and whole blood can be
 * displayed side by side but are never combined into one analyte value.
 */
export function buildOsdrTimelineCollection(
  datasets: readonly OsdrDataset[],
  role: OsdrTimelineRoleFilter = "measurable",
): OsdrTimelineCollection {
  return {
    datasets: datasets.map((dataset) => ({
      datasetId: dataset.datasetId,
      studyAccession: dataset.study.accession,
      specimen: dataset.specimen,
      sampleCount: dataset.coverage.sampleCount,
    })),
    series: datasets.flatMap((dataset) => buildOsdrAnalyteTimelines(dataset, { role })),
  };
}

export function findOsdrTimeline(
  collection: OsdrTimelineCollection,
  query: { readonly datasetId: OsdrDataset["datasetId"]; readonly participantToken: string; readonly analyteKey: string; readonly role: OsdrTimelineRole },
): OsdrAnalyteTimeline | null {
  return collection.series.find(
    (series) =>
      series.datasetId === query.datasetId
      && series.participantToken === query.participantToken
      && series.analyteKey === query.analyteKey
      && series.role === query.role,
  ) ?? null;
}

export function osdrTimelinePointAt(timeline: OsdrAnalyteTimeline, timepoint: OsdrTimepointLabel): OsdrTimelinePoint | null {
  return timeline.points.find((point) => point.timepointLabel === timepoint) ?? null;
}

export function osdrTimelineValues(timeline: OsdrAnalyteTimeline): readonly (number | null)[] {
  return timeline.points.map((point) => point.value);
}

export function specimensInCollection(collection: OsdrTimelineCollection): readonly OsdrDataset["specimen"][] {
  return [...new Set(collection.datasets.map((dataset) => dataset.specimen))];
}

export function isSingleSpecimenCollection(collection: OsdrTimelineCollection): boolean {
  return specimensInCollection(collection).length === 1;
}

function roleMatches(role: OsdrColumnRole, filter: OsdrTimelineRoleFilter): role is OsdrTimelineRole {
  if (filter === "all") return role === "value" || role === "concentration" || role === "percent";
  if (filter === "measurable") return role === "value" || role === "concentration";
  return role === filter;
}

function timepointRank(timepoint: OsdrTimepointLabel): number {
  return TIMEPOINT_INDEX.get(timepoint) ?? Number.MAX_SAFE_INTEGER;
}
