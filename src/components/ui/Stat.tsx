export interface StatProps {
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
}

/**
 * A single figure inside a definition list. The value is numeric by contract,
 * so it is always set in tabular figures and never animated.
 */
export function Stat({ label, value, detail }: StatProps) {
  return (
    <div className="rounded-control border border-line bg-surface-muted/70 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink-strongest">
        {value}
        {detail && <span className="mt-1 block text-xs font-normal leading-5 tracking-normal text-ink-muted">{detail}</span>}
      </dd>
    </div>
  );
}
