import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_AVAILABILITY_LABELS,
  EVIDENCE_KIND_LABELS,
  evidenceIsDownloadable,
  evidenceRecordsByKind,
  evidenceRegistry,
  evidenceSourceFiles,
  findEvidenceById,
  isDownloadableMeasurementData,
  nasaMeasurementDataEvidence,
  nasaStudyCatalogueEvidence,
  publishedResearchEvidence,
} from "@/lib/evidence/intelligence";
import type { EvidenceKind } from "@/types/evidence";

test("the registry distinguishes all five evidence categories and fabricates none", () => {
  assert.deepEqual(Object.keys(EVIDENCE_KIND_LABELS), [
    "published-research-finding",
    "nasa-study-catalogue-metadata",
    "nasa-downloadable-measurement-data",
    "user-generated-observation",
    "synthetic-demonstration-scenario",
  ]);
  assert.deepEqual(Object.keys(EVIDENCE_AVAILABILITY_LABELS), ["public", "request-based", "restricted", "unavailable"]);

  assert.equal(evidenceRegistry.length, 10);
  assert.equal(publishedResearchEvidence.length, 5);
  assert.equal(nasaStudyCatalogueEvidence.length, 2);
  assert.equal(nasaMeasurementDataEvidence.length, 3);
  assert.equal(evidenceRecordsByKind("user-generated-observation").length, 0);
  assert.equal(evidenceRecordsByKind("synthetic-demonstration-scenario").length, 0);
});

test("every published finding declares provenance, design, domain, capability, and interpretation limits", () => {
  for (const record of publishedResearchEvidence) {
    assert.equal(record.evidenceKind, "published-research-finding");
    assert.equal(record.availability, "public");
    assert.equal(record.dataBoundary, "published-evidence-not-a-limen-assessment-record");
    assert.ok(record.title.length > 0);
    assert.ok(record.authorsOrOrganization.length > 0);
    assert.ok(record.studyDesign.length > 0);
    assert.ok(record.riskOrResearchDomain.length > 0);
    assert.ok(record.missionRelevance.length > 0);
    assert.ok(record.associatedLimenCapability.length > 0);
    assert.ok(record.measurements.length > 0);
    assert.ok(record.limitations.length > 0);
    assert.ok(record.interpretationBoundary.length > 0);
    if (record.doi !== undefined) assert.match(record.doi, /^10\./);
  }
});

test("NASA study catalogue records are metadata only and can never expose downloadable files", () => {
  for (const record of nasaStudyCatalogueEvidence) {
    assert.equal(record.evidenceKind, "nasa-study-catalogue-metadata");
    assert.equal(record.dataBoundary, "catalogue-record-not-a-downloadable-dataset");
    assert.equal(record.availability, "public");
    assert.equal(record.researchPopulation.sampleSize, 4);
    assert.ok(record.studyAccession === "OSD-569" || record.studyAccession === "OSD-575");
    assert.equal("sourceFiles" in record, false);
    assert.equal("datasetIds" in record, false);
    assert.deepEqual(evidenceSourceFiles(record), []);
    assert.equal(evidenceIsDownloadable(record), false);
    assert.equal(isDownloadableMeasurementData(record), false);
  }
});

test("only actual NASA measurement-data records expose the source files they declare", () => {
  assert.equal(evidenceSourceFiles(publishedResearchEvidence[0]).length, 0);

  const expected = [
    { id: "osdr-osd-575-cmp-data", datasetId: "osd-575-cmp", specimen: "serum", accession: "OSD-575" },
    { id: "osdr-osd-575-cardiovascular-data", datasetId: "osd-575-cardiovascular", specimen: "serum", accession: "OSD-575" },
    { id: "osdr-osd-569-cbc-data", datasetId: "osd-569-cbc", specimen: "whole-blood", accession: "OSD-569" },
  ] as const;

  for (const entry of expected) {
    const record = findEvidenceById(entry.id);
    assert.ok(record);
    assert.equal(record.evidenceKind, "nasa-downloadable-measurement-data");
    assert.equal(isDownloadableMeasurementData(record), true);
    assert.equal(evidenceIsDownloadable(record), true);
    assert.equal(record.dataBoundary, "nasa-measurement-data-not-a-limen-observation");
    assert.equal(record.studyAccession, entry.accession);

    const files = evidenceSourceFiles(record);
    assert.equal(files.length, 1);
    assert.equal(files[0].datasetId, entry.datasetId);
    assert.equal(files[0].specimen, entry.specimen);
    assert.ok(files[0].fileName.endsWith(".csv"));
  }
});

test("catalogue and measurement records remain separate records with distinct identifiers", () => {
  const catalogueIds = new Set(nasaStudyCatalogueEvidence.map((record) => record.id));
  for (const record of nasaMeasurementDataEvidence) {
    assert.equal(catalogueIds.has(record.id), false);
    assert.ok(record.datasetIds.length > 0);
    assert.ok(record.doi.startsWith("10."));
    assert.match(record.officialUrl, /^https:\/\/osdr\.nasa\.gov\//);
  }
});

test("lookup returns null for unknown identifiers and exact records otherwise", () => {
  assert.equal(findEvidenceById("not-a-record"), null);
  const record = findEvidenceById("osdr-osd-569-catalogue");
  assert.ok(record);
  assert.equal(record.id, "osdr-osd-569-catalogue");
});

test("kind filtering never mixes categories", () => {
  const kinds: readonly EvidenceKind[] = [
    "published-research-finding",
    "nasa-study-catalogue-metadata",
    "nasa-downloadable-measurement-data",
    "user-generated-observation",
    "synthetic-demonstration-scenario",
  ];
  for (const kind of kinds) {
    for (const record of evidenceRecordsByKind(kind)) {
      assert.equal(record.evidenceKind, kind);
    }
  }
});

test("unverified identifiers stay absent rather than being invented", () => {
  for (const record of publishedResearchEvidence) {
    assert.ok(record.pmid === undefined || /^\d+$/.test(record.pmid));
    assert.ok(record.pmcid === undefined || /^PMC\d+$/.test(record.pmcid));
    if (record.officialUrl !== undefined) assert.match(record.officialUrl, /^https:\/\//);
  }
  for (const record of nasaStudyCatalogueEvidence) {
    assert.equal(record.publicationYear, null, "an ongoing programme must not be given a fabricated year");
  }
});
