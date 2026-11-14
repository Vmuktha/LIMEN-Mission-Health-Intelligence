"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { PLANET, readScenePalette } from "./sceneGeometry";
import {
  ATMOSPHERE_FRAGMENT_SHADER,
  PLANET_FRAGMENT_SHADER,
  PLANET_VERTEX_SHADER,
} from "./shaders";

const SURFACE_TEXTURE = "/earth/earth-texture.png";

/** A slowly rotating, mapped Earth in the Orbit register. It carries no data. */
export function PlanetaryHorizon({ onReady }: { readonly onReady?: () => void }) {
  const surfaceSource = useLoader(THREE.TextureLoader, SURFACE_TEXTURE);
  const globe = useRef<THREE.Group>(null);
  const palette = useMemo(() => readScenePalette(), []);
  const lightDirection = useMemo(() => new THREE.Vector3(-0.52, 0.36, 0.78).normalize(), []);
  const surfaceMap = useMemo(() => {
    const texture = surfaceSource.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [surfaceSource]);
  useEffect(() => {
    onReady?.();
  }, [onReady, surfaceMap]);

  const uniforms = useMemo(() => ({
    uSurfaceMap: { value: surfaceMap },
    uLightDirection: { value: lightDirection },
    uNightSide: { value: new THREE.Color(palette.earthNight) },
    uAtmosphere: { value: new THREE.Color(palette.ion) },
  }), [lightDirection, palette.earthNight, palette.ion, surfaceMap]);
  const atmosphereUniforms = useMemo(() => ({
    uAtmosphere: { value: new THREE.Color(palette.ionSoft) },
  }), [palette.ionSoft]);

  useFrame((_, delta) => {
    if (globe.current) globe.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={globe} position={[PLANET.centre.x, PLANET.centre.y, PLANET.centre.z]}>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[PLANET.radius, 96, 64]} />
        <shaderMaterial vertexShader={PLANET_VERTEX_SHADER} fragmentShader={PLANET_FRAGMENT_SHADER} uniforms={uniforms} />
      </mesh>
      <mesh scale={1.035} renderOrder={0}>
        <sphereGeometry args={[PLANET.radius, 96, 64]} />
        <shaderMaterial
          vertexShader={PLANET_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          uniforms={atmosphereUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
