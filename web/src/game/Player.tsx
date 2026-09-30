"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { input, type AvatarColors } from "./avatar";
import { Character, type AnimState } from "./Character";
import { circleHits, zoneAt } from "./geometry";
import type { Aabb, FloorData } from "./types";

const RADIUS = 0.3;
const WALK_SPEED = 2.5;
const RUN_SPEED = 5.5;
const GRAVITY = 18;
/** Take-off speed for a jump of about 0.6 m. */
const JUMP_SPEED = 4.6;
/** Length of the Jump clip (14 frames at 24 fps), stretched to match the time in the air. */
const JUMP_CLIP = 14 / 24;
const EYE_HEIGHT = 1.6;
const MAX_DISTANCE = 6;
/** Below this camera distance the view switches to first person. */
const FIRST_PERSON = 0.7;
/** Closer than this, the camera would sit inside the body, so the body is hidden. */
const HIDE_BODY = 0.45;
/** Chrome on Windows sometimes reports a bogus jump in pointer-lock movement; bigger steps are dropped. */
const MAX_MOUSE_STEP = 250;

type Props = {
  data: FloorData;
  colliders: Aabb[];
  colors: AvatarColors;
  onZoneChange: (zone: string | null) => void;
};

export function Player({ data, colliders, colors, onZoneChange }: Props) {
  const body = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const zone = useRef<string | null | undefined>(undefined);
  const anim = useRef<AnimState>({ name: "Idle", speed: 1 });
  const state = useRef({
    x: data.spawn.x,
    z: -data.spawn.y,
    y: 0,
    vy: 0,
    yaw: data.spawn.yaw,
    pitch: 0.15,
    distance: 3,
    /** Camera distance actually used, eased back out after a wall pushes it in. */
    camDistance: 3,
    heading: data.spawn.yaw,
    emote: null as string | null,
  });
  const canvas = useThree((s) => s.gl.domElement);
  // The emote clip ended: go back to idle.
  const onDone = useCallback((clip: string) => {
    if (state.current.emote === clip) state.current.emote = null;
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Space") e.preventDefault();
      if (e.code === "Digit1" && !e.repeat) input.emote = "Wave";
    };
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    // Raw mouse input (no OS acceleration) avoids most bogus jumps; fall back where it is not supported.
    const lock = () => {
      canvas.requestPointerLock({ unadjustedMovement: true })?.catch(() => canvas.requestPointerLock());
    };
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas || input.wheelOpen) return;
      if (Math.abs(e.movementX) > MAX_MOUSE_STEP || Math.abs(e.movementY) > MAX_MOUSE_STEP) return;
      const s = state.current;
      s.yaw -= e.movementX * 0.0025;
      s.pitch = THREE.MathUtils.clamp(s.pitch + e.movementY * 0.0025, -1.2, 1.3);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = state.current;
      s.distance = THREE.MathUtils.clamp(s.distance + Math.sign(e.deltaY) * 0.5, 0, MAX_DISTANCE);
    };
    // Releasing keys while the tab is hidden never fires keyup.
    const blur = () => (keys.current = {});
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("mousemove", move);
    window.addEventListener("blur", blur);
    canvas.addEventListener("click", lock);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("click", lock);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [canvas]);

  useFrame(({ camera }, delta) => {
    const s = state.current;
    const k = keys.current;
    const dt = Math.min(delta, 0.05);
    const grounded = s.y <= 0;

    const forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const running = !!(k.ShiftLeft || k.ShiftRight);
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    let dx = -sin * forward + cos * strafe;
    let dz = -cos * forward - sin * strafe;
    const len = Math.hypot(dx, dz);
    const moving = len > 0;
    if (moving) {
      const speed = running ? RUN_SPEED : WALK_SPEED;
      dx = (dx / len) * speed * dt;
      dz = (dz / len) * speed * dt;
      // Resolve each axis on its own so the player slides along walls.
      if (!circleHits(colliders, s.x + dx, s.z, RADIUS)) s.x += dx;
      if (!circleHits(colliders, s.x, s.z + dz, RADIUS)) s.z += dz;
      s.heading = Math.atan2(-dx, -dz);
    }

    if (k.Space && grounded) {
      s.vy = JUMP_SPEED;
      s.emote = null;
    }
    s.vy -= GRAVITY * dt;
    s.y = Math.max(0, s.y + s.vy * dt);
    if (s.y === 0 && s.vy < 0) s.vy = 0;
    const airborne = s.y > 0;

    // An emote plays while standing still; moving or jumping cancels it.
    if (input.emote) {
      s.emote = input.emote;
      input.emote = null;
    }
    if (moving || airborne) s.emote = null;
    const a = anim.current;

    if (airborne) set(a, "Jump", JUMP_CLIP / ((2 * JUMP_SPEED) / GRAVITY));
    else if (s.emote) set(a, s.emote, 1);
    else if (moving) set(a, running ? "Run" : "Walk", 1);
    else set(a, "Idle", 1);

    const current = zoneAt(data, s.x, s.z);
    if (current !== zone.current) {
      zone.current = current;
      onZoneChange(current);
    }

    // Camera: orbit behind the player, pulled in when a wall or the ceiling is in the way.
    const cp = Math.cos(s.pitch);
    const back = new THREE.Vector3(sin * cp, Math.sin(s.pitch), cos * cp);
    const head = new THREE.Vector3(s.x, s.y + EYE_HEIGHT, s.z);
    // First person only when the player zooms in; a wall behind just pulls the camera closer.
    const firstPerson = s.distance < FIRST_PERSON;
    let free = 0.2;
    if (!firstPerson) {
      for (let d = 0.2; d <= s.distance + 1e-6; d += 0.1) {
        const px = head.x + back.x * d;
        const py = head.y + back.y * d;
        const pz = head.z + back.z * d;
        if (py > data.ceilingHeight - 0.15 || py < 0.2 || circleHits(colliders, px, pz, 0.15)) break;
        free = d;
      }
    }
    // Snap in at once so the camera never goes through a wall, ease back out.
    s.camDistance =
      free < s.camDistance ? free : THREE.MathUtils.lerp(s.camDistance, free, Math.min(1, dt * 5));
    if (firstPerson) {
      camera.position.copy(head);
      camera.lookAt(head.clone().sub(back));
    } else {
      camera.position.copy(head).addScaledVector(back, s.camDistance);
      camera.lookAt(head);
    }

    if (body.current) {
      body.current.visible = !firstPerson && s.camDistance >= HIDE_BODY;
      body.current.position.set(s.x, s.y, s.z);
      body.current.rotation.y = THREE.MathUtils.lerp(
        body.current.rotation.y,
        body.current.rotation.y + shortestAngle(body.current.rotation.y, s.heading),
        Math.min(1, dt * 12),
      );
    }
  });

  return (
    <group ref={body}>
      <Suspense fallback={null}>
        <Character anim={anim} colors={colors} onDone={onDone} />
      </Suspense>
    </group>
  );
}

function set(a: AnimState, name: string, speed: number) {
  a.name = name;
  a.speed = speed;
}

function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
