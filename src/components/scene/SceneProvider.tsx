"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * The scene layer establishes the LIMEN environment behind the application.
 *
 * Phase 8A-1 renders it with CSS only. The contract is deliberately shaped for
 * the WebGL work that follows: `layer` states which renderer is active, and
 * `variant` selects the environment composition. A future `SceneCanvas` mounts
 * inside the same provider and takes over the background, while the CSS
 * composition remains the fallback.
 */
export type SceneVariant = "orbital" | "signal" | "plain";
export type SceneLayer = "css" | "webgl";

export interface SceneContextValue {
  readonly variant: SceneVariant;
  readonly layer: SceneLayer;
  readonly reducedMotion: boolean;
  /** True once the motion preference has been read, so the scene can be skipped entirely. */
  readonly motionResolved: boolean;
  /** True once the WebGL scene is actually mounted, so the CSS composition can step aside. */
  readonly webglActive: boolean;
  readonly setWebglActive: (active: boolean) => void;
}

const SceneContext = createContext<SceneContextValue>({
  variant: "orbital",
  layer: "css",
  reducedMotion: false,
  motionResolved: false,
  webglActive: false,
  setWebglActive: () => undefined,
});

export function SceneProvider({
  children,
  variant = "orbital",
  layer = "css",
}: {
  readonly children: ReactNode;
  readonly variant?: SceneVariant;
  readonly layer?: SceneLayer;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionResolved, setMotionResolved] = useState(false);
  const [webglActive, setWebglActive] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    // Resolved asynchronously so the preference is known before the scene
    // decides whether it should be fetched at all.
    queueMicrotask(() => setMotionResolved(true));
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const value = useMemo<SceneContextValue>(
    () => ({ variant, layer, reducedMotion, motionResolved, webglActive, setWebglActive }),
    [variant, layer, reducedMotion, motionResolved, webglActive],
  );

  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}

export function useScene(): SceneContextValue {
  return useContext(SceneContext);
}
