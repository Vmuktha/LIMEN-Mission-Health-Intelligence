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
    href: "/privacy",
    label: "Privacy & local data",
    shortLabel: "Privacy",
    description: "Review local-data controls and deletion scope",
    group: "analyse",
    icon: "evidence",
  },
];

export function navItemsForGroup(group: NavGroupId): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === group);
}
