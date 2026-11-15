"use client";

import Image from "next/image";
import { analyzeSimulationScenario } from "@/lib/simulation/analysis";
import type { SimulationAstronautProfile } from "@/lib/simulation/profiles";

export function AstronautProfileCards({ profiles, onSelect }: { readonly profiles: readonly SimulationAstronautProfile[]; readonly onSelect: (profile: SimulationAstronautProfile) => void }) {
  return (
    <section aria-labelledby="profile-selection-heading" className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ion">Simulation environment · fictional data only</p>
        <h1 id="profile-selection-heading" className="mt-3 text-3xl font-semibold tracking-tight text-glow sm:text-5xl">Choose an astronaut workspace</h1>
        <p className="mt-4 text-sm leading-6 text-glow-muted sm:text-base">Explore the familiar LIMEN mission, assessment, check-in, analysis, and evidence experience using isolated, source-linked fictional records.</p>
      </header>
      <p className="rounded-control border border-amber-300/35 bg-amber-300/[0.07] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Simulation · fictional data · not operational records</p>
      <div className="grid gap-5 xl:grid-cols-2">
        {profiles.map((profile) => {
          const sessions = profile.scenario.assessmentSessions;
          const trials = sessions.flatMap((session) => session.trials);
          const originEligible = analyzeSimulationScenario(profile.scenario).every((session) => session.originSensitiveEligible);
          return (
            <article key={profile.id} className="group overflow-hidden rounded-2xl border border-horizon/70 bg-hull/75 transition-colors hover:border-ion/50">
              <div className="grid sm:grid-cols-[210px_minmax(0,1fr)]">
                <div className="relative min-h-[250px] overflow-hidden bg-void sm:min-h-full">
                  <Image src={profile.portrait} alt={`Fictional profile portrait of ${profile.name}`} fill sizes="(max-width: 640px) 100vw, 210px" className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]" priority />
                  <span className="absolute left-3 top-3 rounded-full border border-amber-200/40 bg-void/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">Fictional profile</span>
                </div>
                <div className="flex flex-col p-5 sm:p-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-soft">{profile.crewIdentifier}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-glow">{profile.name}</h2>
                    <p className="mt-1 text-sm text-glow-muted">{profile.missionAssignment}</p>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-horizon/50 py-4 text-xs">
                    <div><dt className="text-glow-faint">Mission role</dt><dd className="mt-1 font-medium text-glow">{profile.missionRole}</dd></div>
                    <div><dt className="text-glow-faint">Scenario phase</dt><dd className="mt-1 font-medium text-glow">{profile.currentPhase}</dd></div>
                    <div><dt className="text-glow-faint">Mission day</dt><dd className="mt-1 font-mono tabular-nums text-glow">D+{profile.missionDay}</dd></div>
                    <div><dt className="text-glow-faint">Check-ins</dt><dd className="mt-1 font-mono tabular-nums text-glow">{profile.scenario.checkIns.length} records</dd></div>
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-glow-muted">{sessions.length} sessions · {trials.length} raw trials · origin-sensitive measures {originEligible ? "eligible under protocol evidence" : "withheld by accepted fixture provenance"}</p>
                  <button type="button" onClick={() => onSelect(profile)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-ion px-4 py-2.5 text-sm font-semibold text-void transition-colors hover:bg-ion-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion">
                    Open individual workspace <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-glow-faint">Synthetic records are generated locally and deterministically. Profile selection, review marks, and demonstration alerts remain transient in-memory state; no operational records are read or written.</p>
    </section>
  );
}
