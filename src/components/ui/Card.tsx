import type { HTMLAttributes, ReactNode } from "react";

export type CardElement = "div" | "section" | "article" | "aside";
export type CardSurface = "paper" | "hull" | "void";
export type CardPadding = "none" | "sm" | "md" | "section";
export type CardElevation = "none" | "card" | "panel" | "overlay";
export type CardRadius = "control" | "card" | "panel";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly as?: CardElement;
  readonly surface?: CardSurface;
  readonly padding?: CardPadding;
  readonly elevation?: CardElevation;
  readonly radius?: CardRadius;
  readonly children: ReactNode;
}

const SURFACE_CLASSES: Readonly<Record<CardSurface, string>> = {
  paper: "border-line bg-surface",
  hull: "border-horizon bg-hull",
  void: "border-horizon bg-void",
};

const PADDING_CLASSES: Readonly<Record<CardPadding, string>> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  section: "p-5 sm:p-6",
};

const ELEVATION_CLASSES: Readonly<Record<CardElevation, string>> = {
  none: "",
  card: "shadow-card",
  panel: "shadow-panel",
  overlay: "shadow-overlay",
};

const RADIUS_CLASSES: Readonly<Record<CardRadius, string>> = {
  control: "rounded-control",
  card: "rounded-card",
  panel: "rounded-panel",
};

/**
 * The single surface primitive. Glass and glow belong to environment chrome,
 * never to panels that carry measured values.
 */
export function Card({
  as = "div",
  surface = "paper",
  padding = "md",
  elevation = "none",
  radius = "panel",
  className,
  children,
  ...rest
}: CardProps) {
  const classes = `${SURFACE_CLASSES[surface]} ${PADDING_CLASSES[padding]} ${ELEVATION_CLASSES[elevation]} ${RADIUS_CLASSES[radius]} ${className ?? ""}`;
  if (as === "section") return <section className={classes} {...rest}>{children}</section>;
  if (as === "article") return <article className={classes} {...rest}>{children}</article>;
  if (as === "aside") return <aside className={classes} {...rest}>{children}</aside>;
  return <div className={classes} {...rest}>{children}</div>;
}
