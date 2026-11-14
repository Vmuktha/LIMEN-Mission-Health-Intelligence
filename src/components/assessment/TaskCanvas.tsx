"use client";

import { useEffect, useRef, useState } from "react";
import { CursorTrail } from "./CursorTrail";
import { TrialTarget } from "./TrialTarget";
import type { PositioningTrial, TrialEngineState } from "@/lib/assessment/trial-engine";
import type { TaskAreaBounds } from "@/hooks/useAssessment";
import type { CursorCoordinate } from "@/types/trial";

const TARGET_RADIUS_CSS_PIXELS = 22;

export function TaskCanvas({ engine, onBoundsChange, onPointerMove, onPointerCancel }: { readonly engine: TrialEngineState | null; readonly onBoundsChange: (bounds: TaskAreaBounds) => void; readonly onPointerMove: (clientX: number, clientY: number, pointerType: string) => void; readonly onPointerCancel: () => void }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<TaskAreaBounds | null>(null);
  const [positioningPointer, setPositioningPointer] = useState<{ readonly trial: PositioningTrial; readonly point: CursorCoordinate | null } | null>(null);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const report = () => {
      const box = element.getBoundingClientRect();
      const bounds = { left: box.left, top: box.top, width: box.width, height: box.height };
      boundsRef.current = bounds;
      onBoundsChange(bounds);
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    window.addEventListener("scroll", report, true);
    return () => { observer.disconnect(); window.removeEventListener("scroll", report, true); };
  }, [onBoundsChange]);

  const active = engine?.activeTrial ?? null;
  const positioning = engine?.positioningTrial ?? null;
  const visualPoints = active?.displayedCursorTrajectory ?? [];
  const displayedCursor = visualPoints.at(-1) ?? active?.startPosition ?? null;
  const paused = engine?.status === "paused";
  // Hide the native pointer only while an interaction trial is genuinely active.
  const interactionActive = engine?.status === "running" && (active !== null || positioning !== null);

  // A new positioning stage has a new immutable trial object, so a stale pointer
  // from the previous stage is ignored. Before the first move, the positioning
  // cursor is seeded at the designated marker so a stationary pointer is never
  // left with a hidden native cursor and no visible indicator. This is a visual
  // aid only and never enters a measurement.
  const visiblePositioningPointer = positioning
    ? (positioningPointer?.trial === positioning ? positioningPointer.point : positioning.designatedStartPosition)
    : null;

  const handlePointerMove = (clientX: number, clientY: number, pointerType: string) => {
    if (positioning && boundsRef.current) {
      setPositioningPointer({ trial: positioning, point: { x: clientX - boundsRef.current.left, y: clientY - boundsRef.current.top } });
    }
    onPointerMove(clientX, clientY, pointerType);
  };
  const handlePointerCancel = () => { setPositioningPointer(positioning ? { trial: positioning, point: null } : null); onPointerCancel(); };

  return <div ref={elementRef} tabIndex={0} aria-label="Visuomotor target task area" onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={(event) => handlePointerMove(event.clientX, event.clientY, event.pointerType)} onPointerCancel={handlePointerCancel} onPointerLeave={handlePointerCancel} className={`relative min-h-[420px] touch-none overflow-hidden rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_center,_#153150_0,_#09111f_42%,_#050914_100%)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${interactionActive ? "cursor-none" : ""}`}>
    <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(103,232,249,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.12)_1px,transparent_1px)] [background-size:32px_32px]" />
    {active && <>
      <div aria-label="Starting position" className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-300 bg-slate-700" style={{ left: active.startPosition.x, top: active.startPosition.y }} />
      <TrialTarget target={active.target} radius={TARGET_RADIUS_CSS_PIXELS} />
      <CursorTrail start={active.startPosition} points={visualPoints} cursor={displayedCursor} />
    </>}
    {positioning && <>
      <div aria-label="Positioning start marker" className="pointer-events-none absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-200 bg-cyan-400/20 shadow-[0_0_24px_rgba(34,211,238,0.35)]" style={{ left: positioning.designatedStartPosition.x, top: positioning.designatedStartPosition.y }} />
      {visiblePositioningPointer && <div aria-hidden className="pointer-events-none absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.9)]" style={{ left: visiblePositioningPointer.x, top: visiblePositioningPointer.y }} />}
      <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-sm text-cyan-100">Position your pointer over the centre marker and hold briefly.</p>
    </>}
    {!active && !positioning && !paused && engine?.status !== "completed" && <p className="absolute inset-0 grid place-items-center text-sm text-slate-400">Prepare for the next target…</p>}
    {paused && <div className="absolute inset-0 grid place-items-center bg-slate-950/80 text-center"><p className="text-lg font-semibold text-white">Assessment paused</p><p className="mt-1 max-w-md text-sm text-slate-300">Resume when you are ready. An interrupted target is cancelled rather than timed, and a fresh positioning stage will begin.</p></div>}
    {engine?.status === "completed" && <div className="absolute inset-0 grid place-items-center bg-slate-950/80 text-center"><p className="text-lg font-semibold text-white">Assessment complete</p><p className="mt-1 text-sm text-slate-300">The completed record is being saved locally in this browser.</p></div>}
  </div>;
}
