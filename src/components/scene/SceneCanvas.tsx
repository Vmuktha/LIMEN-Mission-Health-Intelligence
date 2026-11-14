"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useScene } from "./SceneProvider";

/**
 * The WebGL layer.
 *
 * The implementation lives in its own chunk and is only fetched when the scene
 * is requested, so no other route ever downloads Three.js. The CSS scene stays
 * mounted underneath, which means the composition is identical before the
 * chunk arrives, if it never arrives, or if the device cannot run it.
 */
const WebGLScene = dynamic(() => import("./webgl/WebGLScene"), {
  ssr: false,
  loading: () => null,
});

export function SceneCanvas() {
  const { layer, reducedMotion, setWebglActive } = useScene();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (layer !== "webgl" || reducedMotion) return;
    let active = true;
    // A timer is used rather than a frame callback: detection must also run
    // when the document is not being painted.
    const timer = window.setTimeout(() => {
      if (active) setSupported(detectWebGLSupport());
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [layer, reducedMotion]);

  useEffect(() => {
    if (layer === "webgl" && reducedMotion) setWebglActive(false);
  }, [layer, reducedMotion, setWebglActive]);

  const active = layer === "webgl" && !reducedMotion && supported;
  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <WebGLScene onActive={() => setWebglActive(true)} onInactive={() => setWebglActive(false)} />
    </div>
  );
}

/**
 * Feature detection runs before the chunk is requested, so an unsupported
 * browser never downloads the scene at all.
 */
function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
