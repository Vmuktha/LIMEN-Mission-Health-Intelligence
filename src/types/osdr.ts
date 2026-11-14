/**
 * Typed contracts for the NASA OSDR reference datasets.
 *
 * These records describe transformed, study-level biospecimen measurements that
 * NASA publishes under CC0 1.0. They are reference evidence about four
 * Inspiration4 crew members, not telemetry, not a clinical dataset, and not an
 * input to any LIMEN score.
 *
 * The model is deliberately lossless in the places that matter for scientific
 * honesty: original sample identifiers, original headers, original missing-value
 * tokens, and source-provided reference ranges are all preserved verbatim.
 */

export type OsdrStudyAccession = "OSD-569" | "OSD-575";

export type OsdrDatasetId = "osd-569-cbc" | "osd-575-cmp" | "osd-575-cardiovascular";

export type OsdrSpecimenType = "whole-blood" | "serum";

export type OsdrTimepointLabel =
  | "L-92"
  | "L-44"
  | "L-3"
  | "R+1"
  | "R+45"
  | "R+82"
  | "R+194";

/** The literal token the source file uses to represent an absent measurement. */
export type OsdrMissingToken = "NA" | "N/A" | "empty";

export type OsdrColumnRole =
  | "value"
  | "range-min"
  | "range-max"
  | "concentration"
  | "percent";

export type OsdrMeasurementKind = "measured-value" | "vendor-normalized-value";

export type OsdrIssueSeverity = "error" | "warning";

export type OsdrIssueCode =
  | "csv-parse-error"
  | "missing-header"
  | "unexpected-column"
  | "ambiguous-unit"
  | "incomplete-analyte-columns"
  | "unexpected-analyte-count"
  | "unexpected-measurement-column-count"
  | "malformed-row"
  | "unparseable-sample-id"
  | "unrecognized-timepoint"
  | "duplicate-sample-id"
  | "non-numeric-value"
  | "timepoint-not-documented"
  | "incomplete-participant-coverage"
  | "reference-range-unit-mismatch"
  | "unexpected-sample-count";

export interface OsdrIssue {
  readonly code: OsdrIssueCode;
  readonly severity: OsdrIssueSeverity;
  readonly message: string;
  readonly sampleId?: string;
  readonly header?: string;
}

export interface OsdrLicence {
  readonly id: "CC0-1.0";
  readonly name: string;
  readonly url: string;
}

export interface OsdrStudyRecord {
  readonly accession: OsdrStudyAccession;
  readonly doi: string;
  readonly doiUrl: string;
  readonly title: string;
  readonly recordUrl: string;
  readonly licence: OsdrLicence;
  readonly attribution: string;
}

export interface OsdrSourceFile {
  readonly fileName: string;
  /** Repository-relative path of the unmodified source file. */
  readonly relativePath: string;
  readonly downloadUrl: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly retrievedOn: string;
}

export interface OsdrAssayRecord {
  readonly name: string;
  readonly platform: string;
  readonly vendor: string;
  readonly analyteCount: number;
  readonly measurementColumnCount: number;
}

/**
 * Reference ranges are exactly what the laboratory reported for that row. They
 * vary per sample, are not clinical decision limits, and are never evaluated.
 */
export interface OsdrReferenceRange {
  readonly min: number | null;
  readonly max: number | null;
  readonly minHeader: string;
  readonly maxHeader: string;
  readonly unit: string | null;
}

export interface OsdrMeasurement {
  /** Study-level provenance repeated on every record so a single record is self-describing. */
  readonly studyAccession: OsdrStudyAccession;
  readonly studyDoi: string;
  readonly sourceFileName: string;
  readonly specimen: OsdrSpecimenType;
  readonly assayName: string;
  /** Original identifier from the CSV. Never rewritten by the application. */
  readonly sampleId: string;
  /** Parsed from the sample identifier; a derived token, not a study-wide identity. */
  readonly participantToken: string;
  readonly timepointLabel: OsdrTimepointLabel;
  readonly analyteKey: string;
  readonly analyteLabel: string;
  /** Original, unmodified column header. */
  readonly header: string;
  readonly role: OsdrColumnRole;
  readonly kind: OsdrMeasurementKind;
  /** Null whenever `missingToken` is set. Missing is never coerced to zero. */
  readonly value: number | null;
  readonly missingToken: OsdrMissingToken | null;
  /** Unit token parsed from the header suffix, or null when the header has none. */
  readonly unit: string | null;
  readonly unitSource: "column-header" | null;
  readonly referenceRange: OsdrReferenceRange | null;
  /** `participantToken` + `timepointLabel`; a runtime key, never an identifier. */
  readonly derivedLookupKey: string;
}

export interface OsdrSample {
  readonly sampleId: string;
  readonly participantToken: string;
  readonly timepointLabel: OsdrTimepointLabel;
  readonly specimen: OsdrSpecimenType;
  readonly derivedLookupKey: string;
  readonly measurementCount: number;
}

export interface OsdrParticipantCoverage {
  readonly participantToken: string;
  readonly sampleCount: number;
  readonly timepoints: readonly OsdrTimepointLabel[];
}

export interface OsdrCoverage {
  readonly sampleCount: number;
  readonly participantTokenCount: number;
  readonly analyteCount: number;
  readonly measurementCount: number;
  readonly participantTokens: readonly string[];
  readonly timepointsObserved: readonly OsdrTimepointLabel[];
  readonly timepointsDocumented: readonly OsdrTimepointLabel[];
  readonly participants: readonly OsdrParticipantCoverage[];
}

export interface OsdrTransformation {
  readonly sourceFormat: "wide";
  readonly outputFormat: "long";
  readonly derivedLookupKeyRule: string;
  readonly missingValuePolicy: string;
  readonly unitPolicy: string;
  readonly referenceRangePolicy: string;
  readonly percentFieldPolicy: string;
  readonly generatedBy: string;
}

export interface OsdrDataset {
  readonly schemaVersion: "1.0.0";
  readonly datasetId: OsdrDatasetId;
  readonly study: OsdrStudyRecord;
  readonly source: OsdrSourceFile;
  readonly assay: OsdrAssayRecord;
  readonly specimen: OsdrSpecimenType;
  readonly samples: readonly OsdrSample[];
  readonly measurements: readonly OsdrMeasurement[];
  readonly coverage: OsdrCoverage;
  readonly issues: readonly OsdrIssue[];
  readonly transformation: OsdrTransformation;
}

export interface OsdrManifestEntry {
  readonly datasetId: OsdrDatasetId;
  readonly studyAccession: OsdrStudyAccession;
  readonly specimen: OsdrSpecimenType;
  readonly fileName: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly sampleCount: number;
  readonly analyteCount: number;
  readonly measurementCount: number;
  readonly processedFile: string;
  readonly issueCount: number;
  readonly errorCount: number;
}

export interface OsdrManifest {
  readonly schemaVersion: "1.0.0";
  readonly generatedBy: string;
  readonly sourceDirectory: string;
  readonly datasets: readonly OsdrManifestEntry[];
}

/**
 * A tentative, metadata-based link between one sample in each of two studies.
 * The link is derived from shared pseudonymous participant tokens and timepoint
 * labels. It is not an independently verified participant identity, and it never
 * replaces either original sample identifier.
 */
export interface OsdrAssociationSide {
  readonly datasetId: OsdrDatasetId;
  readonly sampleId: string;
  readonly specimen: OsdrSpecimenType;
}

export interface OsdrAssociation {
  readonly participantToken: string;
  readonly timepointLabel: OsdrTimepointLabel;
  readonly left: OsdrAssociationSide;
  readonly right: OsdrAssociationSide;
  readonly basis: "shared-pseudonymous-participant-token-and-timepoint-label";
  readonly participantIdentityVerified: false;
  readonly specimenTypesDistinct: boolean;
  readonly derivedLookupKey: string;
}

export interface OsdrAssociationResult {
  readonly associations: readonly OsdrAssociation[];
  readonly unmatchedLeft: readonly string[];
  readonly unmatchedRight: readonly string[];
}
