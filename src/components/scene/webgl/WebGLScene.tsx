"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CameraRig, type ScenePointer } from "./CameraRig";
import { NeuralFilaments } from "./NeuralFilaments";
import { ParticleField } from "./ParticleField";
import { PlanetaryHorizon } from "./PlanetaryHorizon";
import { resolveSceneQuality } from "./sceneGeometry";

export interface WebGLSceneProps {
  readonly onActive?: () => void;
  readonly onInactive?: () => void;
}

/**
 * The LIMEN signature scene: an orbital environment with a deep-space field
 * and abstract filaments growing from the planetary limb.
 *
 * It is Orbit and Signal register art only. Nothing in the scene is a
 * measurement, a participant, or a claim about neural activity.
 *
 * The scene is loaded on demand, renders behind the landing content, and never
 * intercepts pointer input.
 */
export default function WebGLScene({ onActive, onInactive }: WebGLSceneProps) {
  const [contextLost, setContextLost] = useState(false);
  const pointer = useRef<ScenePointer>({ x: 0, y: 0 });
  const quality = useMemo(() => resolveSceneQuality(), []);

  useEffect(() => {
    if (contextLost) return;
    onActive?.();
    return () => onInactive?.();
  }, [contextLost, onActive, onInactive]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    const resetPointer = () => {
      pointer.current = { x: 0, y: 0 };
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", resetPointer);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetPointer);
    };
  }, []);

  if (contextLost) {
    // The context was lost: the canvas is released and the static CSS
    // composition takes over.
    return null;
  }

  return (
    <Canvas
      flat
      dpr={[1, quality.maxPixelRatio]}
      gl={{
        antialias: false,
        alpha: true,
        depth: true,
        stencil: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: [0, 0, 6], fov: 40, near: 0.1, far: 140 }}
      onCreated={(state) => {
        state.gl.setClearColor(new THREE.Color(0x000000), 0);
        const canvas = state.gl.domElement;
        const handleContextLost = (event: Event) => {
          // Losing the context is recoverable: the canvas is released and the
          // static CSS composition remains on screen.
          event.preventDefault();
          setContextLost(true);
        };
        canvas.addEventListener("webglcontextlost", handleContextLost);
      }}
    >
      <SceneContents quality={quality} pointer={pointer} />
    </Canvas>
  );
}

function SceneContents({
  quality,
  pointer,
}: {
  readonly quality: { readonly particles: number; readonly maxPixelRatio: number; readonly filaments: number };
  readonly pointer: React.RefObject<ScenePointer>;
}) {
  return (
    <>
      <PlanetaryHorizon />
      <ParticleField count={quality.particles} pixelRatio={quality.maxPixelRatio} />
      <NeuralFilaments count={quality.filaments} />
      <CameraRig pointer={pointer} />
    </>
  );
}
