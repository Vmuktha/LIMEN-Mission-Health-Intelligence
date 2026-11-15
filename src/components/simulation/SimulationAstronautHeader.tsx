"use client";

import Image from "next/image";
import { SIMULATION_PROFILES, type AstronautId, type SimulationAstronautProfile } from "@/lib/simulation/profiles";

export function SimulationAstronautHeader({ profile, onChange }: { readonly profile: SimulationAstronautProfile; readonly onChange: (id: AstronautId) => void }) {
  return (
    <section aria-label="Selected fictional astronaut" className="mb-7 overflow-hidden rounded-2xl border border-horizon/70 bg-hull/70">
      <div className="grid md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="relative min-h-[205px] bg-void md:min-h-full">
          <Image src={profile.portrait} alt={`Fictional portrait of ${profile.name}`} fill sizes="160px" className="object-cover object-top" priority />
        </div>
        <div className="flex flex-col justify-between gap-5 p-5 sm:p-6 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.17em] text-ion-soft">{profile.crewIdentifier} · fictional astronaut</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-glow sm:text-3xl">{profile.name}</h1>
            <p className="mt-1 text-sm text-glow-muted">{profile.missionAssignment} <span aria-hidden="true">·</span> {profile.missionRole}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-glow-muted">
              <span>Scenario phase <strong className="ml-1 font-medium text-glow">{profile.currentPhase}</strong></span>
              <span>Mission day <strong className="ml-1 font-mono text-glow">D+{profile.missionDay}</strong></span>
              <span>Latest assessment <strong className="ml-1 font-medium text-glow">{profile.scenario.assessmentSessions.at(-1)?.label ?? "Unavailable"}</strong></span>
              <span>Latest check-in <strong className="ml-1 font-mono text-glow">{profile.scenario.checkIns.at(-1)?.id ?? "Unavailable"}</strong></span>
            </div>
          </div>
          <label className="flex shrink-0 flex-col gap-2 text-xs font-medium text-glow-muted">
            Switch fictional profile
            <select aria-label="Switch fictional astronaut profile" value={profile.id} onChange={(event) => onChange(event.target.value as AstronautId)} className="min-h-10 min-w-52 rounded-control border border-horizon bg-void px-3 text-sm text-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion">
              {SIMULATION_PROFILES.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.missionAssignment.split(" · ")[0]}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="border-t border-horizon/50 bg-amber-300/[0.055] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100 sm:px-6">Simulation · fictional data · not operational records</div>
    </section>
  );
}
