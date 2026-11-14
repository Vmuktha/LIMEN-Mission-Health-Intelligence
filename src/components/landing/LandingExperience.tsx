"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { HeroStage } from "./HeroStage";
import { StorySection } from "./StorySection";

const RECOVERY_METRICS: readonly { readonly label: string; readonly unit: string }[] = [
  { label: "Reaction time", unit: "ms" },
  { label: "Movement time", unit: "ms" },
  { label: "Directional error", unit: "degrees" },
  { label: "Trajectory deviation", unit: "CSS px" },
  { label: "Correction count", unit: "count" },
  { label: "Peak-velocity time", unit: "ms" },
  { label: "Adaptation change", unit: "degrees" },
  { label: "Washout aftereffect", unit: "degrees" },
];

/**
 * The landing experience. The hero carries the Orbit and Signal environment;
 * the chapters below carry the Instrument register — the scientific framing,
 * what the prototype measures, and what it cannot claim.
 */
export function LandingExperience() {
  const revealRef = useScrollReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="relative bg-void">
      <HeroStage />

      <StorySection id="landing-problem" index="01" eyebrow="The problem" title="When gravity changes, the map stops matching.">
        <p>
          On Earth, the eye–hand map you calibrated is invisible: you reach, and the world is where you expect it.
          Change the gravity and that mapping stops holding. Tasks that were automatic become effortful, and the
          correction happens in behaviour rather than in thought.
        </p>
        <p>
          Published work on astronauts and matched Earth-bound controls describes exactly this shape: aiming errors
          that shrink with practice, and an aftereffect that can remain once the rotation is removed.
        </p>
        <p className="text-xs leading-6 text-glow-muted">
          Context from Clément et al. (2022) and Tays et al. (2025). LIMEN cites published findings; it stores no
          astronaut records.
        </p>
      </StorySection>

      <StorySection id="landing-measure" index="02" eyebrow="The instrument" title="A shortened browser task, and the behaviour it leaves behind." tone="hull">
        <p>
          The prototype rotates visual feedback by 45° during the adaptation phases and records pointer paths and
          timing across four phases — baseline, adaptation, late adaptation and washout. From the raw trials it
          recomputes eight descriptive metrics; nothing is summarised at capture time, and no stored value is trusted.
        </p>
        <p>
          Every session is a browser-local record for one participant profile. Comparisons are made against a Personal
          Reference Session — an earlier observation of the same person — never against a population average.
        </p>
        <dl className="mt-8 grid gap-x-8 gap-y-3 border-t border-horizon/50 pt-6 sm:grid-cols-2">
          {RECOVERY_METRICS.map((metric) => (
            <div key={metric.label} className="flex items-baseline justify-between gap-4 border-b border-horizon/30 pb-2">
              <dt className="text-sm text-glow-muted">{metric.label}</dt>
              <dd className="font-mono text-xs text-glow-muted">{metric.unit}</dd>
            </div>
          ))}
        </dl>
      </StorySection>

      <StorySection id="landing-limits" index="03" eyebrow="The limits" title="What this prototype cannot tell you.">
        <ul className="space-y-4">
          {[
            "No neural or vestibular measurement. The task records pointer behaviour; nothing here infers brain activity.",
            "No clinical validation and no threshold. LIMEN produces descriptive, within-person comparisons, never a readiness score.",
            "A pointer task is not a laboratory protocol. Mouse and trackpad input is not the joystick and imaging setup used in the published studies.",
            "Records live in this browser profile. One local profile, no account, no synchronisation, no multi-participant management.",
            "Comparisons are protocol-sensitive. v0.2.0 and v0.3.0 records are never pooled; a Personal Reference Session must share the measurement protocol.",
          ].map((item) => (
            <li key={item} className="flex gap-4">
              <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-ion/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </StorySection>

      <section aria-labelledby="landing-next" className="relative border-t border-horizon/50 bg-void px-6 py-16 md:px-10 md:py-24 lg:px-14">
        <div className="mx-auto w-full max-w-[1180px]" data-reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ion">Next</p>
          <h2 id="landing-next" className="mt-4 max-w-3xl text-display-md font-semibold tracking-tight text-glow">
            Begin with the framing, then take the measurement.
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-8 text-glow-muted">
            The mission module explains why sensorimotor adaptation matters in altered gravity. The assessment then
            records one browser-local session, and the recovery module compares it with your own earlier sessions.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/mission"
              className="group inline-flex items-center gap-2 rounded-control bg-ion px-5 py-3 text-sm font-semibold text-void transition-colors duration-fast ease-linen hover:bg-ion-soft"
            >
              Enter the mission module
              <span aria-hidden="true" className="transition-transform duration-fast ease-linen group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/evidence"
              className="inline-flex items-center gap-2 rounded-control border border-horizon/80 px-5 py-3 text-sm font-medium text-glow-muted transition-colors duration-fast ease-linen hover:border-ion/60 hover:text-glow"
            >
              Read the evidence registry
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-horizon/50 bg-void px-6 py-10 md:px-10 lg:px-14">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 text-xs text-glow-muted">
          <p>LIMEN · neuroadaptive mission readiness &amp; recovery intelligence · research prototype</p>
          <p>Browser-local records · descriptive only · not a diagnostic or fitness-for-duty system</p>
        </div>
      </footer>
    </div>
  );
}
