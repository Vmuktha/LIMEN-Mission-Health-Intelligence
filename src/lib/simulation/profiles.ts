import type { SimulationScenario } from "@/types/simulation";
import { getAsterOneScenario } from "./scenario";
import { getClaraReyesScenario } from "./clara-scenario";

export type AstronautId = "mara-venn" | "clara-reyes";

export interface FictionalMeasurement {
  readonly label: string;
  readonly value: string;
  readonly sourceId: string;
  readonly recordedAt: string;
  readonly provenance: "synthetic-profile-fixture";
}

export interface SimulationAstronautProfile {
  readonly id: AstronautId;
  readonly name: string;
  readonly crewIdentifier: string;
  readonly ageAtLaunch: number;
  readonly missionRole: string;
  readonly missionAssignment: string;
  readonly currentPhase: string;
  readonly missionDay: number;
  readonly portrait: string;
  readonly profileSourceId: string;
  readonly profileRecordedAt: string;
  readonly anthropometrics: readonly FictionalMeasurement[];
  readonly physicalAssessmentNote: string;
  readonly scenario: SimulationScenario;
}

const maraScenario = getAsterOneScenario();
const claraScenario = getClaraReyesScenario();

export const SIMULATION_PROFILES: readonly SimulationAstronautProfile[] = [
  {
    id: "mara-venn",
    name: "Dr. Mara Venn",
    crewIdentifier: "ASTER-1 · CREW M-04",
    ageAtLaunch: 41,
    missionRole: "Mission specialist",
    missionAssignment: "Aster-1 · 28-day orbital research mission",
    currentPhase: "Postflight follow-up",
    missionDay: 42,
    portrait: "/images/simulation/mara-venn.png",
    profileSourceId: "ASTER-1-PROFILE-01",
    profileRecordedAt: "2028-06-03T08:00:00.000Z",
    anthropometrics: [
      { label: "Height", value: "167 cm", sourceId: "ASTER-1-ANTHRO-01", recordedAt: "2028-06-03T08:10:00.000Z", provenance: "synthetic-profile-fixture" },
      { label: "Body mass", value: "61.8 kg", sourceId: "ASTER-1-ANTHRO-01", recordedAt: "2028-06-03T08:10:00.000Z", provenance: "synthetic-profile-fixture" },
    ],
    physicalAssessmentNote: "Strength, endurance, mobility, and body-composition protocols are not defined in this fixture; no values are supplied.",
    scenario: maraScenario,
  },
  {
    id: "clara-reyes",
    name: "Dr. Clara Reyes",
    crewIdentifier: "AURORA-2 · CREW C-03",
    ageAtLaunch: 36,
    missionRole: "Flight engineer",
    missionAssignment: "Aurora-2 · 28-day orbital research mission",
    currentPhase: "Postflight follow-up",
    missionDay: 42,
    portrait: "/images/simulation/clara-reyes.png",
    profileSourceId: "AURORA-2-PROFILE-01",
    profileRecordedAt: "2029-04-11T08:00:00.000Z",
    anthropometrics: [
      { label: "Height", value: "171 cm", sourceId: "AURORA-2-ANTHRO-01", recordedAt: "2029-04-11T08:10:00.000Z", provenance: "synthetic-profile-fixture" },
      { label: "Body mass", value: "64.2 kg", sourceId: "AURORA-2-ANTHRO-01", recordedAt: "2029-04-11T08:10:00.000Z", provenance: "synthetic-profile-fixture" },
    ],
    physicalAssessmentNote: "Strength, endurance, mobility, and body-composition protocols are not defined in this fixture; no values are supplied.",
    scenario: claraScenario,
  },
];

export function getSimulationProfile(id: AstronautId): SimulationAstronautProfile {
  return SIMULATION_PROFILES.find((profile) => profile.id === id) ?? SIMULATION_PROFILES[0]!;
}

export function isAstronautId(value: string | null | undefined): value is AstronautId {
  return value === "mara-venn" || value === "clara-reyes";
}
