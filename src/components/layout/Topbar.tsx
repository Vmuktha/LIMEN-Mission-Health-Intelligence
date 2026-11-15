"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompactNav } from "./CompactNav";
import { LimenMark } from "./LimenMark";

/**
 * The application header: a dark glass band that floats over the environment.
 * The brand mark, the product line and the research status are separated by
 * weight and spacing rather than by boxes.
 */
export function Topbar() {
  const pathname = usePathname();
  const inSimulation = pathname.startsWith("/simulation");
  return (
    <header
      className="sticky top-0 z-50 border-b border-horizon/70 bg-hull/60 backdrop-blur-lg"
      style={{
        backgroundImage:
          "radial-gradient(52% 200% at 0% 0%, color-mix(in oklab, var(--limen-ion) 15%, transparent) 0%, transparent 62%), radial-gradient(34% 170% at 100% 0%, color-mix(in oklab, var(--limen-plasma) 9%, transparent) 0%, transparent 66%)",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between gap-4 px-5 md:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3 rounded-card">
          <span className="grid h-9 w-9 place-items-center rounded-card border border-horizon/80 bg-hull-raised/70 transition-colors duration-fast ease-linen group-hover:border-ion/50">
            <LimenMark className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-[0.32em] text-glow">LIMEN</span>
            <span className="mt-1.5 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-glow-muted lg:block">
              Mission health intelligence · research prototype
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav aria-label="Data environment" className="inline-flex rounded-full border border-horizon/80 bg-hull-raised/60 p-0.5 text-[11px]">
            <Link href="/" aria-current={!inSimulation ? "page" : undefined} className={`rounded-full px-2.5 py-1.5 font-medium transition-colors sm:px-3 ${!inSimulation ? "bg-ion/15 text-ion-soft" : "text-glow-muted hover:text-glow"}`}>Operational</Link>
            <Link href="/simulation" aria-current={inSimulation ? "page" : undefined} className={`rounded-full px-2.5 py-1.5 font-medium transition-colors sm:px-3 ${inSimulation ? "bg-ion/15 text-ion-soft" : "text-glow-muted hover:text-glow"}`}>Simulation</Link>
          </nav>
          <span className="hidden items-center gap-2 rounded-full border border-horizon/80 bg-hull-raised/60 px-3 py-1.5 text-[11px] text-glow-muted sm:inline-flex">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ion shadow-[0_0_10px_var(--limen-ion)]" />
            <span className="sm:hidden">Prototype</span>
            <span className="hidden sm:inline">Research prototype</span>
            <span className="hidden lg:inline">· descriptive only</span>
          </span>
          <span className="hidden text-[11px] text-glow-muted xl:inline">{inSimulation ? "synthetic fixture · read-only" : "browser-local records"}</span>
        </div>
      </div>

      <CompactNav />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ion/45 to-transparent" />
    </header>
  );
}
