import type { TargetPosition } from "@/types/trial";

export function TrialTarget({ target, radius }: { readonly target: TargetPosition; readonly radius: number }) {
  return <div aria-label={`Target: ${target.direction}`} className="pointer-events-none absolute rounded-full border-2 border-cyan-200 bg-cyan-400/20 shadow-[0_0_24px_rgba(34,211,238,0.35)]" style={{ width: radius * 2, height: radius * 2, left: target.x - radius, top: target.y - radius }} />;
}
