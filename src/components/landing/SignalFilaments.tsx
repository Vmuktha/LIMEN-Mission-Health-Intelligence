/**
 * The Signal register: abstract filaments rising from the orbital limb.
 *
 * These traces are an environmental metaphor for branching pathways and
 * luminous connection. They are not a representation of neural activity, of a
 * participant's state, or of any measurement LIMEN makes — LIMEN records
 * pointer behaviour only.
 *
 * `placement` decides where the cluster grows from, so the small-screen
 * composition is designed rather than cropped.
 */
export function SignalFilaments({ placement = "frame", className }: { readonly placement?: "frame" | "below"; readonly className?: string }) {
  const below = placement === "below";

  return (
    <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`limen-filament-${placement}`} x1="1" y1="1" x2="0.1" y2="0">
          <stop offset="0%" style={{ stopColor: "var(--limen-ion)", stopOpacity: 0.85 }} />
          <stop offset="46%" style={{ stopColor: "var(--limen-plasma)", stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: "var(--limen-plasma-bright)", stopOpacity: 0 }} />
        </linearGradient>
        <radialGradient id={`limen-filament-halo-${placement}`} cx="0.72" cy="0.6" r="0.4">
          <stop offset="0%" style={{ stopColor: "var(--limen-ion)", stopOpacity: 0.22 }} />
          <stop offset="60%" style={{ stopColor: "var(--limen-plasma)", stopOpacity: 0.08 }} />
          <stop offset="100%" style={{ stopColor: "var(--limen-plasma)", stopOpacity: 0 }} />
        </radialGradient>
        <filter id={`limen-filament-glow-${placement}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <g transform={below ? "translate(-170 300)" : undefined}>
        <ellipse cx="900" cy="560" rx="360" ry="300" fill={`url(#limen-filament-halo-${placement})`} />

        <g fill="none" stroke={`url(#limen-filament-${placement})`} strokeWidth="1.15" strokeLinecap="round">
          <path d="M1010 560 C 985 470, 940 405, 880 340" />
          <path d="M1010 560 C 960 520, 880 500, 795 470" />
          <path d="M952 470 C 930 395, 918 320, 900 236" />
          <path d="M905 358 C 872 312, 826 288, 772 268" />
          <path d="M900 250 C 878 202, 862 168, 826 126" />
          <path d="M795 470 C 762 440, 722 424, 676 418" />
          <path d="M772 268 C 738 244, 702 236, 660 240" />
        </g>

        <g fill="none" stroke={`url(#limen-filament-${placement})`} strokeWidth="3.5" opacity="0.22" filter={`url(#limen-filament-glow-${placement})`}>
          <path d="M1010 560 C 985 470, 940 405, 880 340" />
          <path d="M952 470 C 930 395, 918 320, 900 236" />
        </g>

        <g fill="var(--limen-ion-soft)">
          <circle cx="880" cy="340" r="2.6" opacity="0.92" />
          <circle cx="900" cy="236" r="2.2" opacity="0.8" />
          <circle cx="795" cy="470" r="2" opacity="0.62" />
          <circle cx="772" cy="268" r="1.8" opacity="0.55" />
          <circle cx="676" cy="418" r="1.6" opacity="0.4" />
          <circle cx="826" cy="126" r="1.5" opacity="0.35" />
        </g>
        <g fill="var(--limen-plasma-bright)">
          <circle cx="660" cy="240" r="1.6" opacity="0.5" />
          <circle cx="1010" cy="560" r="2.4" opacity="0.7" />
        </g>
      </g>
    </svg>
  );
}
