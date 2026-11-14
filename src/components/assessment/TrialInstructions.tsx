export function TrialInstructions({ onBegin, disabled }: { readonly onBegin: () => void; readonly disabled: boolean }) {
  return <section aria-labelledby="assessment-instructions" className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6 text-slate-100 shadow-2xl">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Experimental browser task</p>
    <h2 id="assessment-instructions" className="mt-2 text-xl font-semibold">Move the displayed cursor from the centre to each target.</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">A visual-feedback rotation is introduced during the adaptation phases. Work steadily and accurately. This research-inspired prototype records browser pointer interaction only; it does not diagnose vestibular function, neural activity, or fitness for duty.</p>
    <button type="button" onClick={onBegin} disabled={disabled} className="mt-5 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">Begin 80-trial assessment</button>
    {disabled && <p className="mt-3 text-sm text-amber-200">The task area needs a little more space before the assessment can begin.</p>}
  </section>;
}
