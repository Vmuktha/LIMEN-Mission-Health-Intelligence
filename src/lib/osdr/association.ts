/**
 * Tentative cross-study association.
 *
 * OSD-575 and OSD-569 share pseudonymous participant tokens (`C001`-`C004`) and
 * the same timepoint labels, but their sample identifiers describe different
 * specimens (`C001_serum_L-3` versus `C001_whole-blood_L-3_cbc`). Any link
 * between them is therefore a metadata-based association, not a verified
 * participant identity, and it must never rewrite either source identifier.
 */

import type { OsdrAssociation, OsdrAssociationResult, OsdrDataset } from "../../types/osdr";

export function associateDatasets(left: OsdrDataset, right: OsdrDataset): OsdrAssociationResult {
  const rightByKey = new Map(right.samples.map((sample) => [sample.derivedLookupKey, sample]));
  const matchedRightKeys = new Set<string>();
  const associations: OsdrAssociation[] = [];
  const unmatchedLeft: string[] = [];

  for (const sample of left.samples) {
    const counterpart = rightByKey.get(sample.derivedLookupKey);
    if (!counterpart) {
      unmatchedLeft.push(sample.sampleId);
      continue;
    }
    matchedRightKeys.add(counterpart.sampleId);
    associations.push({
      participantToken: sample.participantToken,
      timepointLabel: sample.timepointLabel,
      left: { datasetId: left.datasetId, sampleId: sample.sampleId, specimen: left.specimen },
      right: { datasetId: right.datasetId, sampleId: counterpart.sampleId, specimen: right.specimen },
      basis: "shared-pseudonymous-participant-token-and-timepoint-label",
      participantIdentityVerified: false,
      specimenTypesDistinct: left.specimen !== right.specimen,
      derivedLookupKey: sample.derivedLookupKey,
    });
  }

  const unmatchedRight = right.samples
    .filter((sample) => !matchedRightKeys.has(sample.sampleId))
    .map((sample) => sample.sampleId);

  return { associations, unmatchedLeft, unmatchedRight };
}
