"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SimulationAlert } from "@/lib/simulation/alerts";
import type { AstronautId } from "@/lib/simulation/profiles";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function SimulationAlertDialog({ alerts, astronautName, astronautId, open, onDismiss }: { readonly alerts: readonly SimulationAlert[]; readonly astronautName: string; readonly astronautId: AstronautId; readonly open: boolean; readonly onDismiss: (id: AstronautId) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = alerts[activeIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!active || !open) return null;
  return (
    <dialog ref={dialogRef} aria-labelledby="simulation-alert-title" onCancel={() => onDismiss(astronautId)} onClose={() => onDismiss(astronautId)} className="m-auto max-h-[calc(100vh-2rem)] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-amber-200/30 bg-[#0b1726] p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/75">
      <div className="flex items-start justify-between gap-4 border-b border-slate-700 px-5 py-4 sm:px-6">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">Simulation observation · {active.ruleId} · v{active.ruleVersion}</p><h2 id="simulation-alert-title" className="mt-2 text-xl font-semibold">{active.title}</h2><p className="mt-1 text-sm text-slate-400">{astronautName} · fictional record only</p></div>
        <button type="button" aria-label="Dismiss simulation alert" onClick={() => onDismiss(astronautId)} className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-300 hover:border-amber-200/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">×</button>
      </div>
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3"><dt className="text-[10px] uppercase tracking-wider text-slate-400">Triggering condition</dt><dd className="mt-1 text-sm leading-5">{active.condition}</dd></div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3"><dt className="text-[10px] uppercase tracking-wider text-slate-400">Recorded value</dt><dd className="mt-1 font-mono text-sm tabular-nums text-cyan-100">{active.value}</dd></div>
          {active.previousValue && <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3"><dt className="text-[10px] uppercase tracking-wider text-slate-400">Previous / current</dt><dd className="mt-1 font-mono text-sm tabular-nums">{active.previousValue} <span aria-hidden="true">→</span> {active.currentValue}</dd></div>}
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3"><dt className="text-[10px] uppercase tracking-wider text-slate-400">Recorded at · UTC</dt><dd className="mt-1 text-sm"><time dateTime={active.timestamp}>{dateTimeFormat.format(new Date(active.timestamp))}</time></dd></div>
        </dl>
        <p className="text-sm leading-6 text-slate-300">{active.explanation}</p>
        <p className="rounded-lg border border-amber-200/25 bg-amber-200/[0.06] p-3 text-xs leading-5 text-amber-100">{active.limitations}</p>
        <div><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Supporting records</h3><ul className="mt-2 flex flex-col gap-2">{active.sources.map((source) => <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs"><span className="font-mono text-slate-200">{source.label} · {source.id}</span><Link href={source.href} onClick={() => onDismiss(astronautId)} className="text-cyan-200 underline underline-offset-4">Inspect source</Link></li>)}</ul></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
          <span className="text-xs text-slate-400">Demonstration only · {activeIndex + 1} of {alerts.length}</span>
          <div className="flex gap-2">{alerts.length > 1 && <button type="button" onClick={() => setActiveIndex((index) => (index + alerts.length - 1) % alerts.length)} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">Previous</button>}{alerts.length > 1 && <button type="button" onClick={() => setActiveIndex((index) => (index + 1) % alerts.length)} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">Next</button>}<button type="button" onClick={() => onDismiss(astronautId)} className="min-h-10 rounded-lg bg-cyan-300 px-4 text-xs font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">Review and dismiss</button></div>
        </div>
      </div>
    </dialog>
  );
}
