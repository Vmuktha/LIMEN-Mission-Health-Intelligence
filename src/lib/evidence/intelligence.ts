/**
 * Evidence intelligence registry.
 *
 * Five categories are kept structurally distinct:
 *   1. published research findings;
 *   2. NASA study-catalogue metadata;
 *   3. actual downloadable NASA measurement data;
 *   4. user-generated LIMEN observations (runtime only; no sample is invented here);
 *   5. synthetic demonstration scenarios (never presented as real data).
 *
 * A catalogue record carries no downloadable source files. Only a
 * `nasa-downloadable-measurement-data` record can expose source files.
 */

import { scientificEvidenceRegistry } from "./studies";
import type {
  EvidenceAvailability,
  EvidenceKind,
  EvidenceRecord,
  NasaMeasurementDataEvidence,
  NasaStudyCatalogueEvidence,
  PublishedResearchEvidence,
} from "@/types/evidence";

export const EVIDENCE_KIND_LABELS: Readonly<Record<EvidenceKind, string>> = {
  "published-research-finding": "Published research finding",
  "nasa-study-catalogue-metadata": "NASA study catalogue metadata",
  "nasa-downloadable-measurement-data": "Downloadable NASA measurement data",
  "user-generated-observation": "User-generated LIMEN observation",
  "synthetic-demonstration-scenario": "Synthetic demonstration scenario",
};

export const EVIDENCE_AVAILABILITY_LABELS: Readonly<Record<EvidenceAvailability, string>> = {
  public: "Public",
  "request-based": "Request-based",
  restricted: "Restricted",
  unavailable: "Unavailable",
};

const PUBLISHED_METADATA = {
  "clement-2022-mission-critical-tasks": {
    studyDesign: "Structured review and synthesis of mission-critical task considerations",
    riskOrResearchDomain: ["vestibular adaptation", "sensorimotor adaptation", "mission-critical tasks"],
    missionRelevance: ["Gravity-transition task framing", "Risk context for sensorimotor assessment"],
    associatedLimenCapability: ["Mission context framing", "Task-specific metric interpretation"],
    interpretationBoundary: "A published review informs context only; it is not a LIMEN observation, diagnosis, or threshold.",
  },
  "tays-2025-microgravity-sensorimotor-adaptation": {
    studyDesign: "Observational astronaut cohort with Earth-bound controls across preflight, inflight, and postflight timepoints",
    riskOrResearchDomain: ["sensorimotor adaptation", "visuomotor rotation", "neural correlates"],
    missionRelevance: ["Motivates a 45-degree clockwise feedback-rotation task", "Supports descriptive within-person comparison"],
    associatedLimenCapability: ["Assessment task framing", "Baseline-relative descriptive metrics"],
    interpretationBoundary: "The published joystick and MRI protocol is not reproduced by LIMEN; cursor data cannot establish neural activity.",
  },
  "hupfeld-2022-vestibular-reweighting": {
    studyDesign: "Observational astronaut cohort with repeated preflight and postflight measurements",
    riskOrResearchDomain: ["vestibular reweighting", "balance", "spatial orientation"],
    missionRelevance: ["Gravity-transition adaptation and readaptation context"],
    associatedLimenCapability: ["Recovery context only"],
    interpretationBoundary: "LIMEN does not apply vestibular stimulation, perform fMRI, or measure vestibular function.",
  },
  "nasa-human-performance-standard-sensorimotor": {
    studyDesign: "NASA technical human-system standard",
    riskOrResearchDomain: ["human performance", "sensorimotor fitness-for-duty"],
    missionRelevance: ["Operational context for task-specific sensorimotor assessment"],
    associatedLimenCapability: ["Task-specific framing", "Operational boundary statements"],
    interpretationBoundary: "The standard does not validate LIMEN or define a LIMEN threshold, and implies no NASA endorsement.",
  },
  "nasa-cipher-vestibular-health": {
    studyDesign: "NASA research programme description",
    riskOrResearchDomain: ["vestibular health", "longitudinal human research"],
    missionRelevance: ["Programme-level context for longitudinal adaptation research"],
    associatedLimenCapability: ["Context only; no CIPHER data access"],
    interpretationBoundary: "No CIPHER or astronaut-level data are bundled, fetched, or fabricated by LIMEN.",
  },
} as const;

const PUBLISHED_SOURCE_TYPES = {
  "clement-2022-mission-critical-tasks": "peer-reviewed-study",
  "tays-2025-microgravity-sensorimotor-adaptation": "peer-reviewed-study",
  "hupfeld-2022-vestibular-reweighting": "peer-reviewed-study",
  "nasa-human-performance-standard-sensorimotor": "nasa-standard",
  "nasa-cipher-vestibular-health": "nasa-research-programme",
} as const;

export const publishedResearchEvidence: readonly PublishedResearchEvidence[] = scientificEvidenceRegistry.map((study) => {
  const metadata = PUBLISHED_METADATA[study.id as keyof typeof PUBLISHED_METADATA];
  if (!metadata) throw new Error(`Missing Stage 4 evidence metadata for ${study.id}`);
  return {
    ...study,
    // Cross-check the existing source type so a registry edit cannot silently
    // reclassify a standard as a peer-reviewed study.
    sourceType: PUBLISHED_SOURCE_TYPES[study.id as keyof typeof PUBLISHED_SOURCE_TYPES] ?? study.sourceType,
    evidenceKind: "published-research-finding" as const,
    availability: "public" as const,
    ...metadata,
  };
});

const OSDR_AUTHORS = ["NASA Open Science Data Repository (OSDR)"] as const;
const OSDR_POPULATION = {
  description: "Four Inspiration4 crew members; the study reports no control arm for these measurements.",
  sampleSize: 4,
} as const;

export const nasaStudyCatalogueEvidence: readonly NasaStudyCatalogueEvidence[] = [
  {
    id: "osdr-osd-575-catalogue",
    evidenceKind: "nasa-study-catalogue-metadata",
    title: "SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)",
    authorsOrOrganization: OSDR_AUTHORS,
    publicationYear: null,
    doi: "10.26030/mc5d-p710",
    officialUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
    nasaSourceUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
    studyAccession: "OSD-575",
    availability: "public",
    studyDesign: "Observational biospecimen study of four crew members with preflight and postflight serum collection",
    riskOrResearchDomain: ["serum metabolic panel", "cardiovascular biomarkers", "immune biomarkers"],
    missionRelevance: ["Retrospective ground-only biospecimen context"],
    associatedLimenCapability: ["OSDR reference timeline", "Evidence provenance display"],
    researchPopulation: OSDR_POPULATION,
    measurements: ["Comprehensive metabolic panel (19 analytes)", "Cardiovascular 9-plex", "Eve immune 71-plex (archived)", "Alamar NULISA 203-plex (archived)"],
    limitations: ["Catalogue metadata only; it is not a measurement file.", "No in-flight sample exists in the transformed files.", "Four participants and no control arm."],
    interpretationBoundary: "A catalogue record describes a study. It is not a downloadable dataset and is not a LIMEN observation.",
    dataBoundary: "catalogue-record-not-a-downloadable-dataset",
  },
  {
    id: "osdr-osd-569-catalogue",
    evidenceKind: "nasa-study-catalogue-metadata",
    title: "Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC)",
    authorsOrOrganization: OSDR_AUTHORS,
    publicationYear: null,
    doi: "10.26030/e0rx-sh52",
    officialUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
    nasaSourceUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
    studyAccession: "OSD-569",
    availability: "public",
    studyDesign: "Observational whole-blood study of four crew members with preflight and postflight collection",
    riskOrResearchDomain: ["whole blood", "haematology", "gene expression"],
    missionRelevance: ["Retrospective ground-only biospecimen context"],
    associatedLimenCapability: ["OSDR reference timeline", "Evidence provenance display"],
    researchPopulation: OSDR_POPULATION,
    measurements: ["Complete blood count (20 analytes)", "Sequencing and multi-omic assets (not acquired)"],
    limitations: ["Catalogue metadata only; it is not a measurement file.", "Only the transformed CBC file is part of the Stage 3 data layer.", "Four participants and no control arm."],
    interpretationBoundary: "A catalogue record describes a study. It is not a downloadable dataset and is not a LIMEN observation.",
    dataBoundary: "catalogue-record-not-a-downloadable-dataset",
  },
];

export const nasaMeasurementDataEvidence: readonly NasaMeasurementDataEvidence[] = [
  {
    id: "osdr-osd-575-cmp-data",
    evidenceKind: "nasa-downloadable-measurement-data",
    title: "OSD-575 Comprehensive Metabolic Panel — transformed measurements",
    authorsOrOrganization: OSDR_AUTHORS,
    publicationYear: null,
    doi: "10.26030/mc5d-p710",
    officialUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
    nasaSourceUrl: "https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv",
    studyAccession: "OSD-575",
    datasetIds: ["osd-575-cmp"],
    sourceFiles: [{ datasetId: "osd-575-cmp", fileName: "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv", specimen: "serum" }],
    availability: "public",
    studyDesign: "Transformed vendor measurements from a four-person pre/postflight serum study",
    riskOrResearchDomain: ["serum metabolic panel"],
    missionRelevance: ["Retrospective ground-only biological reference timeline"],
    associatedLimenCapability: ["OSDR timeline", "Specimen-specific measurement display"],
    researchPopulation: OSDR_POPULATION,
    measurements: ["19 serum analytes with source-provided reference ranges"],
    limitations: ["Ground-only; no in-flight sample.", "Reference ranges are laboratory values, not clinical decision limits.", "Four participants and no control arm."],
    interpretationBoundary: "NASA measurement data are reference observations. They are not LIMEN records, in-flight monitoring, or medical interpretations.",
    dataBoundary: "nasa-measurement-data-not-a-limen-observation",
  },
  {
    id: "osdr-osd-575-cardiovascular-data",
    evidenceKind: "nasa-downloadable-measurement-data",
    title: "OSD-575 Cardiovascular 9-plex — transformed measurements",
    authorsOrOrganization: OSDR_AUTHORS,
    publicationYear: null,
    doi: "10.26030/mc5d-p710",
    officialUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
    nasaSourceUrl: "https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv",
    studyAccession: "OSD-575",
    datasetIds: ["osd-575-cardiovascular"],
    sourceFiles: [{ datasetId: "osd-575-cardiovascular", fileName: "LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv", specimen: "serum" }],
    availability: "public",
    studyDesign: "Transformed multiplex immunoassay measurements from a four-person pre/postflight serum study",
    riskOrResearchDomain: ["cardiovascular biomarkers"],
    missionRelevance: ["Retrospective ground-only biological reference timeline"],
    associatedLimenCapability: ["OSDR timeline", "Opaque vendor percentage display"],
    researchPopulation: OSDR_POPULATION,
    measurements: ["9 serum analytes; concentration plus opaque vendor percent values"],
    limitations: ["Ground-only; no in-flight sample.", "The vendor percent formula is undocumented and is not interpreted.", "Four participants and no control arm."],
    interpretationBoundary: "NASA measurement data are reference observations. They are not LIMEN records, in-flight monitoring, or medical interpretations.",
    dataBoundary: "nasa-measurement-data-not-a-limen-observation",
  },
  {
    id: "osdr-osd-569-cbc-data",
    evidenceKind: "nasa-downloadable-measurement-data",
    title: "OSD-569 Complete Blood Count — transformed measurements",
    authorsOrOrganization: OSDR_AUTHORS,
    publicationYear: null,
    doi: "10.26030/e0rx-sh52",
    officialUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
    nasaSourceUrl: "https://osdr.nasa.gov/geode-py/ws/studies/OSD-569/download?source=datamanager&file=LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv",
    studyAccession: "OSD-569",
    datasetIds: ["osd-569-cbc"],
    sourceFiles: [{ datasetId: "osd-569-cbc", fileName: "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv", specimen: "whole-blood" }],
    availability: "public",
    studyDesign: "Transformed complete blood count measurements from a four-person pre/postflight whole-blood study",
    riskOrResearchDomain: ["haematology"],
    missionRelevance: ["Retrospective ground-only biological reference timeline"],
    associatedLimenCapability: ["OSDR timeline", "Specimen-specific measurement display"],
    researchPopulation: OSDR_POPULATION,
    measurements: ["20 whole-blood analytes with source-provided reference ranges"],
    limitations: ["Ground-only; no in-flight sample.", "Some MCH, MCHC, and MCV cells are blank in the source and stay missing.", "Four participants and no control arm."],
    interpretationBoundary: "NASA measurement data are reference observations. They are not LIMEN records, in-flight monitoring, or medical interpretations.",
    dataBoundary: "nasa-measurement-data-not-a-limen-observation",
  },
];

/** Full registry. User-generated observations and synthetic scenarios are runtime-only. */
export const evidenceRegistry: readonly EvidenceRecord[] = [
  ...publishedResearchEvidence,
  ...nasaStudyCatalogueEvidence,
  ...nasaMeasurementDataEvidence,
];

export function findEvidenceById(id: string): EvidenceRecord | null {
  return evidenceRegistry.find((record) => record.id === id) ?? null;
}

export function evidenceRecordsByKind(kind: EvidenceKind): readonly EvidenceRecord[] {
  return evidenceRegistry.filter((record) => record.evidenceKind === kind);
}

/** True only for a record that actually represents downloadable NASA measurement data. */
export function isDownloadableMeasurementData(record: EvidenceRecord): record is NasaMeasurementDataEvidence {
  return record.evidenceKind === "nasa-downloadable-measurement-data";
}

/**
 * The single presentation guard: source files are exposed only for measurement
 * data. A catalogue record can never be rendered as a downloadable dataset.
 */
export function evidenceSourceFiles(record: EvidenceRecord): NasaMeasurementDataEvidence["sourceFiles"] {
  return isDownloadableMeasurementData(record) ? record.sourceFiles : [];
}

export function evidenceIsDownloadable(record: EvidenceRecord): boolean {
  return isDownloadableMeasurementData(record);
}
