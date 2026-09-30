"use client";

import { useGLTF } from "@react-three/drei";

const URL = "/models/hall.glb";

/** Hall built in Blender. Shares the plan coordinates with floor1.json (X = x, Z = -y), so no offset is needed. */
export function HallModel() {
  const { scene } = useGLTF(URL);
  return (
    <group>
      <primitive object={scene} />
      {/* Lawn outside the windows. */}
      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color="#7fae6a" />
      </mesh>
    </group>
  );
}

useGLTF.preload(URL);
