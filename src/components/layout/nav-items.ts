export type NavIconName = "mission" | "assessment" | "check-in" | "recovery" | "evidence";
export type NavGroupId = "context" | "operate" | "analyse";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** Compact label used in the narrow navigation strip. */
  readonly shortLabel: string;
  readonly description: string;
  readonly group: NavGroupId;
  readonly icon: NavIconName;
}

export interface NavGroup {
  readonly id: NavGroupId;
  readonly label: string;
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { id: "context", label: "Context" },
  { id: "operate", label: "Operate" },
  { id: "analyse", label: "Analyse" },
];

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/mission",
    label: "Mission overview",
    shortLabel: "Mission",
    description: "Mission framing and current transition context",
    group: "context",
    icon: "mission",
  },
  {
    href: "/mission/contexts",
    label: "Mission contexts",
    shortLabel: "Contexts",
    description: "Create and review mission contexts",
    group: "context",
    icon: "mission",
  },
  {
    href: "/mission/events",
    label: "Recorded events",
    shortLabel: "Events",
    description: "Record and review mission-context events",
    group: "context",
    icon: "mission",
  },
  {
    href: "/mission/transitions",
    label: "Mission transitions",
    shortLabel: "Transitions",
    description: "Review gravity-transition observations",
    group: "context",
    icon: "mission",
  },
  {
    href: "/assessment",
    label: "Sensorimotor assessment",
    shortLabel: "Assess",
    description: "Browser-based visuomotor adaptation task",
    group: "operate",
    icon: "assessment",
  },
  {
    href: "/check-in",
    label: "Crew check-in",
    shortLabel: "Check-in",
    description: "Subjective self-reported observations",
    group: "operate",
    icon: "check-in",
  },
  {
    href: "/recovery",
    label: "Recovery & reference",
    shortLabel: "Recovery",
    description: "Within-person longitudinal observations and reference sessions",
    group: "analyse",
    icon: "recovery",
  },
  {
    href: "/personal-trends",
    label: "Personal trends",
    shortLabel: "Trends",
    description: "Chronological performance and self-reported observations",
    group: "analyse",
    icon: "recovery",
  },
  {
    href: "/concordance",
    label: "Signal Concordance",
    shortLabel: "Concordance",
    description: "Compare available behavioural and self-reported observations",
    group: "analyse",
    icon: "recovery",
  },
  {
    href: "/evidence",
    label: "Scientific evidence",
    shortLabel: "Evidence",
    description: "Published human-spaceflight research and evidence boundaries",
    group: "analyse",
    icon: "evidence",
  },
  {
    href: "/evidence/osdr",
    label: "NASA OSDR explorer",
    shortLabel: "OSDR data",
    description: "Explore the linked retrospective NASA OSDR data",
    group: "analyse",
    icon: "evidence",
  },
  {
    href: "/evidence/methodology",
    label: "Scientific methodology",
    shortLabel: "Methods",
    description: "Understand the task protocol, metric eligibility and evidence boundaries",
    group: "analyse",
    icon: "evidence",
  },
  {
    href: "/observations",
    label: "Observations & events",
    shortLabel: "Observations",
    description: "Review versioned descriptive notices with linked browser-local records",
    group: "analyse",
    icon: "recovery",
  },
  {
    href: "/privacy",
    label: "Privacy & local data",
    shortLabel: "Privacy",
    description: "Review local-data controls and deletion scope",
    group: "analyse",
    icon: "evidence",
  },
  {
    href: "/simulation",
    label: "Mission simulation lab",
    shortLabel: "Simulation",
    description: "Explore the isolated, fictional Aster-1 mission scenario",
    group: "analyse",
    icon: "mission",
  },
];

const SIMULATION_PATHS: Readonly<Record<string, string>> = {
  "/mission": "/simulation/mission",
  "/mission/contexts": "/simulation/contexts",
  "/mission/events": "/simulation/events",
  "/mission/transitions": "/simulation/transitions",
  "/assessment": "/simulation/assessments",
  "/check-in": "/simulation/check-ins",
  "/recovery": "/simulation/recovery",
  "/personal-trends": "/simulation/trends",
  "/concordance": "/simulation/concordance",
  "/evidence": "/simulation/evidence",
  "/evidence/osdr": "/simulation/osdr",
  "/evidence/methodology": "/simulation/methodology",
  "/observations": "/simulation/observations",
  "/simulation": "/simulation",
};

export function navItemsForPath(pathname: string): readonly NavItem[] {
  if (!pathname.startsWith("/simulation")) return NAV_ITEMS;
  return NAV_ITEMS
    .filter((item) => item.href !== "/privacy")
    .map((item) => ({
      ...item,
      href: SIMULATION_PATHS[item.href] ?? item.href,
      ...(item.href === "/simulation" ? { label: "Astronaut profiles", shortLabel: "Profiles" } : {}),
    }));
}

export function navItemsForGroup(group: NavGroupId): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === group);
}
