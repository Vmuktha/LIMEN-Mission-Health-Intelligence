import type { CursorCoordinate, CursorTrajectoryPoint } from "@/types/trial";

export function CursorTrail({ start, points, cursor }: { readonly start: CursorCoordinate; readonly points: readonly CursorTrajectoryPoint[]; readonly cursor: CursorCoordinate | null }) {
  const pathPoints = [start, ...points].map((point) => `${point.x},${point.y}`).join(" ");
  return <>
    {points.length > 0 && <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"><polyline points={pathPoints} fill="none" stroke="rgba(103, 232, 249, 0.45)" strokeWidth="2" /></svg>}
    {cursor && <div aria-label="Displayed feedback cursor" className="pointer-events-none absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.9)]" style={{ left: cursor.x, top: cursor.y }} />}
  </>;
}
