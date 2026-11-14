import type { ReactNode } from "react";

export interface StorySectionProps {
  readonly id: string;
  readonly index: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly aside?: ReactNode;
  readonly tone?: "void" | "hull";
}

/**
 * One chapter of the landing narrative. The layout holds the chapter marker in
 * a narrow column and the statement in a wide one, so the reading order stays
 * editorial rather than card-like.
 */
export function StorySection({ id, index, eyebrow, title, children, aside, tone = "void" }: StorySectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={`relative scroll-mt-[calc(var(--shell-chrome-height)+1.5rem)] border-t border-horizon/50 px-6 py-16 md:px-10 md:py-20 lg:px-14 lg:py-24 ${tone === "hull" ? "bg-hull/40" : "bg-void"}`}
    >
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-16">
        <div data-reveal>
          <p className="font-mono text-[11px] tracking-[0.2em] text-ion">{index}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-glow-muted">{eyebrow}</p>
        </div>
        <div data-reveal>
          <h2 id={id} className="max-w-2xl text-display-md font-semibold tracking-tight text-glow">
            {title}
          </h2>
          <div className="mt-6 max-w-2xl space-y-5 text-[15px] leading-8 text-glow-muted">{children}</div>
          {aside}
        </div>
      </div>
    </section>
  );
}
