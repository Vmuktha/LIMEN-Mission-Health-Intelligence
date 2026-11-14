import type { HTMLAttributes, ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, aside }: { readonly eyebrow: string; readonly title: string; readonly description: ReactNode; readonly aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-horizon/70 pb-6">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ion">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-glow sm:text-4xl">{title}</h1>
        <div className="mt-3 text-sm leading-7 text-glow-muted">{description}</div>
      </div>
      {aside && <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div>}
    </header>
  );
}

export function DataCard({ children, className = "", as = "article", ...attributes }: HTMLAttributes<HTMLElement> & { readonly children: ReactNode; readonly as?: "article" | "section" | "div" }) {
  const classes = `rounded-panel border border-horizon/80 bg-hull-raised/70 shadow-panel ${className}`;
  const Element = as;
  return <Element className={classes} {...attributes}>{children}</Element>;
}

export function MetricCard({ label, value, detail }: { readonly label: string; readonly value: string; readonly detail?: ReactNode }) {
  return (
    <DataCard className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-glow-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-glow">{value}</p>
      {detail && <div className="mt-2 text-xs leading-5 text-glow-muted">{detail}</div>}
    </DataCard>
  );
}

export function EmptyState({ title, children, concept = false, action }: { readonly title: string; readonly children: ReactNode; readonly concept?: boolean; readonly action?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-horizon bg-void/50 px-5 py-8 text-center sm:px-8">
      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${concept ? "border-ember/40 bg-ember/10 text-ember" : "border-horizon text-glow-muted"}`}>
        {concept ? "Concept preview — not live data" : "No live records"}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-glow">{title}</h3>
      <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-glow-muted">{children}</div>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ProvenanceLabel({ children, tone = "neutral" }: { readonly children: ReactNode; readonly tone?: "neutral" | "accent" | "warning" }) {
  const toneClass = tone === "accent" ? "border-ion/30 bg-ion/10 text-ion-soft" : tone === "warning" ? "border-ember/30 bg-ember/10 text-amber-200" : "border-horizon text-glow-muted";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}>{children}</span>;
}

export function FormField({ label, htmlFor, hint, children }: { readonly label: string; readonly htmlFor: string; readonly hint?: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-glow">{label}</label>
      {children}
      {hint && <p className="text-xs leading-5 text-glow-muted">{hint}</p>}
    </div>
  );
}

export function StatusIndicator({ label, status }: { readonly label: string; readonly status: "available" | "warning" | "unavailable" }) {
  const color = status === "available" ? "bg-ion" : status === "warning" ? "bg-ember" : "bg-glow-faint";
  return <span className="inline-flex items-center gap-2 text-xs text-glow-muted"><span aria-hidden="true" className={`size-1.5 rounded-full ${color}`} />{label}</span>;
}

export function PhaseTimeline({ phases, current }: { readonly phases: readonly string[]; readonly current?: string }) {
  return (
    <ol aria-label="Mission phase timeline" className="flex flex-wrap items-center gap-2">
      {phases.map((phase, index) => (
        <li key={`${phase}-${index}`} className="flex items-center gap-2">
          <span aria-current={phase === current ? "step" : undefined} className={`rounded-full border px-3 py-1.5 text-xs ${phase === current ? "border-ion/50 bg-ion/10 text-ion-soft" : "border-horizon bg-void/50 text-glow-muted"}`}>{phase}</span>
          {index < phases.length - 1 && <span aria-hidden="true" className="text-horizon">→</span>}
        </li>
      ))}
    </ol>
  );
}

export function EventStream({ entries }: { readonly entries: readonly { readonly id: string; readonly title: string; readonly timestamp: string; readonly detail?: ReactNode; readonly badge?: ReactNode }[] }) {
  return (
    <ol className="relative flex flex-col gap-0 border-l border-horizon pl-5">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pb-6 last:pb-0">
          <span aria-hidden="true" className="absolute -left-[1.55rem] top-1 size-2 rounded-full border border-ion/70 bg-hull-raised" />
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-glow">{entry.title}</h3>
            {entry.badge}
          </div>
          <time dateTime={entry.timestamp} className="mt-1 block text-xs text-glow-muted">{new Date(entry.timestamp).toLocaleString()}</time>
          {entry.detail && <div className="mt-2 text-sm leading-6 text-glow-muted">{entry.detail}</div>}
        </li>
      ))}
    </ol>
  );
}

export function DataTable({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-control border border-horizon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ion"><table className="w-full border-collapse text-left text-sm">{children}</table></div>;
}

export function DetailPanel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <details className="rounded-card border border-horizon bg-void/40"><summary className="cursor-pointer px-4 py-3 text-sm font-medium text-glow marker:text-ion">{title}</summary><div className="border-t border-horizon/70 px-4 py-4 text-sm leading-6 text-glow-muted">{children}</div></details>;
}
