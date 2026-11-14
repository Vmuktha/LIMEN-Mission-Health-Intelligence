"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildParticleField, readScenePalette } from "./sceneGeometry";
import { PARTICLE_FRAGMENT_SHADER, PARTICLE_VERTEX_SHADER } from "./shaders";

/**
 * The deep-space field: a single points draw call with depth-faded, gently
 * twinkling motes. Density is bounded by the device budget, and the field is
 * thinned near the camera so the composition keeps its negative space.
 */
export function ParticleField({ count, pixelRatio }: { readonly count: number; readonly pixelRatio: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const spec = buildParticleField({ count, seed: 20261112, bounds: { x: 17, y: 11, z: 17 } });
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(spec.positions, 3));
    next.setAttribute("aScale", new THREE.BufferAttribute(spec.scales, 1));
    next.setAttribute("aPhase", new THREE.BufferAttribute(spec.phases, 1));
    return next;
  }, [count]);

  const uniforms = useMemo(() => {
    const palette = readScenePalette();
    return {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uIon: { value: new THREE.Color(palette.ionSoft) },
    };
  }, [pixelRatio]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={PARTICLE_VERTEX_SHADER}
        fragmentShader={PARTICLE_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
