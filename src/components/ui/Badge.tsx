import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "warning" | "quiet" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
}

const TONE_CLASSES: Readonly<Record<BadgeTone, string>> = {
  neutral: "border-line-strong bg-surface text-ink-strong",
  accent: "border-accent-edge bg-accent-wash text-accent-ink",
  warning: "border-ember-edge bg-ember-wash text-ember-ink",
  quiet: "border-line bg-surface-muted text-ink-muted",
  danger: "border-alert-edge bg-alert-wash text-alert-ink",
};

/**
 * A compact status label. Tone communicates a role — availability, warning,
 * protocol identity — never a judgement about a person's performance.
 */
export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className ?? ""}`} {...rest}>
      {children}
    </span>
  );
}
