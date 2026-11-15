"use client";

import { usePathname } from "next/navigation";
import { isActiveRoute } from "./CompactNav";
import { NavLinkItem } from "./NavLinkItem";
import { NAV_GROUPS, navItemsForPath } from "./nav-items";

/**
 * The large-breakpoint navigation rail. Destinations are grouped by the kind
 * of work they belong to, the current route is marked with an ion rule, and a
 * provenance note closes the rail so the research status stays in the frame.
 */
export function NavRail() {
  const pathname = usePathname();
  const navItems = navItemsForPath(pathname);

  return (
    <nav
      aria-label="Primary"
      className="hidden lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:w-[272px] lg:shrink-0 lg:flex-col lg:border-r lg:border-horizon/60 lg:bg-hull/45 lg:backdrop-blur-md"
      style={{
        backgroundImage:
          "radial-gradient(130% 52% at 0% 0%, color-mix(in oklab, var(--limen-ion) 17%, transparent) 0%, transparent 64%), radial-gradient(110% 42% at 0% 100%, color-mix(in oklab, var(--limen-plasma) 14%, transparent) 0%, transparent 62%)",
      }}
    >
      <div className="px-6 pb-1 pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-glow-muted">Navigation</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mt-6 first:mt-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-glow-muted">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {navItems.filter((item) => item.group === group.id).map((item) => (
                <li key={item.href}>
                  <NavLinkItem item={item} active={isActiveRoute(pathname, item.href)} variant="rail" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-horizon/50 px-6 py-5">
        <p className="text-[11px] leading-5 text-glow-muted">
          Descriptive browser-local records. Not a diagnostic, readiness, or fitness-for-duty system.
        </p>
      </div>
    </nav>
  );
}
