import type { AssessmentResultsSummary } from "@/lib/analytics/session-summary";
import type { AssessmentSession } from "@/types/assessment";

const METRICS = [
  ["Reaction time", "meanReactionTimeMs"],
  ["Movement time", "meanMovementTimeMs"],
  ["Directional error", "meanDirectionalErrorDegrees"],
  ["Trajectory deviation", "meanTrajectoryDeviationCssPixels"],
  ["Correction behaviour", "meanCorrectionCount"],
  ["Adaptation change", "adaptationDirectionalErrorChangeDegrees"],
  ["Washout aftereffect", "signedWashoutAftereffectDegrees"],
] as const;

export function ObservationSummary({ session, summary }: { readonly session: AssessmentSession; readonly summary: AssessmentResultsSummary }) {
  const available = METRICS.filter(([, key]) => summary[key] !== null).length;
  return (
    <section aria-labelledby="observation-summary-title" className="mt-5 rounded-xl border border-cyan-400/25 bg-slate-950/55 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Observation summary · one browser session</p>
      <h3 id="observation-summary-title" className="mt-1 text-base font-semibold text-slate-100">
        {summary.completedTrials} of {summary.totalTrials} trials completed; {available} of {METRICS.length} descriptive metrics available
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Source session <span className="font-mono text-xs text-cyan-100">{session.metadata.sessionId}</span>, recorded {session.metadata.completedAt ? new Date(session.metadata.completedAt).toLocaleString() : "with no completion timestamp"}. This is not a trend or a comparison; availability is limited by the validated measurement protocol and recorded trials.
      </p>
      <a href="#raw-trial-records" className="mt-3 inline-flex text-sm font-medium text-cyan-200 underline-offset-4 hover:underline">Review the underlying trial records</a>
    </section>
  );
}

export function RawTrialRecords({ session }: { readonly session: AssessmentSession }) {
  return (
    <details id="raw-trial-records" className="mt-6 rounded-xl border border-slate-700 bg-slate-950/45 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">Underlying trial records ({session.trials.length})</summary>
      <p className="mt-2 text-xs leading-5 text-slate-400">Source trial fields are shown as stored. No trial is imputed, pooled across sessions, or converted here into an additional metric.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <caption className="sr-only">Raw trial index, phase, outcome, target direction, and captured trajectory sample count for this assessment session.</caption>
          <thead className="text-xs text-slate-400"><tr><th scope="col" className="pb-2 pr-4">Trial</th><th scope="col" className="pb-2 pr-4">Phase</th><th scope="col" className="pb-2 pr-4">Outcome</th><th scope="col" className="pb-2 pr-4">Target</th><th scope="col" className="pb-2">Captured path points</th></tr></thead>
          <tbody>{session.trials.map((trial) => <tr key={trial.id} className="border-t border-slate-800"><td className="py-2 pr-4 font-mono tabular-nums text-slate-200">{trial.index + 1}</td><td className="py-2 pr-4 text-slate-300">{trial.phase}</td><td className="py-2 pr-4 text-slate-300">{trial.outcome}</td><td className="py-2 pr-4 text-slate-300">{trial.target.direction}</td><td className="py-2 text-slate-300">{trial.trajectory.length}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}
