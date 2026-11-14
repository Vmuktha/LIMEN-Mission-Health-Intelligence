import type { SVGProps } from "react";

/**
 * The LIMEN mark: an orbital limb crossed by a signal filament, with the
 * measured centre. It is a brand device only and carries no data.
 */
export function LimenMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false" {...props}>
      <circle cx="16" cy="16" r="9.5" stroke="var(--limen-horizon)" strokeWidth="1.4" />
      <path d="M16 4.5A11.5 11.5 0 0 1 27.5 16" stroke="var(--limen-ion)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 27.5A11.5 11.5 0 0 1 4.5 16" stroke="var(--limen-plasma)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
      <circle cx="16" cy="16" r="3" fill="var(--limen-ion-soft)" />
    </svg>
  );
}
