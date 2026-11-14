import type { OsdrDatasetId, OsdrSpecimenType } from "./osdr";

export type EvidenceSourceType = "peer-reviewed-study" | "nasa-standard" | "nasa-research-programme";

/**
 * Five distinct evidence categories. A study-catalogue record is never the same
 * thing as a downloadable measurement file, and neither is a LIMEN observation.
 */
export type EvidenceKind =
  | "published-research-finding"
  | "nasa-study-catalogue-metadata"
  | "nasa-downloadable-measurement-data"
  | "user-generated-observation"
  | "synthetic-demonstration-scenario";

export type EvidenceAvailability = "public" | "request-based" | "restricted" | "unavailable";

export interface ResearchPopulation {
  readonly description: string;
  /** Null intentionally represents a source that does not report one verified cohort size. */
  readonly sampleSize: number | null;
}

export interface ScientificStudy {
  readonly id: string;
  readonly sourceType: EvidenceSourceType;
  readonly title: string;
  readonly authorsOrOrganization: readonly string[];
  /** Null is used only when an ongoing programme has no single publication year. */
  readonly publicationYear: number | null;
  readonly doi?: string;
  readonly officialUrl?: string;
  readonly researchPopulation: ResearchPopulation;
  readonly methodology: readonly string[];
  readonly measurements: readonly string[];
  readonly mainReportedFindings: readonly string[];
  readonly relevanceToLimen: readonly string[];
  readonly limitations: readonly string[];
  readonly dataBoundary: "published-evidence-not-a-limen-assessment-record";
}

/** Fields every Stage 4 evidence record must declare, regardless of category. */
export interface EvidenceRecordMetadata {
  readonly evidenceKind: EvidenceKind;
  readonly availability: EvidenceAvailability;
  readonly studyDesign: string;
  readonly riskOrResearchDomain: readonly string[];
  readonly missionRelevance: readonly string[];
  readonly associatedLimenCapability: readonly string[];
  readonly measurements: readonly string[];
  readonly limitations: readonly string[];
  readonly interpretationBoundary: string;
  readonly pmid?: string;
  readonly pmcid?: string;
  readonly nasaSourceUrl?: string;
}

export type PublishedResearchEvidence = ScientificStudy & EvidenceRecordMetadata & {
  readonly evidenceKind: "published-research-finding";
};

export interface NasaStudyCatalogueEvidence extends EvidenceRecordMetadata {
  readonly id: string;
  readonly evidenceKind: "nasa-study-catalogue-metadata";
  readonly title: string;
  readonly authorsOrOrganization: readonly string[];
  readonly publicationYear: number | null;
  readonly doi?: string;
  readonly officialUrl?: string;
  readonly studyAccession: "OSD-569" | "OSD-575";
  readonly researchPopulation: ResearchPopulation;
  readonly dataBoundary: "catalogue-record-not-a-downloadable-dataset";
}

export interface NasaSourceFileReference {
  readonly datasetId: OsdrDatasetId;
  readonly fileName: string;
  readonly specimen: OsdrSpecimenType;
}

export interface NasaMeasurementDataEvidence extends EvidenceRecordMetadata {
  readonly id: string;
  readonly evidenceKind: "nasa-downloadable-measurement-data";
  readonly title: string;
  readonly authorsOrOrganization: readonly string[];
  readonly publicationYear: number | null;
  readonly doi: string;
  readonly officialUrl: string;
  readonly studyAccession: "OSD-569" | "OSD-575";
  readonly datasetIds: readonly OsdrDatasetId[];
  readonly sourceFiles: readonly NasaSourceFileReference[];
  readonly researchPopulation: ResearchPopulation;
  readonly dataBoundary: "nasa-measurement-data-not-a-limen-observation";
}

export interface UserGeneratedObservationEvidence extends EvidenceRecordMetadata {
  readonly id: string;
  readonly evidenceKind: "user-generated-observation";
  readonly title: string;
  readonly authorsOrOrganization: readonly string[];
  readonly publicationYear: number | null;
  readonly participantId: string;
  readonly recordedAt: string;
  readonly dataBoundary: "user-generated-observation-not-clinical-evidence";
}

export interface SyntheticScenarioEvidence extends EvidenceRecordMetadata {
  readonly id: string;
  readonly evidenceKind: "synthetic-demonstration-scenario";
  readonly title: string;
  readonly authorsOrOrganization: readonly string[];
  readonly publicationYear: number | null;
  readonly simulated: true;
  readonly dataBoundary: "synthetic-demonstration-not-real-observation";
}

export type EvidenceRecord =
  | PublishedResearchEvidence
  | NasaStudyCatalogueEvidence
  | NasaMeasurementDataEvidence
  | UserGeneratedObservationEvidence
  | SyntheticScenarioEvidence;
