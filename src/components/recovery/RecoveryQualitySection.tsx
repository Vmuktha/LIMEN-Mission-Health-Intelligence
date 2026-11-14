import type { ReactNode } from "react";
import { formatRecoveryDateTime, type RecoveryQualityView } from "@/lib/analytics/recovery-dashboard";
import type { RecoveryDataset } from "@/types/recovery";
import { Badge, Notice, Stat } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function RecoveryQualitySection({
  quality,
  dataset,
}: {
  readonly quality: RecoveryQualityView | null;
  readonly dataset: RecoveryDataset;
}) {
  return (
    <RecoverySection
      id="data-quality"
      eyebrow="Data quality and scientific transparency"
      title="Protocol, trials, and unavailable values"
      description="Quality information is shown next to the measurements rather than hidden in logs. Missing values remain unavailable; they are never imputed as zero. Measurement protocols are never pooled when they differ."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {quality === null ? (
            <Notice tone="neutral">No completed observation is selected.</Notice>
          ) : (
            <>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <QualityItem label="Observation" value={formatRecoveryDateTime(quality.completedAt)} />
                <QualityItem label="Input device" value={quality.inputDevice} />
                <QualityItem label="Measurement protocol" value={quality.measurementProtocolLabel} />
                <QualityItem label="Assessment protocol" value={quality.assessmentProtocolVersion} />
                <QualityItem label="Measurement validity" value={quality.measurementValidityLabel} />
                <QualityItem label="Stored measurement labels" value={quality.measurementVersions.length > 0 ? quality.measurementVersions.join(", ") : "None"} mono />
              </dl>

              {quality.validityExplanation && (
                <Notice tone="warning">{quality.validityExplanation}</Notice>
              )}

              <div className="flex flex-wrap gap-1.5">
                <Badge tone={quality.timingMetricsEligible ? "accent" : "warning"}>Timing metrics {quality.timingMetricsEligible ? "eligible" : "unavailable"}</Badge>
                <Badge tone={quality.originSensitiveMetricsEligible ? "accent" : "warning"}>Origin-sensitive metrics {quality.originSensitiveMetricsEligible ? "eligible" : "unavailable"}</Badge>
                <Badge tone={quality.dataQualityValid ? "accent" : "warning"}>Record validation {quality.dataQualityValid ? "passed" : "issues detected"}</Badge>
                {quality.legacyTimingOnly && <Badge tone="warning">Legacy timing-only observation</Badge>}
              </div>

              <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
                <Stat label="Total trials" value={String(quality.totalTrials)} />
                <Stat label="Completed" value={String(quality.completedTrials)} />
                <Stat label="Invalid" value={String(quality.invalidTrials)} />
                <Stat label="Timed out" value={String(quality.timedOutTrials)} />
                <Stat label="Aborted" value={String(quality.abortedTrials)} />
                <Stat label="Non-finite" value={String(quality.nonFiniteTrialCount)} />
                <Stat label="Session-ID mismatch" value={String(quality.sessionIdMismatchCount)} />
                <Stat label="Eligible metrics" value={`${quality.eligibleMetrics.length} / 8`} />
              </dl>

              {quality.issues.length > 0 && (
                <details className="rounded-lg border border-slate-200 bg-white p-3" open>
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">Validation issues ({quality.issues.length})</summary>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                    {quality.issues.map((issue, index) => (
                      <li key={`${issue.code}-${issue.trialId ?? index}`}>
                        <span className={issue.severity === "error" ? "font-medium text-rose-800" : "font-medium text-amber-800"}>{issue.severity}</span>
                        {" · "}{issue.code}{issue.trialId ? ` · trial ${issue.trialId}` : ""}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <details className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">Missing-data explanations ({quality.missingDataExplanations.length})</summary>
                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                  {quality.missingDataExplanations.map((explanation) => <li key={explanation}>{explanation}</li>)}
                </ul>
              </details>

              {quality.unavailableMetrics.length > 0 && (
                <details className="rounded-lg border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">Unavailable metric reasons ({quality.unavailableMetrics.length})</summary>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                    {quality.unavailableMetrics.map((metric) => <li key={metric.metric}><span className="font-medium text-slate-800">{metric.label}:</span> {metric.reason}</li>)}
                  </ul>
                </details>
              )}
            </>
          )}

          <p className="text-xs leading-5 text-slate-500">
            Dataset: {dataset.loadedSessionCount} session record{dataset.loadedSessionCount === 1 ? "" : "s"} loaded, {dataset.excludedSessions.length} excluded, {dataset.rejectedRecords.length} rejected. Excluded and rejected records are not plotted or used as reference values.
          </p>
        </div>

        <ScientificNotes />
      </div>

      <div className="mt-5">
        <Notice tone="warning">
          LIMEN is a research prototype. This dashboard is not a clinically validated recovery system, diagnostic tool, fitness-for-duty determination, or readiness score. It describes browser-derived sensorimotor measurements and subjective self-reports only.
        </Notice>
      </div>
    </RecoverySection>
  );
}

function QualityItem({ label, value, mono = false }: { readonly label: string; readonly value: string; readonly mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm text-slate-900 ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function ScientificNotes() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Reading this dashboard</p>
      <ScientificNote title="Browser-local participant profile">
        LIMEN keeps one participant profile in this browser profile using the existing participant ID. It is not a verified human identity, account system, cross-device record, or multi-participant registry. Clearing site data can remove the records.
      </ScientificNote>
      <ScientificNote title="What a Personal Reference Session means">
        A Personal Reference Session is an explicit within-person comparison reference. It is not a clinical baseline and does not imply that earlier measurements were healthy. The default is the earliest completed observation eligible for each metric, never the best-performing or most recent session.
      </ScientificNote>
      <ScientificNote title="Why protocol versions are not pooled">
        Measurement protocol v0.2.0 and v0.3.0 differ in whether the native pointer was hidden. Legacy records also lack verified actual-pointer origins. Because these are different measurement procedures, their values are kept in separate series and a comparison is unavailable unless both observations share the same measurement and assessment protocol versions.
      </ScientificNote>
      <ScientificNote title="Why missing data is not zero">
        A missing, invalid, timed-out, or non-finite measurement stays null. Zero would be a real measurement and would change means, trends, and differences. LIMEN does not interpolate gaps, impute zeros, or fill the dashboard with simulated observations.
      </ScientificNote>
      <ScientificNote title="How to read change">
        Differences are <span className="font-mono text-xs">current − reference</span>. The sign is a mathematical direction only. LIMEN does not label a change as improvement or deterioration, apply recovery thresholds, or infer causation between performance and self-report.
      </ScientificNote>
      <ScientificNote title="What this dashboard does not measure">
        The task does not measure vestibular function, brain activity, neural adaptation, medical recovery, astronaut operational readiness, or fitness for duty. Input device, display, fatigue, instruction adherence, and practice can affect browser measurements.
      </ScientificNote>
    </div>
  );
}

function ScientificNote({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-700">{title}</summary>
      <p className="mt-2 text-xs leading-5 text-slate-600">{children}</p>
    </details>
  );
}
