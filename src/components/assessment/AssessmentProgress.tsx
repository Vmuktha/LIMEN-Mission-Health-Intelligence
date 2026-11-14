import type { TrialEngineState } from "@/lib/assessment/trial-engine";

export function AssessmentProgress({ engine }: { readonly engine: TrialEngineState }) {
  const active = engine.activeTrial;
  const currentPlan = active?.plan ?? engine.positioningTrial?.plan;
  const phase = currentPlan ? engine.protocol.phases.find((item) => item.phase === currentPlan.phase) : undefined;
  const completed = engine.records.length;
  const phaseCompleted = active ? engine.records.filter((trial) => trial.phase === active.plan.phase).length : 0;
  const phasePercentage = phase ? Math.round((phaseCompleted / phase.trialCount) * 100) : 100;
  const overallPercentage = Math.round((completed / engine.plannedTrials.length) * 100);
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
    <div className="min-w-56 flex-1"><div><span className="text-slate-400">Phase </span><strong>{phase?.label ?? (engine.status === "completed" ? "Complete" : "Preparing")}</strong>{active && <span className="ml-2 text-cyan-300">{active.plan.rotationCondition === "clockwise-45-degrees" ? "45° clockwise visual feedback" : "Normal visual feedback"}</span>}{engine.positioningTrial && <span className="ml-2 text-cyan-300">Position pointer at start marker</span>}</div><div aria-label={`Phase progress: ${phasePercentage}%`} className="mt-2 h-1.5 overflow-hidden rounded bg-slate-700"><div className="h-full bg-cyan-300" style={{ width: `${phasePercentage}%` }} /></div></div>
    <div className="min-w-36" aria-live="polite"><div><span className="text-slate-400">Trial </span><strong>{Math.min(engine.nextTrialIndex + (active ? 1 : 0), engine.plannedTrials.length)} / {engine.plannedTrials.length}</strong></div><div aria-label={`Overall progress: ${overallPercentage}%`} className="mt-2 h-1.5 overflow-hidden rounded bg-slate-700"><div className="h-full bg-blue-400" style={{ width: `${overallPercentage}%` }} /></div></div>
  </div>;
}
