"use client";

import { useState } from "react";
import { SymptomScale } from "./SymptomScale";
import { CHECK_IN_FIELDS, createBrowserCheckIn, type CheckInAnswers } from "@/lib/checkin/record";
import { saveCheckIn } from "@/lib/storage/checkin-storage";
import type { CheckInContext, SelfReportedScore } from "@/types/checkin";

export function CheckInForm({ context, assessmentSessionId, onSaved, onSkip }: { readonly context: CheckInContext; readonly assessmentSessionId?: string; readonly onSaved: () => void; readonly onSkip?: () => void }) {
  const [answers, setAnswers] = useState<CheckInAnswers>({});
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const updateScore = (field: keyof Omit<CheckInAnswers, "freeTextNote">, value: SelfReportedScore | undefined) => setAnswers((previous) => ({ ...previous, ...(value === undefined ? { [field]: undefined } : { [field]: value }) }));
  const submit = async () => {
    setStatus("saving"); setMessage(null);
    const id = globalThis.crypto?.randomUUID?.() ?? `limen-checkin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const result = await saveCheckIn(createBrowserCheckIn(context, answers, { id, participantId: "browser-participant", assessmentSessionId }));
    if (result.ok) { setStatus("saved"); setMessage("Self-report saved locally in this browser."); onSaved(); }
    else { setStatus("error"); setMessage(`Self-report was not saved: ${result.error.message}`); }
  };
  const title = context === "pre-assessment" ? "Pre-assessment sensorimotor check-in" : "Post-assessment sensorimotor check-in";
  return <section aria-labelledby={`${context}-checkin`} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-5 shadow-xl">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Optional subjective self-report</p>
    <h2 id={`${context}-checkin`} className="mt-2 text-xl font-semibold">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-300">You may leave every item unanswered. These ratings are subjective self-reports, not objective sensor, vestibular, neurological, or clinical measurements.</p>
    {!reviewing ? <><div className="mt-5 grid gap-3 md:grid-cols-2">{CHECK_IN_FIELDS.map((item) => <SymptomScale key={item.field} id={`${context}-${item.field}`} label={item.label} description={item.scale} value={answers[item.field]} onChange={(value) => updateScore(item.field, value)} />)}</div><label className="mt-4 block text-sm font-medium text-slate-100" htmlFor={`${context}-note`}>Optional note<textarea id={`${context}-note`} value={answers.freeTextNote ?? ""} maxLength={1000} onChange={(event) => setAnswers((previous) => ({ ...previous, freeTextNote: event.target.value }))} className="mt-2 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm font-normal text-slate-100 focus:border-cyan-300" /></label><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setReviewing(true)} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Review answers</button>{onSkip && <button type="button" onClick={onSkip} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200">Continue without a check-in</button>}</div></> : <><div className="mt-5 rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300"><p className="font-medium text-white">Review before saving</p><ul className="mt-3 space-y-1">{CHECK_IN_FIELDS.map((item) => <li key={item.field}>{item.label}: <span className="text-cyan-200">{answers[item.field] ?? "Not answered"}</span></li>)}<li>Note: <span className="text-cyan-200">{answers.freeTextNote?.trim() || "Not provided"}</span></li></ul></div><div className="mt-4 flex gap-3"><button type="button" onClick={() => setReviewing(false)} disabled={status === "saving"} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200">Edit</button><button type="button" onClick={() => void submit()} disabled={status === "saving" || status === "saved"} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{status === "saving" ? "Saving…" : "Confirm and save"}</button></div></>}
    {message && <p role="status" className="mt-4 text-sm text-slate-300">{message}</p>}
  </section>;
}
