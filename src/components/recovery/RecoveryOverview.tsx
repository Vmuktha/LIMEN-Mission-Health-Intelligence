import { formatRecoveryDateTime } from "@/lib/analytics/recovery-dashboard";
import type { RecoveryOverview as RecoveryOverviewModel } from "@/lib/analytics/recovery-dashboard";
import type { RecoveryDataset } from "@/types/recovery";
import { Notice, Stat } from "@/components/ui";
import { RecoverySection } from "./RecoverySection";

export function RecoveryOverview({
  overview,
  dataset,
}: {
  readonly overview: RecoveryOverviewModel;
  readonly dataset: RecoveryDataset;
}) {
  return (
    <RecoverySection
      id="recovery-overview"
      eyebrow="Data overview"
      title="What is available in this browser profile"
      description="Completed sessions and eligible observations are different counts. A completed session becomes eligible only when at least one metric can be derived under its measurement protocol."
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Completed sessions"
          value={String(overview.completedSessions)}
          detail="Validated completed assessment sessions."
        />
        <Stat
          label="Eligible observations"
          value={String(overview.eligibleObservations)}
          detail="Sessions with at least one eligible metric."
        />
        <Stat
          label="Associated check-ins"
          value={String(overview.associatedCheckIns)}
          detail="Explicitly linked to a completed session."
        />
        <Stat
          label="Most recent observation"
          value={overview.mostRecentCompletedAt ? formatRecoveryDateTime(overview.mostRecentCompletedAt) : "None"}
          detail="Ordered by actual completion timestamp."
        />
      </dl>

      <div className="mt-5 space-y-2">
        <Notice tone="neutral">
          {overview.completedSessions === overview.eligibleObservations
            ? "Each completed session currently has at least one eligible metric. Eligibility is still assessed separately for every metric."
            : `${overview.completedSessions - overview.eligibleObservations} completed session${overview.completedSessions - overview.eligibleObservations === 1 ? " is" : "s are"} not eligible for any metric and cannot contribute a comparison.`}
        </Notice>
        <p className="text-xs leading-5 text-slate-500">
          Loaded {dataset.loadedSessionCount} stored session record{dataset.loadedSessionCount === 1 ? "" : "s"} and {dataset.loadedCheckInCount} check-in record{dataset.loadedCheckInCount === 1 ? "" : "s"}. Records are validated defensively; metrics are recomputed from raw trials.
        </p>
        {(overview.excludedSessions > 0 || overview.rejectedRecords > 0) && (
          <Notice tone="warning">
            {overview.excludedSessions} session{overview.excludedSessions === 1 ? " was" : "s were"} excluded (incomplete or missing a valid completion timestamp) and {overview.rejectedRecords} record{overview.rejectedRecords === 1 ? " was" : "s were"} rejected as malformed, simulated, non-browser, or invalid. They are not displayed as observations and are never replaced with sample data.
          </Notice>
        )}
      </div>
    </RecoverySection>
  );
}
