import { CHECK_IN_FIELDS } from "@/lib/checkin/record";
import type { SimulationAstronautProfile } from "@/lib/simulation/profiles";
import type { SimulationSessionAnalysis } from "@/lib/simulation/analysis";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));

export function SimulationProfileDetails({ profile, analysis }: { readonly profile: SimulationAstronautProfile; readonly analysis: readonly SimulationSessionAnalysis[] }) {
  const baseline = analysis.find((item) => item.session.relativeDay < 0) ?? analysis[0];
  const latestCheckIn = profile.scenario.checkIns.at(-1);
  return <section aria-label="Fictional astronaut profile and baseline records" className="grid gap-4 xl:grid-cols-2">
    <section className="rounded-2xl border border-horizon/70 bg-hull/65 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion">A · personal profile</p><h2 className="mt-1 text-lg font-semibold text-glow">Identity & mission assignment</h2>
      <dl className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">{[
        ["Name", profile.name], ["Crew identifier", profile.crewIdentifier], ["Age at launch", `${profile.ageAtLaunch} years`], ["Mission role", profile.missionRole], ["Assignment", profile.missionAssignment], ["Scenario phase", `${profile.currentPhase} · D+${profile.missionDay}`],
      ].map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-wide text-glow-faint">{label}</dt><dd className="mt-1 text-sm text-glow">{value}</dd></div>)}</dl>
      <p className="mt-4 border-t border-horizon/50 pt-3 text-[10px] leading-4 text-glow-faint">Fictional profile source {profile.profileSourceId} · recorded {formatDate(profile.profileRecordedAt)} UTC · synthetic profile fixture. Current phase/day are explicit profile metadata, not inferred from timestamp proximity.</p>
    </section>
    <section className="rounded-2xl border border-horizon/70 bg-hull/65 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion">B · anthropometrics</p><h2 className="mt-1 text-lg font-semibold text-glow">Profile measurements</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">{profile.anthropometrics.map((item) => <div key={`${item.sourceId}:${item.label}`} className="rounded-control border border-horizon/50 bg-void/30 p-3"><dt className="text-xs text-glow-muted">{item.label}</dt><dd className="mt-1 font-mono text-lg tabular-nums text-glow">{item.value}</dd><dd className="mt-2 font-mono text-[9px] leading-4 text-glow-faint">{item.provenance} · {item.sourceId} · {formatDate(item.recordedAt)} UTC</dd></div>)}</dl>
      <div className="mt-4 rounded-control border border-horizon/50 bg-void/25 p-3"><h3 className="text-xs font-medium text-glow">Physical assessment</h3><p className="mt-1 text-xs leading-5 text-glow-muted">{profile.physicalAssessmentNote}</p></div>
    </section>
    <section className="rounded-2xl border border-horizon/70 bg-hull/65 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion">D · sensorimotor baseline</p><h2 className="mt-1 text-lg font-semibold text-glow">Preflight assessment</h2>
      {baseline ? <><dl className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-control border border-horizon/50 bg-void/30 p-3"><dt className="text-xs text-glow-muted">Mean reaction time</dt><dd className="mt-1 font-mono text-lg text-glow">{baseline.meanReactionTimeMs === null ? "Unavailable" : `${baseline.meanReactionTimeMs.toFixed(1)} ms`}</dd></div><div className="rounded-control border border-horizon/50 bg-void/30 p-3"><dt className="text-xs text-glow-muted">Mean movement time</dt><dd className="mt-1 font-mono text-lg text-glow">{baseline.meanMovementTimeMs === null ? "Unavailable" : `${baseline.meanMovementTimeMs.toFixed(1)} ms`}</dd></div><div className="rounded-control border border-horizon/50 bg-void/30 p-3 sm:col-span-2"><dt className="text-xs text-glow-muted">Mean directional error</dt><dd className="mt-1 font-mono text-lg text-glow">{baseline.meanDirectionalErrorDegrees === null ? "Unavailable · not zero" : `${baseline.meanDirectionalErrorDegrees.toFixed(2)}°`}</dd><dd className="mt-1 text-[10px] text-glow-faint">Eligibility: {baseline.originSensitiveEligible ? "eligible" : "withheld by shared measurement provenance gate"}</dd></div></dl><p className="mt-4 text-[10px] leading-4 text-glow-faint">Source {baseline.session.id} · {formatDate(baseline.session.completedAt)} UTC · {baseline.session.trials.length} raw trials · protocol {baseline.session.measurementProtocolVersion}. Values use existing LIMEN calculation functions.</p></> : <p className="mt-3 text-sm text-glow-muted">No baseline session is present in this fictional fixture.</p>}
    </section>
    <section className="rounded-2xl border border-horizon/70 bg-hull/65 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion">E · subjective experience</p><h2 className="mt-1 text-lg font-semibold text-glow">Latest crew check-in</h2>
      {latestCheckIn ? <><dl className="mt-4 grid gap-2 sm:grid-cols-2">{CHECK_IN_FIELDS.map((field) => <div key={field.field} className="flex items-baseline justify-between gap-3 border-b border-horizon/40 py-2"><dt className="text-xs text-glow-muted">{field.label}<span className="mt-0.5 block text-[9px] text-glow-faint">{field.scale}</span></dt><dd className="shrink-0 font-mono text-sm tabular-nums text-glow">{latestCheckIn.scores[field.field] === undefined ? "Unanswered" : `${latestCheckIn.scores[field.field]} / 10`}</dd></div>)}</dl><p className="mt-4 text-[10px] leading-4 text-glow-faint">Self-report source {latestCheckIn.id} · {formatDate(latestCheckIn.recordedAt)} UTC · {latestCheckIn.provenance}. {latestCheckIn.assessmentSessionId ? `Explicit assessment link: ${latestCheckIn.assessmentSessionId}.` : "No assessment-session link recorded."} Subjective values are not objective measurements.</p></> : <p className="mt-3 text-sm text-glow-muted">No check-in record is present in this fixture.</p>}
    </section>
  </section>;
}
