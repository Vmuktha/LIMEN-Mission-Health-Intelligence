import type { SVGProps } from "react";
import type { NavIconName } from "./nav-items";

/**
 * A small, geometric icon set drawn on a 16×16 grid with a single hairline
 * stroke. The icons identify destinations; they never decorate the labels or
 * imply a value.
 */
export function NavIcon({ name, ...props }: SVGProps<SVGSVGElement> & { readonly name: NavIconName }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {name === "mission" && (
        <>
          <circle cx="8" cy="8" r="2.6" />
          <ellipse cx="8" cy="8" rx="7" ry="3.1" transform="rotate(-24 8 8)" />
        </>
      )}
      {name === "assessment" && (
        <>
          <circle cx="8" cy="8" r="4.6" />
          <circle cx="8" cy="8" r="1.4" />
          <path d="M8 0.8v2.2M8 13v2.2M0.8 8h2.2M13 8h2.2" />
        </>
      )}
      {name === "check-in" && (
        <path d="M1 8h2.8l1.9-3.6 2.7 7.2 2-4.2 1.4 2.4H15" />
      )}
      {name === "recovery" && (
        <>
          <path d="M13.4 8a5.4 5.4 0 1 1-1.8-4" />
          <path d="M13.4 1.8v3.4H10" />
        </>
      )}
      {name === "evidence" && (
        <>
          <rect x="3.2" y="1.8" width="9.6" height="12.4" rx="1.6" />
          <path d="M5.9 5.6h4.2M5.9 8.2h4.2M5.9 10.8h2.6" />
        </>
      )}
    </svg>
  );
}
