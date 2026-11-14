import type { HTMLAttributes, ReactNode } from "react";

export type NoticeTone = "neutral" | "warning" | "error";

export interface NoticeProps extends HTMLAttributes<HTMLParagraphElement> {
  readonly tone?: NoticeTone;
  readonly children: ReactNode;
}

const TONE_CLASSES: Readonly<Record<NoticeTone, string>> = {
  neutral: "border-line bg-surface-muted text-ink-strong",
  warning: "border-ember-edge bg-ember-wash text-ember-ink",
  error: "border-alert-edge bg-alert-wash text-alert-ink",
};

/**
 * An inline message that carries context a reader must not miss — a data
 * limitation, a protocol warning, a failed read. It never replaces a value
 * with a reassuring placeholder.
 */
export function Notice({ tone = "neutral", className, children, ...rest }: NoticeProps) {
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm leading-6 ${TONE_CLASSES[tone]} ${className ?? ""}`} {...rest}>
      {children}
    </p>
  );
}
