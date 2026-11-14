"use client";

import { useScene } from "./SceneProvider";

const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E\")";

/**
 * The LIMEN environment: a CSS-only composition that establishes depth around
 * the application without competing with the instrument surfaces in front of it.
 *
 * It is built entirely from the approved tokens. The Orbit register supplies
 * the deep field, the key light, the orbital rings and the horizon limb; the
 * Signal register supplies the abstract filament traces. Nothing here encodes a
 * measurement, and the composition is decorative by construction.
 */
export function SceneBackground() {
  const { variant, reducedMotion, webglActive } = useScene();
  const drift = reducedMotion ? undefined : "animate-limen-drift-slow";
  const driftSlow = reducedMotion ? undefined : "animate-limen-drift";

  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void transition-opacity duration-slow ease-linen ${webglActive ? "opacity-0" : "opacity-100"}`}>
      {/* Deep field */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, var(--limen-void) 0%, color-mix(in oklab, var(--limen-hull) 72%, var(--limen-void)) 44%, var(--limen-void) 100%)",
        }}
      />

      {variant !== "plain" && (
        <>
          {/* Orbit key light, anchored to the instrument frame */}
          <div
            className={`absolute -inset-[10%] ${drift ?? ""}`}
            style={{
              background:
                "radial-gradient(50% 40% at 0% 0%, color-mix(in oklab, var(--limen-ion) 42%, transparent) 0%, color-mix(in oklab, var(--limen-ion) 12%, transparent) 42%, transparent 68%)",
            }}
          />
          {/* Signal fill at the foot of the frame */}
          <div
            className={`absolute -inset-[10%] ${driftSlow ?? ""}`}
            style={{
              background:
                "radial-gradient(38% 28% at 5% 104%, color-mix(in oklab, var(--limen-plasma) 22%, transparent) 0%, transparent 60%)",
            }}
          />
          {/* The seam between the two light domains */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(104deg, transparent 34%, color-mix(in oklab, var(--limen-ion) 7%, transparent) 44%, color-mix(in oklab, var(--limen-plasma) 5%, transparent) 49%, transparent 58%)",
            }}
          />
          {/* Orbital geometry */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-radial-gradient(circle at 4% 106%, transparent 0 52px, color-mix(in oklab, var(--limen-ion) 30%, transparent) 52px 53px)",
            }}
          />
          {/* Horizon limb */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(64% 26% at 4% 108%, transparent 62%, color-mix(in oklab, var(--limen-ion) 58%, transparent) 64.2%, color-mix(in oklab, var(--limen-plasma) 14%, transparent) 65.4%, transparent 67%)",
            }}
          />
          {/* Signal register: abstract filaments, never a representation of data */}
          <svg
            viewBox="0 0 900 640"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            style={{ opacity: 0.62 }}
          >
            <defs>
              <linearGradient id="limen-signal-trace" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" style={{ stopColor: "var(--limen-ion)", stopOpacity: 0 }} />
                <stop offset="38%" style={{ stopColor: "var(--limen-ion)", stopOpacity: 0.55 }} />
                <stop offset="72%" style={{ stopColor: "var(--limen-plasma)", stopOpacity: 0.26 }} />
                <stop offset="100%" style={{ stopColor: "var(--limen-plasma)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#limen-signal-trace)" strokeWidth={1.1} strokeLinecap="round">
              <path d="M-60 560 C 120 470, 190 320, 250 90" />
              <path d="M-40 610 C 150 540, 240 410, 330 170" />
              <path d="M40 690 C 220 600, 320 500, 430 300" />
            </g>
          </svg>
        </>
      )}

      {/* Spatial texture */}
      <div className="absolute inset-0" style={{ backgroundImage: NOISE_TEXTURE, opacity: 0.035 }} />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 95% at 46% 36%, transparent 56%, color-mix(in oklab, var(--limen-void) 64%, transparent) 100%)",
        }}
      />
    </div>
  );
}
