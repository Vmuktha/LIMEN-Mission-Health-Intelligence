import Link from "next/link";
import { NavIcon } from "./NavIcon";
import type { NavItem } from "./nav-items";

export type NavLinkVariant = "rail" | "compact";

export interface NavLinkItemProps {
  readonly item: NavItem;
  readonly active: boolean;
  readonly variant: NavLinkVariant;
}

/**
 * One navigation destination. The active state is expressed with an ion-tinted
 * surface, an ion rule and brighter type; hover lifts the surface only, so
 * the rail stays calm. `aria-current` carries the state for assistive
 * technology.
 */
export function NavLinkItem({ item, active, variant }: NavLinkItemProps) {
  if (variant === "compact") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={item.description}
        className={`group relative flex flex-1 items-center justify-center gap-1.5 rounded-control px-2 py-2 text-[10px] transition-[color,background-color,border-color] duration-fast ease-linen md:flex-none md:gap-2 md:px-3 md:text-[11px] ${
          active ? "bg-ion/10 text-glow" : "text-glow-muted hover:bg-hull-raised/70 hover:text-glow"
        }`}
      >
        <NavIcon name={item.icon} className={`h-3.5 w-3.5 shrink-0 transition-[color,background-color,border-color] duration-fast ease-linen ${active ? "text-ion" : "text-glow-muted group-hover:text-glow-muted"}`} />
        <span className="whitespace-nowrap">{item.shortLabel}</span>
        <span
          aria-hidden="true"
          className={`absolute inset-x-2 bottom-0.5 h-[2px] rounded-full bg-ion transition-opacity duration-fast ease-linen ${active ? "opacity-100" : "opacity-0"}`}
        />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.description}
      className={`group relative flex items-center gap-3 rounded-card px-3 py-2.5 text-sm transition-[color,background-color,border-color] duration-fast ease-linen ${
        active ? "bg-ion/10 text-glow" : "text-glow-muted hover:bg-hull-raised/70 hover:text-glow"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-ion transition-opacity duration-fast ease-linen ${
          active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        }`}
      />
      <NavIcon
        name={item.icon}
        className={`h-4 w-4 shrink-0 transition-[color,background-color,border-color] duration-fast ease-linen ${active ? "text-ion" : "text-glow-muted group-hover:text-glow-muted"}`}
      />
      <span className="tracking-[0.01em]">{item.label}</span>
    </Link>
  );
}
