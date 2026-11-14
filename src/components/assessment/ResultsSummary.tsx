import { CURRENT_PROTOCOL_VERSION } from "@/lib/assessment/protocol";
import type { MeasurementValidity } from "@/lib/assessment/measurement-validity";
import { summarizeAssessmentResults } from "@/lib/analytics/session-summary";
import type { AssessmentSession } from "@/types/assessment";

function value(value: number | null, unit: string) { return value === null ? "Unavailable / insufficient data" : `${value.toFixed(1)} ${unit}`; }

function validityMessage(validity: MeasurementValidity): string | null {
  switch (validity) {
    case "corrected-actual-origin":
      return null;
    case "no-trials":
      return "No trials were recorded in this session, so derived metrics are unavailable.";
    case "mixed-measurement-protocols":
      return "Mixed measurement protocols: this session contains more than one per-trial measurement protocol version. Directional error, trajectory deviation, correction behaviour, adaptation change, washout aftereffect, reaction time, and movement time are all withheld rather than pooling incompatible protocols.";
    case "inconsistent-origin-provenance":
      return "Some trials do not have verified origin provenance. Directional error, trajectory deviation, correction behaviour, adaptation change, and washout aftereffect are unavailable. Reaction and movement times remain available where timestamps are valid.";
    case "legacy-origin-unverified":
      return "Origin-unverified legacy session: directional error, trajectory deviation, correction behaviour, adaptation change, and washout aftereffect are unavailable and must not be compared with corrected sessions. Reaction and movement times remain available where timestamps are valid.";
    case "inconsistent-session-protocol":
      return "Session protocol metadata does not match the trial-level measurement protocol, or the measurement version is missing. All pooled derived metrics are withheld conservatively; the raw records remain available.";
    case "unknown-protocol":
      return "The trial measurement protocol is missing or unrecognized. All pooled derived metrics are withheld conservatively; the raw records remain available.";
    default:
      return "The measurement protocol could not be validated. All pooled derived metrics are withheld conservatively; the raw records remain available.";
  }
}

export function ResultsSummary({ session }: { readonly session: AssessmentSession }) {
  const summary = summarizeAssessmentResults(session);
  const notice = validityMessage(summary.measurementValidity);
  return <section aria-labelledby="assessment-results" className="rounded-2xl border border-cyan-400/30 bg-slate-900/90 p-6 shadow-xl">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Completed browser session</p>
    <h2 id="assessment-results" className="mt-2 text-2xl font-semibold">Descriptive session summary</h2>
    <p className="mt-2 text-sm leading-6 text-slate-300">These are browser-derived behavioural summaries, not medical conclusions, a readiness score, or a fitness-for-duty determination.</p>
    {notice && <p role="note" className="mt-4 rounded-lg border border-amber-300/30 bg-amber-950/30 p-3 text-sm text-amber-100">{notice}</p>}
    {session.metadata.protocolVersion !== CURRENT_PROTOCOL_VERSION && <p role="note" className="mt-3 rounded-lg border border-slate-600 bg-slate-950/60 p-3 text-sm text-slate-300">This session used protocol {session.metadata.protocolVersion || "unknown"}. Sessions recorded under different protocol versions are not directly comparable for derived metrics.</p>}
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"><dt className="text-slate-400">Session ID</dt><dd className="mt-1 break-all font-mono text-xs text-cyan-100">{session.metadata.sessionId}</dd></div><div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"><dt className="text-slate-400">Completed</dt><dd className="mt-1 text-slate-100">{session.metadata.completedAt ? new Date(session.metadata.completedAt).toLocaleString() : "Unavailable"}</dd></div></dl>
    <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">Directly captured browser records</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><Metric label="Completed trials" value={`${summary.completedTrials} / ${summary.totalTrials}`} /><Metric label="Invalid trials" value={String(summary.invalidTrials)} /><Metric label="Timed-out or aborted trials" value={String(summary.incompleteTrials)} /></div>
    <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">Derived descriptive metrics</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Metric label="Reaction time" value={value(summary.meanReactionTimeMs, "ms")} /><Metric label="Movement time" value={value(summary.meanMovementTimeMs, "ms")} /><Metric label="Mean directional error (all phases)" value={value(summary.meanDirectionalErrorDegrees, "degrees")} /><Metric label="Trajectory deviation" value={value(summary.meanTrajectoryDeviationCssPixels, "CSS px")} /><Metric label="Correction behaviour" value={value(summary.meanCorrectionCount, "turns")} /><Metric label="Adaptation error change" value={value(summary.adaptationDirectionalErrorChangeDegrees, "degrees")} /><Metric label="Signed washout aftereffect" value={value(summary.signedWashoutAftereffectDegrees, "degrees")} /></div>
    <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">Phase summaries</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-slate-400"><tr><th className="pb-2">Phase</th><th className="pb-2">Eligible / total</th><th className="pb-2">Mean directional error</th><th className="pb-2">Mean reaction time</th><th className="pb-2">Mean movement time</th></tr></thead><tbody>{summary.phaseSummaries.map((phase) => <tr key={phase.phase} className="border-t border-slate-800"><td className="py-2 text-slate-100">{phase.phase}</td><td className="py-2">{phase.validTrialCount} / {phase.totalTrialCount}</td><td className="py-2">{value(phase.meanDirectionalErrorDegrees, "degrees")}</td><td className="py-2">{value(phase.meanReactionTimeMs, "ms")}</td><td className="py-2">{value(phase.meanMovementTimeMs, "ms")}</td></tr>)}</tbody></table></div>
  </section>;
}

function Metric({ label, value: metricValue }: { readonly label: string; readonly value: string }) { return <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-cyan-100">{metricValue}</dd></div>; }
