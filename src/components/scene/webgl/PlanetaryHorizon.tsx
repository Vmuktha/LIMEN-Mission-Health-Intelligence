"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { PLANET, readScenePalette } from "./sceneGeometry";
import { PLANET_FRAGMENT_SHADER, PLANET_VERTEX_SHADER } from "./shaders";

/**
 * The planetary limb: a large sphere lit by a single key direction, with a
 * fresnel atmosphere along its silhouette. It is Orbit register art — a world
 * seen from orbit — and carries no data.
 */
export function PlanetaryHorizon() {
  const uniforms = useMemo(() => {
    const palette = readScenePalette();
    return {
      uLightDirection: { value: new THREE.Vector3(-0.42, 0.5, 0.76).normalize() },
      uVoid: { value: new THREE.Color(palette.void) },
      uHull: { value: new THREE.Color(palette.hullRaised) },
      uIon: { value: new THREE.Color(palette.ion) },
      uPlasma: { value: new THREE.Color(palette.plasma) },
    };
  }, []);

  return (
    <mesh position={[PLANET.centre.x, PLANET.centre.y, PLANET.centre.z]} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[PLANET.radius, 72, 36]} />
      <shaderMaterial vertexShader={PLANET_VERTEX_SHADER} fragmentShader={PLANET_FRAGMENT_SHADER} uniforms={uniforms} />
    </mesh>
  );
}
