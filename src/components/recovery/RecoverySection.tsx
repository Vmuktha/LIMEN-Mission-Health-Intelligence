import type { ReactNode } from "react";
import { Card, SectionHeader } from "@/components/ui";

export interface RecoverySectionProps {
  readonly id: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A labelled region of the recovery dashboard. It composes the shared surface
 * and heading primitives so the dashboard inherits the LIMEN token system
 * without carrying its own copy of it.
 */
export function RecoverySection({ id, eyebrow, title, description, actions, children }: RecoverySectionProps) {
  return (
    <Card as="section" surface="paper" padding="section" elevation="card" radius="panel" aria-labelledby={id}>
      <SectionHeader id={id} eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="mt-5">{children}</div>
    </Card>
  );
}
