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
    label: "Mission",
    shortLabel: "Mission",
    description: "Gravity-transition context and mission framing",
    group: "context",
    icon: "mission",
  },
  {
    href: "/assessment",
    label: "Assessment",
    shortLabel: "Assess",
    description: "Sensorimotor adaptation task and session record",
    group: "operate",
    icon: "assessment",
  },
  {
    href: "/check-in",
    label: "Check-in",
    shortLabel: "Check-in",
    description: "Subjective self-report capture",
    group: "operate",
    icon: "check-in",
  },
  {
    href: "/recovery",
    label: "Recovery",
    shortLabel: "Recovery",
    description: "Longitudinal recovery observations and personal reference sessions",
    group: "analyse",
    icon: "recovery",
  },
  {
    href: "/evidence",
    label: "Evidence",
    shortLabel: "Evidence",
    description: "Published scientific evidence and its boundaries",
    group: "analyse",
    icon: "evidence",
  },
];

export function navItemsForGroup(group: NavGroupId): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => item.group === group);
}
