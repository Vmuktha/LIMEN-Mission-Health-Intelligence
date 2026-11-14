import Link from "next/link";

export function RecoveryHeader({ completedSessions }: { readonly completedSessions: number | null }) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
      <div className="border-b border-slate-800 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">LIMEN · Recovery intelligence</p>
          <p className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">Research prototype · descriptive only</p>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Recovery Intelligence</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Longitudinal, within-person observations of sensorimotor adaptation and readaptation from completed browser assessment sessions. Values are descriptive browser measurements, not clinical recovery determinations or readiness scores.
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Local profile</p>
            <p className="mt-2 text-sm font-medium text-slate-100">Browser-local participant profile</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">One local research profile. No account, cloud synchronization, verified human identity, or multi-participant management. Records stay in this browser profile.</p>
          </div>
        </div>
      </div>
      <nav aria-label="Recovery dashboard sections" className="flex flex-wrap gap-x-5 gap-y-2 px-6 py-3 text-xs text-slate-400 sm:px-8">
        <a className="hover:text-cyan-200" href="#recovery-overview">Overview</a>
        <a className="hover:text-cyan-200" href="#reference-session">Personal reference</a>
        <a className="hover:text-cyan-200" href="#recovery-metrics">Metrics</a>
        <a className="hover:text-cyan-200" href="#recovery-trends">Trends</a>
        <a className="hover:text-cyan-200" href="#check-in-history">Check-ins</a>
        <a className="hover:text-cyan-200" href="#alignment">Alignment</a>
        <a className="hover:text-cyan-200" href="#data-quality">Data quality</a>
        <Link className="ml-auto text-cyan-300 hover:text-cyan-200" href="/assessment">Open assessment →</Link>
      </nav>
      {completedSessions !== null && (
        <p className="border-t border-slate-800 px-6 py-2 text-xs text-slate-400 sm:px-8">
          This view is derived from {completedSessions} completed assessment observation{completedSessions === 1 ? "" : "s"} in the current browser profile. All timestamps are shown in UTC.
        </p>
      )}
    </header>
  );
}
