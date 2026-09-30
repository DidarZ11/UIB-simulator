"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AvatarColors } from "./avatar";

const URL = "/models/character.glb";
const FADE = 0.18;
/** Clips that play once and then report `done`; everything else loops. */
const ONE_SHOT = new Set(["Jump", "Wave", "Yes", "No", "RaiseHand", "Cheer", "Shrug"]);

/** Written by the owner each frame; the character switches clips when `name` changes. */
export type AnimState = { name: string; speed: number };

type Props = {
  anim: React.RefObject<AnimState>;
  colors: AvatarColors;
  /** Called when a one-shot clip (jump, emote) reaches its end. */
  onDone: (clip: string) => void;
};

export function Character({ anim, colors, onDone }: Props) {
  const { scene, animations } = useGLTF(URL);
  // Own copy of the skeleton and materials, so NPCs can reuse the same file with other colours.
  const model = useMemo(() => {
    const copy = clone(scene);
    copy.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
        o.frustumCulled = false;
      }
    });
    return copy;
  }, [scene]);
  const root = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, root);
  const playing = useRef<string | null>(null);

  // Remember the model's own colours once, so `null` can restore them.
  const original = useMemo(() => {
    const map = new Map<THREE.MeshStandardMaterial, THREE.Color>();
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of [o.material].flat() as THREE.MeshStandardMaterial[]) map.set(m, m.color.clone());
    });
    return map;
  }, [model]);

  useEffect(() => {
    for (const [m, color] of original) {
      const custom = colors[m.name as keyof AvatarColors];
      m.color.set(custom ?? color);
    }
  }, [colors, original]);

  useEffect(() => {
    const onFinished = (e: { action: THREE.AnimationAction }) => onDone(e.action.getClip().name);
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, onDone]);

  useFrame(() => {
    const state = anim.current;
    if (!state) return;
    const next = actions[state.name];
    if (!next) return;
    next.setEffectiveTimeScale(state.speed);
    if (playing.current === state.name) return;
    const prev = playing.current ? actions[playing.current] : null;
    start(next, ONE_SHOT.has(state.name));
    prev?.fadeOut(FADE);
    playing.current = state.name;
  });

  return (
    // The model faces +Z; the player's heading treats -Z as forward.
    <group ref={root} rotation={[0, Math.PI, 0]}>
      <primitive object={model} />
    </group>
  );
}

function start(action: THREE.AnimationAction, once: boolean) {
  action.reset();
  action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  action.clampWhenFinished = once;
  action.fadeIn(FADE).play();
}

useGLTF.preload(URL);
