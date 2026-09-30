"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { circleHits, zoneAt } from "./geometry";
import type { Aabb, FloorData } from "./types";

const RADIUS = 0.3;
const SPEED = 3.2;
const EYE_HEIGHT = 1.6;
const MAX_DISTANCE = 6;
/** Below this camera distance the view switches to first person. */
const FIRST_PERSON = 0.7;

type Props = {
  data: FloorData;
  colliders: Aabb[];
  onZoneChange: (zone: string | null) => void;
};

export function Player({ data, colliders, onZoneChange }: Props) {
  const body = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const zone = useRef<string | null | undefined>(undefined);
  const state = useRef({
    x: data.spawn.x,
    z: -data.spawn.y,
    yaw: data.spawn.yaw,
    pitch: 0.15,
    distance: 3,
    heading: data.spawn.yaw,
  });
  const canvas = useThree((s) => s.gl.domElement);

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const lock = () => canvas.requestPointerLock();
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const s = state.current;
      s.yaw -= e.movementX * 0.0025;
      s.pitch = THREE.MathUtils.clamp(s.pitch + e.movementY * 0.0025, -1.2, 1.3);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = state.current;
      s.distance = THREE.MathUtils.clamp(s.distance + Math.sign(e.deltaY) * 0.5, 0, MAX_DISTANCE);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    canvas.addEventListener("click", lock);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      canvas.removeEventListener("click", lock);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [canvas]);

  useFrame(({ camera }, delta) => {
    const s = state.current;
    const k = keys.current;
    const dt = Math.min(delta, 0.05);

    const forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    let dx = -sin * forward + cos * strafe;
    let dz = -cos * forward - sin * strafe;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx = (dx / len) * SPEED * dt;
      dz = (dz / len) * SPEED * dt;
      // Resolve each axis on its own so the player slides along walls.
      if (!circleHits(colliders, s.x + dx, s.z, RADIUS)) s.x += dx;
      if (!circleHits(colliders, s.x, s.z + dz, RADIUS)) s.z += dz;
      s.heading = Math.atan2(-dx, -dz);
    }

    const current = zoneAt(data, s.x, s.z);
    if (current !== zone.current) {
      zone.current = current;
      onZoneChange(current);
    }

    // Camera: orbit behind the player, pulled in when a wall or the ceiling is in the way.
    const cp = Math.cos(s.pitch);
    const back = new THREE.Vector3(sin * cp, Math.sin(s.pitch), cos * cp);
    const head = new THREE.Vector3(s.x, EYE_HEIGHT, s.z);
    let distance = 0;
    if (s.distance >= FIRST_PERSON) {
      for (let d = 0.2; d <= s.distance + 1e-6; d += 0.1) {
        const px = head.x + back.x * d;
        const py = head.y + back.y * d;
        const pz = head.z + back.z * d;
        if (py > data.ceilingHeight - 0.15 || py < 0.2 || circleHits(colliders, px, pz, 0.15)) break;
        distance = d;
      }
    }
    const firstPerson = distance < FIRST_PERSON;
    if (firstPerson) {
      camera.position.copy(head);
      camera.lookAt(head.clone().sub(back));
    } else {
      camera.position.copy(head).addScaledVector(back, distance);
      camera.lookAt(head);
    }

    if (body.current) {
      body.current.visible = !firstPerson;
      body.current.position.set(s.x, 0, s.z);
      body.current.rotation.y = THREE.MathUtils.lerp(
        body.current.rotation.y,
        body.current.rotation.y + shortestAngle(body.current.rotation.y, s.heading),
        Math.min(1, dt * 12),
      );
    }
  });

  return (
    <group ref={body}>
      <mesh position={[-0.11, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.8, 0.2]} />
        <meshLambertMaterial color="#2b2f38" />
      </mesh>
      <mesh position={[0.11, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.8, 0.2]} />
        <meshLambertMaterial color="#2b2f38" />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[0.46, 0.64, 0.24]} />
        <meshLambertMaterial color="#1f7a4a" />
      </mesh>
      <mesh position={[-0.31, 1.12, 0]}>
        <boxGeometry args={[0.14, 0.62, 0.18]} />
        <meshLambertMaterial color="#1f7a4a" />
      </mesh>
      <mesh position={[0.31, 1.12, 0]}>
        <boxGeometry args={[0.14, 0.62, 0.18]} />
        <meshLambertMaterial color="#1f7a4a" />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshLambertMaterial color="#e8c39e" />
      </mesh>
      <mesh position={[0, 1.78, 0.02]}>
        <boxGeometry args={[0.32, 0.08, 0.34]} />
        <meshLambertMaterial color="#2a1d14" />
      </mesh>
    </group>
  );
}

function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
