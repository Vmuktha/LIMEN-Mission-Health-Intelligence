/**
 * The orbital horizon: the atmospheric limb of a world seen from above. This
 * is Orbit register environment art — a luminous edge, a terminator gradient
 * and a faint orbital track. It carries no data and depicts no specific
 * mission, spacecraft or event.
 *
 * `placement` is a composition decision, not a scale: on the large breakpoint
 * the limb sweeps through the lower right of the frame, on small screens it
 * rises across the bottom so the filaments have somewhere to grow from.
 */
export function OrbitalHorizon({ placement = "frame", className }: { readonly placement?: "frame" | "below"; readonly className?: string }) {
  const below = placement === "below";
  const centreX = below ? 600 : 940;
  const centreY = below ? 1160 : 1080;
  const radius = below ? 620 : 676;

  return (
    <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`limen-planet-body-${placement}`} cx="0.38" cy="0.2" r="0.95">
          <stop offset="0%" style={{ stopColor: "var(--limen-hull-raised)" }} />
          <stop offset="46%" style={{ stopColor: "var(--limen-hull)" }} />
          <stop offset="100%" style={{ stopColor: "var(--limen-void)" }} />
        </radialGradient>
        <linearGradient id={`limen-limb-${placement}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--limen-ion-soft)", stopOpacity: 0.95 }} />
          <stop offset="28%" style={{ stopColor: "var(--limen-ion)", stopOpacity: 0.6 }} />
          <stop offset="62%" style={{ stopColor: "var(--limen-plasma)", stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: "var(--limen-plasma-bright)", stopOpacity: 0 }} />
        </linearGradient>
        <filter id={`limen-atmosphere-${placement}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id={`limen-atmosphere-soft-${placement}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="42" />
        </filter>
      </defs>

      {/* outer atmosphere */}
      <circle cx={centreX} cy={centreY} r={radius + 14} fill="none" stroke={`url(#limen-limb-${placement})`} strokeWidth="10" opacity="0.32" filter={`url(#limen-atmosphere-soft-${placement})`} />
      <circle cx={centreX} cy={centreY} r={radius + 6} fill="none" stroke={`url(#limen-limb-${placement})`} strokeWidth="5" opacity="0.55" filter={`url(#limen-atmosphere-${placement})`} />

      {/* planet body and limb */}
      <circle cx={centreX} cy={centreY} r={radius} fill={`url(#limen-planet-body-${placement})`} />
      <circle cx={centreX} cy={centreY} r={radius} fill="none" stroke={`url(#limen-limb-${placement})`} strokeWidth="1.6" opacity="0.9" />

      {/* a single faint orbital track */}
      <ellipse cx={below ? 520 : 700} cy={below ? 1080 : 1020} rx="720" ry="210" fill="none" stroke="var(--limen-ion)" strokeWidth="0.6" opacity="0.16" transform={`rotate(-16 ${below ? 520 : 700} ${below ? 1080 : 1020})`} />
    </svg>
  );
}
