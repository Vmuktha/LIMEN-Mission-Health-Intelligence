import type { AssessmentSession, AssessmentSessionStatus, InputDevice } from "@/types/assessment";
import type { SymptomCheckInRecord } from "@/types/checkin";
import type { MeasurementProtocolVersion, TrialPhase, TrialRecord } from "@/types/trial";
import { assessmentSession, completedTrial } from "./test-fixtures";

export const V1 = "0.1.0-legacy-origin-unverified" as const;
export const V2 = "0.2.0-actual-pointer-origin" as const;
export const V3 = "0.3.0-actual-pointer-origin-hidden-cursor" as const;
export const PARTICIPANT = "browser-participant";
export const BASE_TIME = Date.parse("2026-01-01T00:00:00.000Z");

const PROTOCOL_BY_MEASUREMENT_VERSION: Readonly<Record<MeasurementProtocolVersion, string>> = {
  [V1]: "0.1.0",
  [V2]: "0.2.0",
  [V3]: "0.3.0",
};

const DEFAULT_PHASES: readonly TrialPhase[] = ["baseline", "baseline", "early-adaptation", "early-adaptation", "late-adaptation", "late-adaptation", "de-adaptation", "de-adaptation"];

export interface RecoverySessionOptions {
  readonly sessionId: string;
  readonly participantId?: string;
  readonly completedAt?: string | null;
  readonly createdAt?: string;
  readonly measurementVersion?: MeasurementProtocolVersion;
  readonly protocolVersion?: string;
  readonly trials?: readonly TrialRecord[];
  readonly status?: AssessmentSessionStatus;
  readonly inputDevice?: InputDevice;
}

export function recoverySession(options: RecoverySessionOptions): AssessmentSession {
  const measurementVersion = options.measurementVersion ?? V2;
  const protocolVersion = options.protocolVersion ?? PROTOCOL_BY_MEASUREMENT_VERSION[measurementVersion];
  const completedAt = options.completedAt === undefined ? "2026-01-01T00:10:00.000Z" : options.completedAt;
  const sourceTrials = options.trials ?? DEFAULT_PHASES.map((phase, index) => tunedTrial({ phase, index }));
  const trials = sourceTrials.map((trial, index) => normalizeTrial(trial, options.sessionId, index, measurementVersion));
  return assessmentSession(trials, protocolVersion, {
    status: options.status ?? "completed",
    metadata: {
      sessionId: options.sessionId,
      participantId: options.participantId ?? PARTICIPANT,
      createdAt: options.createdAt ?? "2025-12-31T23:00:00.000Z",
      completedAt,
      inputDevice: options.inputDevice ?? "mouse",
      protocolVersion,
      provenance: "browser-user-generated",
      simulated: false,
    },
  });
}

export function tunedTrial(options: {
  readonly reactionMs?: number;
  readonly movementMs?: number;
  readonly directionalErrorDegrees?: number;
  readonly phase?: TrialPhase;
  readonly index?: number;
  readonly outcome?: TrialRecord["outcome"];
} = {}): TrialRecord {
  const reactionMs = options.reactionMs ?? 100;
  const movementMs = options.movementMs ?? 200;
  const directionalErrorDegrees = options.directionalErrorDegrees ?? 0;
  const targetPresentedAt = new Date(BASE_TIME).toISOString();
  const movementOnsetAt = new Date(BASE_TIME + reactionMs).toISOString();
  const movementCompletedAt = new Date(BASE_TIME + reactionMs + movementMs).toISOString();
  const angle = ((-90 + directionalErrorDegrees) * Math.PI) / 180;
  return completedTrial({
    phase: options.phase ?? "baseline",
    index: options.index ?? 0,
    outcome: options.outcome ?? "completed",
    targetPresentedAt,
    movementOnsetAt,
    movementCompletedAt,
    trajectory: [{ x: 10 * Math.cos(angle), y: 10 * Math.sin(angle), elapsedMs: 100 }],
  });
}

export function timedOutTrial(phase: TrialPhase = "baseline", index = 0): TrialRecord {
  return completedTrial({
    phase,
    index,
    outcome: "timed-out",
    movementOnsetAt: null,
    movementCompletedAt: null,
    trajectory: [],
  });
}

export function recoveryCheckIn(overrides: Partial<SymptomCheckInRecord> = {}): SymptomCheckInRecord {
  return {
    id: "checkin-1",
    participantId: PARTICIPANT,
    recordedAt: "2026-01-01T00:10:00.000Z",
    context: "post-assessment",
    provenance: "browser-user-generated",
    interpretation: "self-report-not-an-objective-vestibular-measurement",
    ...overrides,
  };
}

function normalizeTrial(trial: TrialRecord, sessionId: string, index: number, measurementVersion: MeasurementProtocolVersion): TrialRecord {
  const withIdentity: TrialRecord = {
    ...trial,
    id: `${sessionId}-trial-${index}`,
    sessionId,
    index,
  };
  return measurementVersion === V1
    ? { ...withIdentity, measurementProtocolVersion: V1, actualStartPosition: undefined, positioningCompletedAt: undefined }
    : { ...withIdentity, measurementProtocolVersion: measurementVersion };
}
