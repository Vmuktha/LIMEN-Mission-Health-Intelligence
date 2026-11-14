/**
 * Pure construction of a typed OSDR dataset from one transformed CSV.
 *
 * The builder never repairs the source. Structural surprises (an unexpected
 * column, a duplicate sample, a malformed row, a non-numeric value, an
 * unrecognised timepoint) become error-severity issues, and `ok` stays false so
 * that generation refuses to publish the result. Nothing is imputed, normalised,
 * or flagged against a clinical range.
 */

import { analyteLabelFromKey, classifyColumn, classifyMissing, parseNumericCell } from "./columns";
import type { OsdrColumnSpec } from "./columns";
import { parseCsv } from "./csv";
import { OSDR_TIMEPOINTS } from "./definitions";
import type { OsdrDatasetDefinition } from "./definitions";
import type {
  OsdrDataset,
  OsdrIssue,
  OsdrIssueCode,
  OsdrIssueSeverity,
  OsdrMeasurement,
  OsdrMissingToken,
  OsdrParticipantCoverage,
  OsdrReferenceRange,
  OsdrSample,
  OsdrTimepointLabel,
} from "../../types/osdr";

export interface OsdrIntegrity {
  readonly sha256: string;
  readonly byteSize: number;
}

export interface OsdrBuildResult {
  readonly dataset: OsdrDataset;
  readonly issues: readonly OsdrIssue[];
  readonly ok: boolean;
}

const IDENTIFIER_PATTERN = /^(C\d+)_.*?(L-\d+|R\+\d+)/;

const TRANSFORMATION = {
  sourceFormat: "wide",
  outputFormat: "long",
  derivedLookupKeyRule:
    "derivedLookupKey = participantToken + '::' + timepointLabel; runtime key only, never a replacement for sampleId.",
  missingValuePolicy:
    "Empty cells, 'NA' and 'N/A' are explicit missing tokens. A missing value is null and is never coerced to zero.",
  unitPolicy:
    "Units come only from the column-header suffix and are stored verbatim as tokens; headers without a unit stay null.",
  referenceRangePolicy:
    "range_min/range_max (and the ALT/AST '*_max_*' alias) are copied per sample. They are laboratory reference intervals, not clinical decision thresholds.",
  percentFieldPolicy:
    "Vendor '*_percent' and '*_percent_normalized_value' fields are preserved as opaque source-derived values with no unit and no documented formula.",
  generatedBy: "scripts/build-osdr-data.ts",
} as const;

interface AnalyteColumns {
  value?: OsdrColumnSpec;
  rangeMin?: OsdrColumnSpec;
  rangeMax?: OsdrColumnSpec;
  concentration?: OsdrColumnSpec;
  percent?: OsdrColumnSpec;
}

interface IndexedSpec {
  readonly spec: OsdrColumnSpec;
  readonly columnIndex: number;
}

function emptyDataset(definition: OsdrDatasetDefinition, integrity: OsdrIntegrity): OsdrDataset {
  return {
    schemaVersion: "1.0.0",
    datasetId: definition.datasetId,
    study: definition.study,
    source: {
      fileName: definition.fileName,
      relativePath: definition.relativePath,
      downloadUrl: definition.downloadUrl,
      byteSize: integrity.byteSize,
      sha256: integrity.sha256,
      retrievedOn: "2026-11-14",
    },
    assay: definition.assay,
    specimen: definition.specimen,
    samples: [],
    measurements: [],
    coverage: {
      sampleCount: 0,
      participantTokenCount: 0,
      analyteCount: 0,
      measurementCount: 0,
      participantTokens: [],
      timepointsObserved: [],
      timepointsDocumented: definition.documentedTimepoints,
      participants: [],
    },
    issues: [],
    transformation: TRANSFORMATION,
  };
}

function isTimepoint(value: string): value is OsdrTimepointLabel {
  return (OSDR_TIMEPOINTS as readonly string[]).includes(value);
}

function slotForRole(role: OsdrColumnSpec["role"]): keyof AnalyteColumns {
  switch (role) {
    case "value":
      return "value";
    case "range-min":
      return "rangeMin";
    case "range-max":
      return "rangeMax";
    case "concentration":
      return "concentration";
    case "percent":
      return "percent";
  }
}

export function buildOsdrDataset(
  definition: OsdrDatasetDefinition,
  csvText: string,
  integrity: OsdrIntegrity,
): OsdrBuildResult {
  const issues: OsdrIssue[] = [];
  const report = (
    code: OsdrIssueCode,
    severity: OsdrIssueSeverity,
    message: string,
    extra: { sampleId?: string; header?: string } = {},
  ): void => {
    issues.push({ code, severity, message, ...extra });
  };

  const parsed = parseCsv(csvText);
  for (const error of parsed.errors) {
    report("csv-parse-error", "error", error);
  }

  if (parsed.rows.length === 0) {
    report("missing-header", "error", `${definition.fileName} contains no header row.`);
    const dataset = emptyDataset(definition, integrity);
    return { dataset: { ...dataset, issues }, issues, ok: false };
  }

  const header = parsed.rows[0];
  const dataRows = parsed.rows.slice(1);

  if (header.length < 2) {
    report("missing-header", "error", `${definition.fileName} header has ${header.length} column(s).`);
  }
  if (header[0].trim() === "") {
    report("missing-header", "error", "The first column has no header name.");
  }

  const indexedSpecs: IndexedSpec[] = [];
  const seenHeaders = new Set<string>();
  const analytes = new Map<string, AnalyteColumns>();

  for (let columnIndex = 1; columnIndex < header.length; columnIndex += 1) {
    const columnHeader = header[columnIndex];
    if (seenHeaders.has(columnHeader)) {
      report("unexpected-column", "error", `Duplicate column header '${columnHeader}'.`, { header: columnHeader });
      continue;
    }
    seenHeaders.add(columnHeader);

    const spec = classifyColumn(columnHeader, definition.columnShape);
    if (!spec) {
      report(
        "unexpected-column",
        "error",
        `Column '${columnHeader}' does not match the ${definition.columnShape} shape.`,
        { header: columnHeader },
      );
      continue;
    }

    if (!spec.unitRecognized) {
      report("ambiguous-unit", "error", `Column '${columnHeader}' carries an unrecognised unit suffix.`, {
        header: columnHeader,
      });
    }

    const slot = slotForRole(spec.role);
    const bucket = analytes.get(spec.analyteKey) ?? {};
    if (bucket[slot]) {
      report("unexpected-column", "error", `Analyte '${spec.analyteKey}' has more than one ${slot} column.`, {
        header: columnHeader,
      });
      continue;
    }
    bucket[slot] = spec;
    analytes.set(spec.analyteKey, bucket);
    indexedSpecs.push({ spec, columnIndex });
  }

  for (const [analyteKey, bucket] of analytes) {
    if (definition.columnShape === "value-range") {
      if (!bucket.value || !bucket.rangeMin || !bucket.rangeMax) {
        report(
          "incomplete-analyte-columns",
          "error",
          `Analyte '${analyteKey}' is missing one of value/range_min/range_max.`,
        );
      }
    } else if (!bucket.concentration || !bucket.percent) {
      report(
        "incomplete-analyte-columns",
        "error",
        `Analyte '${analyteKey}' is missing one of concentration/percent.`,
      );
    }
  }

  if (analytes.size !== definition.expected.analyteCount) {
    report(
      "unexpected-analyte-count",
      "error",
      `Expected ${definition.expected.analyteCount} analytes, found ${analytes.size}.`,
    );
  }

  if (header.length - 1 !== definition.expected.measurementColumnCount) {
    report(
      "unexpected-measurement-column-count",
      "error",
      `Expected ${definition.expected.measurementColumnCount} measurement columns, found ${header.length - 1}.`,
    );
  }

  const samples: OsdrSample[] = [];
  const measurements: OsdrMeasurement[] = [];
  const seenSampleIds = new Set<string>();

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    const row = dataRows[rowIndex];
    const lineNumber = rowIndex + 2;

    if (row.length !== header.length) {
      report(
        "malformed-row",
        "error",
        `Row ${lineNumber} has ${row.length} fields but the header has ${header.length}.`,
      );
      continue;
    }

    const sampleId = row[0].trim();
    const match = IDENTIFIER_PATTERN.exec(sampleId);
    const participantToken = match ? match[1] : null;
    const timepoint = match ? match[2] : null;

    if (!participantToken || !timepoint) {
      report("unparseable-sample-id", "error", `Sample '${sampleId}' does not match the expected identifier shape.`, {
        sampleId,
      });
      continue;
    }

    if (!isTimepoint(timepoint)) {
      report("unrecognized-timepoint", "error", `Sample '${sampleId}' uses unrecognised timepoint '${timepoint}'.`, {
        sampleId,
      });
      continue;
    }

    if (seenSampleIds.has(sampleId)) {
      report("duplicate-sample-id", "error", `Sample '${sampleId}' appears more than once.`, { sampleId });
      continue;
    }
    seenSampleIds.add(sampleId);

    const derivedLookupKey = `${participantToken}::${timepoint}`;
    let sampleMeasurementCount = 0;

    for (const { spec, columnIndex } of indexedSpecs) {
      if (spec.role === "range-min" || spec.role === "range-max") continue;

      const raw = row[columnIndex].trim();
      const missingToken: OsdrMissingToken | null = classifyMissing(raw);
      const value = missingToken ? null : parseNumericCell(raw);

      if (!missingToken && value === null) {
        report(
          "non-numeric-value",
          "error",
          `Sample '${sampleId}' has non-numeric value '${raw}' in '${spec.header}'.`,
          { sampleId, header: spec.header },
        );
      }

      const bucket = analytes.get(spec.analyteKey);
      let referenceRange: OsdrReferenceRange | null = null;

      if (definition.columnShape === "value-range" && bucket?.rangeMin && bucket.rangeMax) {
        const minIndex = header.indexOf(bucket.rangeMin.header);
        const maxIndex = header.indexOf(bucket.rangeMax.header);
        const minRaw = minIndex >= 0 ? row[minIndex].trim() : "";
        const maxRaw = maxIndex >= 0 ? row[maxIndex].trim() : "";
        const minMissing = classifyMissing(minRaw);
        const maxMissing = classifyMissing(maxRaw);
        const min = minMissing ? null : parseNumericCell(minRaw);
        const max = maxMissing ? null : parseNumericCell(maxRaw);

        if (!minMissing && min === null) {
          report(
            "non-numeric-value",
            "error",
            `Sample '${sampleId}' has non-numeric range minimum '${minRaw}' in '${bucket.rangeMin.header}'.`,
            { sampleId, header: bucket.rangeMin.header },
          );
        }
        if (!maxMissing && max === null) {
          report(
            "non-numeric-value",
            "error",
            `Sample '${sampleId}' has non-numeric range maximum '${maxRaw}' in '${bucket.rangeMax.header}'.`,
            { sampleId, header: bucket.rangeMax.header },
          );
        }
        if (bucket.rangeMin.unitToken !== null && spec.unitToken !== null && bucket.rangeMin.unitToken !== spec.unitToken) {
          report(
            "reference-range-unit-mismatch",
            "warning",
            `Sample '${sampleId}' has unit '${spec.unitToken}' in '${spec.header}' but '${bucket.rangeMin.unitToken}' in its range columns.`,
            { sampleId, header: spec.header },
          );
        }

        referenceRange = {
          min,
          max,
          minHeader: bucket.rangeMin.header,
          maxHeader: bucket.rangeMax.header,
          unit: bucket.rangeMin.unitToken,
        };
      }

      measurements.push({
        studyAccession: definition.study.accession,
        studyDoi: definition.study.doi,
        sourceFileName: definition.fileName,
        specimen: definition.specimen,
        assayName: definition.assay.name,
        sampleId,
        participantToken,
        timepointLabel: timepoint,
        analyteKey: spec.analyteKey,
        analyteLabel: analyteLabelFromKey(spec.analyteKey),
        header: spec.header,
        role: spec.role,
        kind: spec.role === "percent" ? "vendor-normalized-value" : "measured-value",
        value,
        missingToken,
        unit: spec.unitToken,
        unitSource: spec.unitToken === null ? null : "column-header",
        referenceRange,
        derivedLookupKey,
      });

      sampleMeasurementCount += 1;
    }

    samples.push({
      sampleId,
      participantToken,
      timepointLabel: timepoint,
      specimen: definition.specimen,
      derivedLookupKey,
      measurementCount: sampleMeasurementCount,
    });
  }

  if (samples.length !== definition.expected.sampleCount) {
    report(
      "unexpected-sample-count",
      "error",
      `Expected ${definition.expected.sampleCount} samples, found ${samples.length}.`,
    );
  }

  const observedTimepoints = OSDR_TIMEPOINTS.filter((timepoint) =>
    samples.some((sample) => sample.timepointLabel === timepoint),
  );

  for (const timepoint of observedTimepoints) {
    if (!definition.documentedTimepoints.includes(timepoint)) {
      const example = samples.find((sample) => sample.timepointLabel === timepoint);
      report(
        "timepoint-not-documented",
        "warning",
        `${definition.study.accession} describes no ${timepoint} collection, but the transformed file contains it.`,
        example ? { sampleId: example.sampleId } : {},
      );
    }
  }

  const participantTokens = [...new Set(samples.map((sample) => sample.participantToken))].sort();
  const participants: OsdrParticipantCoverage[] = participantTokens.map((participantToken) => {
    const participantSamples = samples.filter((sample) => sample.participantToken === participantToken);
    return {
      participantToken,
      sampleCount: participantSamples.length,
      timepoints: OSDR_TIMEPOINTS.filter((timepoint) =>
        participantSamples.some((sample) => sample.timepointLabel === timepoint),
      ),
    };
  });

  for (const timepoint of observedTimepoints) {
    const missing = participants.filter((participant) => !participant.timepoints.includes(timepoint));
    if (missing.length > 0) {
      report(
        "incomplete-participant-coverage",
        "warning",
        `${timepoint} is missing for ${missing.map((participant) => participant.participantToken).join(", ")}.`,
      );
    }
  }

  const dataset: OsdrDataset = {
    ...emptyDataset(definition, integrity),
    samples,
    measurements,
    coverage: {
      sampleCount: samples.length,
      participantTokenCount: participantTokens.length,
      analyteCount: analytes.size,
      measurementCount: measurements.length,
      participantTokens,
      timepointsObserved: observedTimepoints,
      timepointsDocumented: definition.documentedTimepoints,
      participants,
    },
    issues,
  };

  return { dataset, issues, ok: !issues.some((issue) => issue.severity === "error") };
}
