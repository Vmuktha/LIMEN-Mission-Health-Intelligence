"use client";

import { usePathname } from "next/navigation";
import { NavLinkItem } from "./NavLinkItem";
import { NAV_ITEMS } from "./nav-items";

/**
 * The narrow navigation strip used below the large breakpoint. It stays inside
 * the header so it can never overlap the full-bleed assessment surface, and it
 * scrolls horizontally on small screens rather than compressing its labels.
 */
export function CompactNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="relative overflow-x-auto overscroll-x-contain border-t border-horizon/50 bg-hull/40 lg:hidden">
      <ul className="mx-auto flex w-max min-w-full max-w-[1680px] items-stretch gap-0.5 px-2 py-1.5 md:justify-between md:gap-2 md:px-6">
        {NAV_ITEMS.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLinkItem item={item} active={isActiveRoute(pathname, item.href)} variant="compact" />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
