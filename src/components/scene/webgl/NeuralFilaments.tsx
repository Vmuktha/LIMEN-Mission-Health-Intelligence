"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildFilamentCurves, buildNodes, readScenePalette, type FilamentCurve } from "./sceneGeometry";
import { FILAMENT_FRAGMENT_SHADER, FILAMENT_VERTEX_SHADER } from "./shaders";

/**
 * The Signal register in three dimensions: filaments that grow out of the
 * planetary limb, with a restrained travelling highlight on a minority of them.
 *
 * These traces are an environmental metaphor. They are not a representation of
 * neural activity, of a measurement, or of a participant.
 */
export function NeuralFilaments({ count }: { readonly count: number }) {
  const materialRefs = useRef<Array<THREE.ShaderMaterial | null>>([]);

  const curves = useMemo<readonly FilamentCurve[]>(
    () => buildFilamentCurves({ count, seed: 7761, minAngle: 1.62, maxAngle: 2.62, length: 3.4, radius: 0.018 }),
    [count],
  );

  const geometries = useMemo(
    () =>
      curves.map(
        (curve) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(curve.points.map((point) => new THREE.Vector3(point.x, point.y, point.z))),
            48,
            curve.radius,
            5,
            false,
          ),
      ),
    [curves],
  );

  const uniforms = useMemo(
    () =>
      curves.map((curve) => {
        const palette = readScenePalette();
        return {
          uIon: { value: new THREE.Color(palette.ion) },
          uPlasma: { value: new THREE.Color(palette.plasma) },
          uTime: { value: 0 },
          uSpeed: { value: curve.speed },
          uPhase: { value: curve.phase },
          uPulse: { value: curve.pulse ? 1 : 0 },
        };
      }),
    [curves],
  );

  const nodes = useMemo(() => buildNodes(curves, Math.round(count * 0.9), 3312), [curves, count]);

  const nodeColours = useMemo(() => {
    const palette = readScenePalette();
    return { ion: palette.ionSoft, plasma: palette.plasmaBright };
  }, []);

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
    },
    [geometries],
  );

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    materialRefs.current.forEach((material) => {
      if (material) material.uniforms.uTime.value = elapsed;
    });
  });

  return (
    <group>
      {curves.map((curve, index) => (
        <mesh key={`filament-${index}`} geometry={geometries[index]} renderOrder={1}>
          <shaderMaterial
            ref={(material) => {
              materialRefs.current[index] = material;
            }}
            vertexShader={FILAMENT_VERTEX_SHADER}
            fragmentShader={FILAMENT_FRAGMENT_SHADER}
            uniforms={uniforms[index]}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {nodes.map((node, index) => (
        <mesh key={`node-${index}`} position={[node.position.x, node.position.y, node.position.z]} renderOrder={2}>
          <sphereGeometry args={[node.size, 8, 6]} />
          <meshBasicMaterial color={node.tone === "ion" ? nodeColours.ion : nodeColours.plasma} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
