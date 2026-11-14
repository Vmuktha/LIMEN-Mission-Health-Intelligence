"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { PLANET, readScenePalette } from "./sceneGeometry";
import {
  ATMOSPHERE_FRAGMENT_SHADER,
  CLOUD_FRAGMENT_SHADER,
  CLOUD_VERTEX_SHADER,
  PLANET_FRAGMENT_SHADER,
  PLANET_VERTEX_SHADER,
} from "./shaders";

const SURFACE_TEXTURE = "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_ocean_ice_2048.png";
const CLOUD_TEXTURE = "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg";

/** A slowly rotating, mapped Earth in the Orbit register. It carries no data. */
export function PlanetaryHorizon({ onReady }: { readonly onReady?: () => void }) {
  const [surfaceSource, cloudSource] = useLoader(THREE.TextureLoader, [SURFACE_TEXTURE, CLOUD_TEXTURE]);
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
  const cloudMap = useMemo(() => {
    const texture = cloudSource.clone();
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [cloudSource]);

  useEffect(() => {
    onReady?.();
  }, [cloudMap, onReady, surfaceMap]);

  const uniforms = useMemo(() => ({
    uSurfaceMap: { value: surfaceMap },
    uLightDirection: { value: lightDirection },
    uNightSide: { value: new THREE.Color(palette.earthNight) },
    uAtmosphere: { value: new THREE.Color(palette.ion) },
  }), [lightDirection, palette.earthNight, palette.ion, surfaceMap]);
  const cloudUniforms = useMemo(() => ({
    uCloudMap: { value: cloudMap },
    uLightDirection: { value: lightDirection },
    uCloudColor: { value: new THREE.Color(palette.cloud) },
  }), [cloudMap, lightDirection, palette.cloud]);
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
      <mesh scale={1.003} renderOrder={-1}>
        <sphereGeometry args={[PLANET.radius, 96, 64]} />
        <shaderMaterial
          vertexShader={CLOUD_VERTEX_SHADER}
          fragmentShader={CLOUD_FRAGMENT_SHADER}
          uniforms={cloudUniforms}
          transparent
          depthWrite={false}
        />
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
