"use client";

import Link from "next/link";
import { useRef, type PointerEvent } from "react";
import { SceneCanvas, useScene } from "@/components/scene";
import { SignalFilaments } from "./SignalFilaments";

/**
 * The landing hero: a full-viewport cinematic composition that places the
 * orbital limb of a world and the abstract Signal filaments in one spatial
 * field, with the editorial statement held in the negative space beside them.
 *
 * The environment is Orbit and Signal register art only. The instrument
 * register — the provenance line and the protocol facts — stays legible and
 * truthful at every breakpoint.
 */
export function HeroStage() {
  const stageRef = useRef<HTMLElement | null>(null);
  const { reducedMotion, motionResolved, webglActive } = useScene();

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const stage = stageRef.current;
    if (!stage || reducedMotion) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    stage.style.setProperty("--limen-pointer-x", ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    stage.style.setProperty("--limen-pointer-y", ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3));
  };

  return (
    <section
      ref={stageRef}
      onPointerMove={handlePointerMove}
      aria-labelledby="landing-hero-title"
      className="relative isolate flex min-h-[calc(100vh-var(--shell-chrome-height))] flex-col justify-between overflow-hidden bg-void"
    >
      {/* ── Orbit and Signal environment ─────────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className={`absolute inset-0 transition-opacity duration-slow ease-linen ${webglActive ? "opacity-0" : "opacity-100"}`}>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 55% at 78% 78%, color-mix(in oklab, var(--limen-ion) 10%, transparent) 0%, transparent 62%), linear-gradient(180deg, var(--limen-void) 0%, color-mix(in oklab, var(--limen-hull) 60%, var(--limen-void)) 58%, var(--limen-void) 100%)",
            }}
          />
          <div className="limen-starfield absolute inset-0" />

        <div
          className="absolute inset-0 transition-transform duration-700 ease-linen will-change-transform"
          style={{ transform: "translate3d(calc(var(--limen-pointer-x, 0) * -12px), calc(var(--limen-pointer-y, 0) * -7px), 0)" }}
        >
          <div className="limen-earth-fallback" aria-hidden="true">
            <div className="limen-earth-fallback__surface" />
            <div className="limen-earth-fallback__terminator" />
            <div className="limen-earth-fallback__atmosphere" />
          </div>
        </div>

        <div
          className="absolute inset-0 transition-transform duration-1000 ease-linen will-change-transform"
          style={{ transform: "translate3d(calc(var(--limen-pointer-x, 0) * -26px), calc(var(--limen-pointer-y, 0) * -14px), 0)" }}
        >
          <SignalFilaments placement="frame" className="absolute inset-0 hidden h-full w-full md:block" />
          <SignalFilaments placement="below" className="absolute inset-0 h-full w-full md:hidden" />
        </div>

        {/* the seam between the two light domains */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(104deg, color-mix(in oklab, var(--limen-void) 82%, transparent) 24%, transparent 52%, color-mix(in oklab, var(--limen-plasma) 7%, transparent) 72%, transparent 86%)",
          }}
        />
        {/* vignette and the fall-off into the story below */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 92% at 42% 32%, transparent 46%, color-mix(in oklab, var(--limen-void) 68%, transparent) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-void" />
        </div>

        {/* The WebGL signature scene takes over this same composition when it is available. */}
        {motionResolved && !reducedMotion && <SceneCanvas />}
      </div>

      {/* ── Instrument statement ──────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-between px-6 pb-14 pt-16 md:px-10 md:pb-16 md:pt-20 lg:px-14 lg:pb-20 lg:pt-24">
        <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-ion">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ion shadow-[0_0_12px_var(--limen-ion)]" />
          LIMEN · Mission Health Intelligence
        </p>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,42rem)_auto] lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-2xl">
            <h1 id="landing-hero-title" className="text-display-xl font-semibold tracking-tight text-glow">
              A clearer picture of human performance, between worlds.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-glow-muted">
              LIMEN — Mission Health Intelligence — connects crew context, self-reported observations, visuomotor
              performance and longitudinal change across mission transitions. A research prototype, built for careful
              observation rather than diagnosis.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/mission/contexts"
                className="group inline-flex items-center gap-2 rounded-control bg-ion px-5 py-3 text-sm font-semibold text-void transition-colors duration-fast ease-linen hover:bg-ion-soft"
              >
                Explore mission context
                <span aria-hidden="true" className="transition-transform duration-fast ease-linen group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 rounded-control border border-horizon/80 px-5 py-3 text-sm font-medium text-glow-muted transition-colors duration-fast ease-linen hover:border-ion/60 hover:text-glow"
              >
                Run the assessment
              </Link>
              <Link
                href="/concordance"
                className="inline-flex items-center gap-2 rounded-control border border-horizon/80 px-5 py-3 text-sm font-medium text-glow-muted transition-colors duration-fast ease-linen hover:border-ion/60 hover:text-glow"
              >
                Signal Concordance
              </Link>
            </div>

            <p className="mt-6 max-w-md text-xs leading-5 text-glow-muted">
              Research prototype · descriptive browser-local records · not a diagnostic, readiness, or fitness-for-duty
              system.
            </p>
          </div>

          <dl className="hidden gap-6 rounded-panel border border-horizon/50 bg-void/45 px-5 py-4 backdrop-blur-sm lg:grid">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-glow-muted">Protocol</dt>
              <dd className="mt-1.5 font-mono text-sm text-glow">v0.3.0</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-glow-muted">Task</dt>
              <dd className="mt-1.5 font-mono text-sm text-glow">80 trials · 4 phases</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-glow-muted">Records</dt>
              <dd className="mt-1.5 font-mono text-sm text-glow">browser-local · one profile</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10 hidden items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-glow-muted md:flex">
          <span aria-hidden="true" className="h-8 w-px bg-gradient-to-b from-ion/70 to-transparent" />
          Scroll for the scientific framing
        </div>
      </div>
    </section>
  );
}
