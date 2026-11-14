import type { AssessmentSession } from "@/types/assessment";
import type { MeasurementProtocolVersion, TrialRecord } from "@/types/trial";

export type MeasurementValidity =
  | "corrected-actual-origin"
  | "legacy-origin-unverified"
  | "mixed-measurement-protocols"
  | "inconsistent-origin-provenance"
  | "inconsistent-session-protocol"
  | "unknown-protocol"
  | "no-trials";

export type TrialMeasurementProtocolKey = MeasurementProtocolVersion | "unknown";

/**
 * Both v0.2.0 and v0.3.0 capture an actual origin through positioning, but they
 * differ in cursor visibility. They are never treated as one pooled protocol
 * group unless a caller explicitly compares identical versions.
 */
const CORRECTED_MEASUREMENT_PROTOCOLS: ReadonlySet<MeasurementProtocolVersion> = new Set([
  "0.2.0-actual-pointer-origin",
  "0.3.0-actual-pointer-origin-hidden-cursor",
]);

/** Runtime guard for stored records whose label may predate or postdate this build. */
const KNOWN_MEASUREMENT_PROTOCOLS: ReadonlySet<string> = new Set([
  "0.1.0-legacy-origin-unverified",
  "0.2.0-actual-pointer-origin",
  "0.3.0-actual-pointer-origin-hidden-cursor",
]);

const PROTOCOL_VERSION_BY_MEASUREMENT_VERSION: Readonly<Record<MeasurementProtocolVersion, string>> = {
  "0.1.0-legacy-origin-unverified": "0.1.0",
  "0.2.0-actual-pointer-origin": "0.2.0",
  "0.3.0-actual-pointer-origin-hidden-cursor": "0.3.0",
};

/**
 * A verified-origin label requires, in addition to a corrected protocol label,
 * a finite captured actual start and a real positioning completion timestamp.
 */
export function isCorrectedOriginTrial(trial: TrialRecord): boolean {
  if (!trial.measurementProtocolVersion || !CORRECTED_MEASUREMENT_PROTOCOLS.has(trial.measurementProtocolVersion)) return false;
  const start = trial.actualStartPosition;
  if (!start || !Number.isFinite(start.x) || !Number.isFinite(start.y)) return false;
  return typeof trial.positioningCompletedAt === "string" && Number.isFinite(Date.parse(trial.positioningCompletedAt));
}

function trialProtocolKey(trial: TrialRecord): TrialMeasurementProtocolKey {
  return trial.measurementProtocolVersion ?? "unknown";
}

/** Distinct measurement protocol versions present in the supplied trials. */
export function measurementProtocolVersionsForTrials(trials: readonly TrialRecord[]): readonly TrialMeasurementProtocolKey[] {
  return [...new Set(trials.map(trialProtocolKey))];
}

function homogeneousMeasurementProtocolVersion(trials: readonly TrialRecord[]): MeasurementProtocolVersion | null {
  const versions = measurementProtocolVersionsForTrials(trials);
  if (versions.length !== 1) return null;
  const version = versions[0];
  return version === "unknown" ? null : version;
}

/**
 * Validity is protocol-aware. A collection is comparable only when every trial
 * shares exactly one known measurement protocol version. Corrected versions
 * additionally require every trial to have verified origin provenance.
 */
export function measurementValidityForTrials(trials: readonly TrialRecord[]): MeasurementValidity {
  if (trials.length === 0) return "no-trials";
  const versions = measurementProtocolVersionsForTrials(trials);
  if (versions.length > 1) return "mixed-measurement-protocols";
  const version = versions[0];
  if (version === "unknown" || !KNOWN_MEASUREMENT_PROTOCOLS.has(version)) return "unknown-protocol";
  if (!CORRECTED_MEASUREMENT_PROTOCOLS.has(version)) return "legacy-origin-unverified";
  return trials.every(isCorrectedOriginTrial) ? "corrected-actual-origin" : "inconsistent-origin-provenance";
}

/**
 * Session-level validity also cross-checks the stored session protocol version
 * against the trial-level measurement protocol version. Unknown, missing, or
 * mismatched versions are withheld conservatively.
 */
export function measurementValidityForSession(session: AssessmentSession): MeasurementValidity {
  const trialValidity = measurementValidityForTrials(session.trials);
  if (trialValidity === "no-trials" || trialValidity === "mixed-measurement-protocols") return trialValidity;
  const metadataVersion = session.metadata.protocolVersion?.trim();
  if (!metadataVersion) return "inconsistent-session-protocol";
  if (trialValidity === "unknown-protocol") {
    // Historical records written before per-trial labels existed can only be
    // accepted as legacy when the stored session itself identifies v0.1.0.
    // A known corrected session label never upgrades unversioned trials.
    return metadataVersion === "0.1.0" ? "legacy-origin-unverified" : "unknown-protocol";
  }
  const trialVersion = homogeneousMeasurementProtocolVersion(session.trials);
  if (!trialVersion) return "inconsistent-session-protocol";
  if (PROTOCOL_VERSION_BY_MEASUREMENT_VERSION[trialVersion] !== metadataVersion) return "inconsistent-session-protocol";
  return trialValidity;
}

/**
 * Direct comparison is supported only when both trials are origin-verified and
 * share the same explicit measurement protocol. Two legacy records with equal
 * labels are not comparable for origin-sensitive metrics.
 */
export function measurementProtocolsAreComparable(left: TrialRecord | undefined, right: TrialRecord | undefined): boolean {
  return Boolean(left && right && isCorrectedOriginTrial(left) && isCorrectedOriginTrial(right) && left.measurementProtocolVersion === right.measurementProtocolVersion);
}

/** Timing metrics require a homogeneous protocol but not a verified origin. */
export function allowsTimingMetrics(validity: MeasurementValidity): boolean {
  return validity === "corrected-actual-origin" || validity === "legacy-origin-unverified" || validity === "inconsistent-origin-provenance";
}

/** Origin-sensitive metrics require a homogeneous, fully verified corrected protocol. */
export function allowsOriginSensitiveMetrics(validity: MeasurementValidity): boolean {
  return validity === "corrected-actual-origin";
}
