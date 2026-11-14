import type { SelfReportedScore } from "@/types/checkin";

export function SymptomScale({ id, label, description, value, onChange }: { readonly id: string; readonly label: string; readonly description: string; readonly value: SelfReportedScore | undefined; readonly onChange: (value: SelfReportedScore | undefined) => void }) {
  return <fieldset className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
    <legend className="text-sm font-medium text-slate-100">{label}</legend>
    <p className="mt-1 text-xs text-slate-400">{description}</p>
    <div className="mt-3 flex items-center gap-3"><input id={id} aria-label={`${label}; 0 through 10`} type="range" min="0" max="10" step="1" value={value ?? 0} onChange={(event) => onChange(Number(event.target.value) as SelfReportedScore)} className="h-2 w-full accent-cyan-300" /><output htmlFor={id} className="min-w-14 rounded bg-slate-800 px-2 py-1 text-center text-sm tabular-nums text-cyan-200">{value ?? "Not answered"}</output><button type="button" onClick={() => onChange(undefined)} className="text-xs text-slate-400 underline underline-offset-2 hover:text-white">Clear</button></div>
  </fieldset>;
}
