"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";

export interface ScenePointer {
  readonly x: number;
  readonly y: number;
}

/**
 * A damped camera rig. Pointer movement nudges the camera by a small amount,
 * which reads as parallax between the observer and the environment. The rig
 * also keeps a very slow idle drift so the scene never feels frozen.
 *
 * The pointer value is held in a ref and read inside the frame loop, so the
 * camera never triggers a React render. The camera itself is mutated
 * imperatively, which is the intended usage for a Three.js scene graph.
 */
export function CameraRig({ pointer }: { readonly pointer: RefObject<ScenePointer> }) {
  const lookAt = useRef(new THREE.Vector3(0.32, -0.18, 0));

  useEffect(() => {
    // Establish the resting orientation before the first frame is drawn.
    lookAt.current.set(0.32, -0.18, 0);
  }, []);

  useFrame((state, delta) => {
    const camera = state.camera;
    const current = pointer.current;
    const damping = 1 - Math.pow(0.004, Math.min(delta, 0.1));
    camera.position.x += (current.x * 0.62 - camera.position.x) * damping;
    camera.position.y += (-current.y * 0.34 - camera.position.y) * damping;
    camera.position.z = 6 + Math.sin(state.clock.elapsedTime * 0.06) * 0.14;
    camera.lookAt(lookAt.current);
  });

  return null;
}
