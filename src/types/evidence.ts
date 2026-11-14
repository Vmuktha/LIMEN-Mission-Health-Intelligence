export type EvidenceSourceType = "peer-reviewed-study" | "nasa-standard" | "nasa-research-programme";

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
