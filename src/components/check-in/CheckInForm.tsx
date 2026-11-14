"use client";

import { useState } from "react";
import { SymptomScale } from "./SymptomScale";
import { CHECK_IN_FIELDS, EXTENDED_CHECK_IN_FIELDS, createBrowserCheckIn } from "@/lib/checkin/record";
import { saveCheckIn } from "@/lib/storage/checkin-storage";
import type { CheckInContext, ExtendedCheckInAnswers, ExtendedCheckInScoreField, SelfReportedScore } from "@/types/checkin";
import type { MissionPhase } from "@/types/mission";
import { DataCard, ProvenanceLabel } from "@/components/ui/InstrumentUI";

export interface CheckInFormProps {
  readonly context: CheckInContext;
  readonly assessmentSessionId?: string;
  readonly missionContextId?: string;
  readonly missionPhase?: MissionPhase;
  readonly onSaved: () => void;
  readonly onSkip?: () => void;
}

export function CheckInForm({ context, assessmentSessionId, missionContextId, missionPhase, onSaved, onSkip }: CheckInFormProps) {
  const [answers, setAnswers] = useState<ExtendedCheckInAnswers>({});
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const title = context === "pre-assessment" ? "Pre-assessment check-in" : context === "post-assessment" ? "Post-assessment check-in" : "Crew check-in";

  function updateScore(field: ExtendedCheckInScoreField, value: SelfReportedScore | undefined) {
    setAnswers((previous) => ({ ...previous, [field]: value }));
    setStatus("idle");
    setMessage(null);
  }

  async function submit() {
    setStatus("saving");
    setMessage(null);
    try {
      const result = await saveCheckIn(createBrowserCheckIn(context, answers, {
        id: globalThis.crypto.randomUUID(),
        participantId: "browser-participant",
        assessmentSessionId,
        missionContextId,
        missionPhase,
      }));
      if (!result.ok) {
        setStatus("error");
        setMessage(`The check-in was not saved: ${result.error.message}`);
        return;
      }
      setStatus("saved");
      setMessage("Check-in saved on this device. Unanswered items were left blank.");
      setAnswers({});
      setReviewing(false);
      onSaved();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? `The check-in was not saved: ${error.message}` : "The check-in could not be saved.");
    }
  }

  return (
    <DataCard as="section" className="p-5 sm:p-7" aria-labelledby={`${context}-checkin`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ion">Self-reported observation</p>
          <h2 id={`${context}-checkin`} className="mt-2 text-xl font-semibold text-glow">{title}</h2>
        </div>
        <ProvenanceLabel tone="warning">Subjective · not clinical</ProvenanceLabel>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-glow-muted">Rate only what you choose to report. Each item is a subjective self-report, not an objective sensor, vestibular, neurological, or clinical measurement. You may leave any or all items unanswered.</p>

      {!reviewing ? (
        <form onSubmit={(event) => { event.preventDefault(); setReviewing(true); }} className="mt-6 flex flex-col gap-6">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-glow">Original six items</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {CHECK_IN_FIELDS.map((item) => (
                <SymptomScale key={item.field} id={`${context}-${item.field}`} label={item.label} description={`${item.scale}. ${item.polarity === "higher-is-worse" ? "Higher means more reported difficulty." : "Higher means more confidence."}`} value={answers[item.field]} onChange={(value) => updateScore(item.field, value)} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-glow">Optional expanded context</legend>
            <p className="mb-3 text-xs leading-5 text-glow-muted">These six additional self-report items are optional; leaving them blank does not record a zero.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {EXTENDED_CHECK_IN_FIELDS.filter((item) => !CHECK_IN_FIELDS.some((original) => original.field === item.field)).map((item) => (
                <SymptomScale key={item.field} id={`${context}-${item.field}`} label={item.label} description={`${item.scale}. ${item.polarity === "higher-is-worse" ? "Higher means more reported difficulty." : "Higher means a better self-reported state."}`} value={answers[item.field]} onChange={(value) => updateScore(item.field, value)} />
              ))}
            </div>
          </fieldset>
          <label htmlFor={`${context}-note`} className="flex flex-col gap-2 text-sm font-medium text-glow">
            Optional note
            <textarea id={`${context}-note`} value={answers.freeTextNote ?? ""} maxLength={1000} onChange={(event) => { setAnswers((previous) => ({ ...previous, freeTextNote: event.target.value })); setStatus("idle"); setMessage(null); }} className="instrument-control min-h-24 resize-y text-sm font-normal" />
            <span className="text-xs font-normal text-glow-muted">Up to 1,000 characters. Avoid including identifying or sensitive details.</span>
          </label>
          {message && <p role={status === "error" ? "alert" : "status"} className={`text-sm ${status === "error" ? "text-alert-ink" : "text-ion-soft"}`}>{message}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-control bg-ion px-4 py-2.5 text-sm font-semibold text-void transition-colors hover:bg-ion-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion">Review answers</button>
            {onSkip && <button type="button" onClick={onSkip} className="rounded-control border border-horizon px-4 py-2.5 text-sm font-medium text-glow-muted hover:border-ion/50 hover:text-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion">Continue without a check-in</button>}
          </div>
        </form>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <div className="rounded-card border border-horizon bg-void/50 p-4">
            <h3 className="font-semibold text-glow">Review before saving</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {EXTENDED_CHECK_IN_FIELDS.map((field) => (
                <div key={field.field} className="flex items-baseline justify-between gap-3 border-b border-horizon/50 py-1.5">
                  <dt className="text-glow-muted">{field.label}</dt>
                  <dd className="font-medium tabular-nums text-glow">{answers[field.field] ?? "Not answered"}</dd>
                </div>
              ))}
            </dl>
            {answers.freeTextNote?.trim() && <p className="mt-4 border-t border-horizon/50 pt-3 text-sm text-glow-muted">Note: {answers.freeTextNote.trim()}</p>}
          </div>
          {message && <p role={status === "error" ? "alert" : "status"} className={`text-sm ${status === "error" ? "text-alert-ink" : "text-ion-soft"}`}>{message}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { setReviewing(false); setStatus("idle"); setMessage(null); }} disabled={status === "saving"} className="rounded-control border border-horizon px-4 py-2.5 text-sm font-medium text-glow-muted hover:text-glow disabled:opacity-50">Edit answers</button>
            <button type="button" onClick={() => void submit()} disabled={status === "saving" || status === "saved"} className="rounded-control bg-ion px-4 py-2.5 text-sm font-semibold text-void hover:bg-ion-soft disabled:opacity-50">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Confirm and save"}</button>
          </div>
        </div>
      )}
    </DataCard>
  );
}
