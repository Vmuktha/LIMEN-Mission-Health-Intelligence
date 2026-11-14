import type { ReactNode } from "react";

export interface SectionHeaderProps {
  /** Element id of the rendered heading; pair it with `aria-labelledby` on the section. */
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

/**
 * The shared heading block for a content region: an optional eyebrow, the
 * heading itself, supporting copy, and a slot for controls.
 */
export function SectionHeader({ id, eyebrow, title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className ?? ""}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-label">{eyebrow}</p>}
        <h2 id={id} className="mt-1 text-xl font-semibold tracking-tight text-ink-strongest">{title}</h2>
        {description && <div className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
