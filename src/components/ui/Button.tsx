import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly children: ReactNode;
}

const VARIANT_CLASSES: Readonly<Record<ButtonVariant, string>> = {
  primary: "bg-ion text-void hover:bg-ion-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink-faint hover:text-ink-strongest",
  ghost: "text-ink-soft hover:text-ink-strongest",
  danger: "border border-alert-edge bg-alert-wash text-alert-ink hover:border-alert hover:text-alert-ink",
};

const SIZE_CLASSES: Readonly<Record<ButtonSize, string>> = {
  sm: "gap-1.5 px-2.5 py-1 text-xs",
  md: "gap-2 px-4 py-2 text-sm",
};

/**
 * The single button primitive. Motion is limited to a colour transition so the
 * control never competes with instrument surfaces for attention.
 */
export function Button({ variant = "secondary", size = "md", className, type = "button", children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-control font-medium transition-colors duration-fast ease-linen disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
