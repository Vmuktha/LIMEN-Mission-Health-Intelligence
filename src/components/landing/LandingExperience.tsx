"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { HeroStage } from "./HeroStage";
import { StorySection } from "./StorySection";
import { BeyondHorizonCarousel } from "./BeyondHorizonCarousel";
import { MissionBrief } from "@/components/mission/MissionBrief";

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
      <MissionBrief />

      <StorySection id="landing-system" index="01" eyebrow="The instrument" title="One mission. Several kinds of evidence." tone="hull">
        <p>
          Mission health is not a single number. LIMEN keeps mission context, a person&apos;s own observations,
          task-based behaviour and retrospective research evidence distinct, so each can be read for what it is.
          These are connected product pathways—not a claim of integrated or real-time astronaut monitoring.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            { href: "/mission/contexts", title: "Mission context", detail: "Describe a mission phase and its gravity-transition setting." },
            { href: "/check-in", title: "Crew check-ins", detail: "Capture subjective, self-reported observations." },
            { href: "/assessment", title: "Visuomotor performance", detail: "Run a short browser-based adaptation task." },
            { href: "/recovery", title: "Longitudinal reference", detail: "Review observations against the same person’s eligible reference session." },
            { href: "/concordance", title: "Signal Concordance", detail: "Read available task and check-in records together, without a composite score." },
            { href: "/evidence/osdr", title: "Retrospective evidence", detail: "Explore selected NASA OSDR research data; not live mission telemetry." },
            { href: "/mission/transitions", title: "Transitions & follow-up", detail: "Review recorded transitions. A dedicated follow-up experience is not yet available." },
            { href: "/privacy", title: "Privacy & local data", detail: "Review the prototype’s browser-local data and deletion controls." },
          ].map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="group block border-t border-horizon/60 py-4 focus-visible:rounded-control">
                <span className="flex items-center justify-between gap-3 text-sm font-semibold text-glow transition-colors group-hover:text-ion">
                  {item.title}
                  <span aria-hidden="true" className="text-ion/70">↗</span>
                </span>
                <span className="mt-2 block text-sm leading-6 text-glow-muted">{item.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-6 text-glow-muted">
          NASA imagery and retrospective data are identified at their source. NASA does not endorse LIMEN;
          the prototype has no astronaut-level telemetry, neural measurement, clinical validation or diagnostic capability.
        </p>
      </StorySection>

      <StorySection id="landing-problem" index="02" eyebrow="The problem" title="When gravity changes, the map stops matching.">
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

      <StorySection id="landing-measure" index="03" eyebrow="The instrument" title="A shortened browser task, and the behaviour it leaves behind." tone="hull">
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

      <StorySection id="landing-limits" index="04" eyebrow="The limits" title="What this prototype cannot tell you.">
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

      <BeyondHorizonCarousel />

      <section aria-labelledby="landing-next" className="relative border-t border-horizon/50 bg-void px-6 py-16 md:px-10 md:py-24 lg:px-14">
        <div className="mx-auto w-full max-w-[1180px]" data-reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ion">Next</p>
          <h2 id="landing-next" className="mt-4 max-w-3xl text-display-md font-semibold tracking-tight text-glow">
            Begin with the framing, then take the measurement.
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-8 text-glow-muted">
            Mission context, self-reports, browser-based performance and longitudinal review each have their own
            limits and provenance. The assessment records one browser-local session; recovery compares it only with
            compatible observations from the same profile.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/mission/contexts"
              className="group inline-flex items-center gap-2 rounded-control bg-ion px-5 py-3 text-sm font-semibold text-void transition-colors duration-fast ease-linen hover:bg-ion-soft"
            >
              Explore mission context
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
          <p>LIMEN · Mission Health Intelligence · research prototype</p>
          <p>Browser-local records · descriptive only · not a diagnostic or fitness-for-duty system</p>
          <p className="basis-full border-t border-horizon/40 pt-4 leading-6">
            Earth surface and cloud textures: locally bundled AI-generated visualization, not NASA imagery. NASA does not endorse LIMEN.
          </p>
        </div>
      </footer>
    </div>
  );
}
