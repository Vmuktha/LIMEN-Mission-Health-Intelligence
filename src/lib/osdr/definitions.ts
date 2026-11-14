/**
 * Declarative definitions of the OSDR datasets that LIMEN consumes.
 *
 * Everything here is copied from the official OSDR record, the DOI registration,
 * or the ISA metadata shipped with the study. Counts and documented timepoints
 * are asserted against the files themselves during generation.
 */

import type {
  OsdrAssayRecord,
  OsdrDatasetId,
  OsdrSpecimenType,
  OsdrStudyAccession,
  OsdrStudyRecord,
  OsdrTimepointLabel,
} from "../../types/osdr";
import type { OsdrColumnShape } from "./columns";

export const OSDR_RETRIEVED_ON = "2026-11-14";

export const OSDR_LICENCE = {
  id: "CC0-1.0",
  name: "Creative Commons Zero v1.0 Universal",
  url: "https://creativecommons.org/publicdomain/zero/1.0/legalcode",
} as const;

export const OSDR_STUDIES: Readonly<Record<OsdrStudyAccession, OsdrStudyRecord>> = {
  "OSD-575": {
    accession: "OSD-575",
    doi: "10.26030/mc5d-p710",
    doiUrl: "https://doi.org/10.26030/mc5d-p710",
    title:
      "SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex)",
    recordUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575",
    licence: OSDR_LICENCE,
    attribution:
      "NASA Open Science Data Repository (OSDR), OSD-575, DOI 10.26030/mc5d-p710, CC0 1.0.",
  },
  "OSD-569": {
    accession: "OSD-569",
    doi: "10.26030/e0rx-sh52",
    doiUrl: "https://doi.org/10.26030/e0rx-sh52",
    title:
      "Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC)",
    recordUrl: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-569",
    licence: OSDR_LICENCE,
    attribution:
      "NASA Open Science Data Repository (OSDR), OSD-569, DOI 10.26030/e0rx-sh52, CC0 1.0.",
  },
};

export const OSDR_TIMEPOINTS: readonly OsdrTimepointLabel[] = [
  "L-92",
  "L-44",
  "L-3",
  "R+1",
  "R+45",
  "R+82",
  "R+194",
];

/**
 * Timepoints named in each study's own description. OSD-575 describes
 * collections through R+82 only, while its transformed files contain R+194;
 * the difference is reported as a warning and is not resolved by assumption.
 */
export const OSDR_DOCUMENTED_TIMEPOINTS: Readonly<Record<OsdrStudyAccession, readonly OsdrTimepointLabel[]>> = {
  "OSD-575": ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82"],
  "OSD-569": ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"],
};

export interface OsdrExpectedShape {
  readonly sampleCount: number;
  readonly participantTokens: readonly string[];
  readonly analyteCount: number;
  readonly measurementColumnCount: number;
}

export interface OsdrDatasetDefinition {
  readonly datasetId: OsdrDatasetId;
  readonly study: OsdrStudyRecord;
  readonly specimen: OsdrSpecimenType;
  readonly assay: OsdrAssayRecord;
  readonly fileName: string;
  readonly relativePath: string;
  readonly downloadUrl: string;
  readonly columnShape: OsdrColumnShape;
  readonly documentedTimepoints: readonly OsdrTimepointLabel[];
  readonly expected: OsdrExpectedShape;
}

const OSDR_DOWNLOAD_BASE = "https://osdr.nasa.gov/geode-py/ws/studies";

function downloadUrl(study: OsdrStudyAccession, fileName: string): string {
  return `${OSDR_DOWNLOAD_BASE}/${study}/download?source=datamanager&file=${fileName}`;
}

const CMP_FILE = "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv";
const CARDIOVASCULAR_FILE = "LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv";
const CBC_FILE = "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv";

export const OSDR_DATASET_DEFINITIONS: readonly OsdrDatasetDefinition[] = [
  {
    datasetId: "osd-575-cmp",
    study: OSDR_STUDIES["OSD-575"],
    specimen: "serum",
    assay: {
      name: "Comprehensive Metabolic Panel",
      platform: "Beckman Coulter AU5800",
      vendor: "Quest Diagnostics",
      analyteCount: 19,
      measurementColumnCount: 57,
    },
    fileName: CMP_FILE,
    relativePath: `data/raw/osdr/OSD-575/${CMP_FILE}`,
    downloadUrl: downloadUrl("OSD-575", CMP_FILE),
    columnShape: "value-range",
    documentedTimepoints: OSDR_DOCUMENTED_TIMEPOINTS["OSD-575"],
    expected: {
      sampleCount: 28,
      participantTokens: ["C001", "C002", "C003", "C004"],
      analyteCount: 19,
      measurementColumnCount: 57,
    },
  },
  {
    datasetId: "osd-575-cardiovascular",
    study: OSDR_STUDIES["OSD-575"],
    specimen: "serum",
    assay: {
      name: "Cardiovascular 9-plex (HDCVD9)",
      platform: "Eve Technologies multiplex immunoassay",
      vendor: "Eve Technologies",
      analyteCount: 9,
      measurementColumnCount: 18,
    },
    fileName: CARDIOVASCULAR_FILE,
    relativePath: `data/raw/osdr/OSD-575/${CARDIOVASCULAR_FILE}`,
    downloadUrl: downloadUrl("OSD-575", CARDIOVASCULAR_FILE),
    columnShape: "concentration-percent",
    documentedTimepoints: OSDR_DOCUMENTED_TIMEPOINTS["OSD-575"],
    expected: {
      sampleCount: 28,
      participantTokens: ["C001", "C002", "C003", "C004"],
      analyteCount: 9,
      measurementColumnCount: 18,
    },
  },
  {
    datasetId: "osd-569-cbc",
    study: OSDR_STUDIES["OSD-569"],
    specimen: "whole-blood",
    assay: {
      name: "Complete Blood Count",
      platform: "Sysmex XN Analyzer",
      vendor: "Quest Diagnostics",
      analyteCount: 20,
      measurementColumnCount: 60,
    },
    fileName: CBC_FILE,
    relativePath: `data/raw/osdr/OSD-569/${CBC_FILE}`,
    downloadUrl: downloadUrl("OSD-569", CBC_FILE),
    columnShape: "value-range",
    documentedTimepoints: OSDR_DOCUMENTED_TIMEPOINTS["OSD-569"],
    expected: {
      sampleCount: 28,
      participantTokens: ["C001", "C002", "C003", "C004"],
      analyteCount: 20,
      measurementColumnCount: 60,
    },
  },
];

export interface OsdrArchivedSource {
  readonly studyAccession: OsdrStudyAccession;
  readonly fileName: string;
  readonly relativePath: string;
  readonly reason: string;
}

/**
 * Downloaded, documented, and intentionally outside the application data layer.
 * They stay in `data/raw/osdr/` and are never parsed into the typed model.
 */
export const OSDR_ARCHIVED_SOURCES: readonly OsdrArchivedSource[] = [
  {
    studyAccession: "OSD-575",
    fileName: "LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv",
    relativePath: "data/raw/osdr/OSD-575/LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv",
    reason: "71-plex HD71 immune panel; archived until a consumer exists.",
  },
  {
    studyAccession: "OSD-575",
    fileName: "LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv",
    relativePath: "data/raw/osdr/OSD-575/LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv",
    reason: "203-analyte NULISA panel; largest and least documented; archived.",
  },
];
