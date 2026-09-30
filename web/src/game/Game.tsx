"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import floor1 from "@/data/floors/floor1.json";
import { ru } from "@/i18n/ru";
import { AvatarPanel } from "./AvatarPanel";
import { DEFAULT_AVATAR, loadAvatar, saveAvatar, type AvatarColors } from "./avatar";
import { EmoteWheel } from "./EmoteWheel";
import { FloorScene } from "./FloorScene";
import { HallModel } from "./HallModel";
import { Player } from "./Player";
import { buildFloorGeometry } from "./geometry";
import type { FloorData } from "./types";

const base = floor1 as unknown as FloorData;

/** `?at=x,y,yawDegrees` overrides the spawn point — handy for checking a spot against a photo. */
function withSpawnFromUrl(floor: FloorData): FloorData {
  if (typeof window === "undefined") return floor;
  const at = new URLSearchParams(window.location.search).get("at");
  if (!at) return floor;
  const [x, y, yaw = 0] = at.split(",").map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return floor;
  return { ...floor, spawn: { x, y, yaw: (yaw * Math.PI) / 180 } };
}

const data = withSpawnFromUrl(base);

export function Game() {
  const geometry = useMemo(() => buildFloorGeometry(data), []);
  const [zone, setZone] = useState<string | null>(null);
  // `?model=hall` swaps the code-built floor for the Blender hall (public/models/hall.glb).
  // Read on the client only; the server render shows neither (the canvas is empty there and the panel starts closed).
  const [blenderHall] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("model") === "hall",
  );
  const [colors, setColors] = useState<AvatarColors>(() =>
    typeof window !== "undefined" ? loadAvatar() : DEFAULT_AVATAR,
  );
  const changeColors = (c: AvatarColors) => {
    setColors(c);
    saveAvatar(c);
  };

  return (
    <div className="fixed inset-0 bg-[#cfe3f1]">
      <Canvas camera={{ fov: 70, near: 0.1, far: 120 }} dpr={[1, 2]}>
        <color attach="background" args={["#cfe3f1"]} />
        <ambientLight intensity={1.9} />
        <hemisphereLight args={["#ffffff", "#8a8f93", 0.9]} />
        <directionalLight position={[6, 10, 4]} intensity={0.7} />
        {blenderHall ? (
          <Suspense fallback={null}>
            <HallModel />
          </Suspense>
        ) : (
          <FloorScene data={data} geometry={geometry} />
        )}
        <Player data={data} colliders={geometry.colliders} colors={colors} onZoneChange={setZone} />
      </Canvas>

      <EmoteWheel />
      <AvatarPanel colors={colors} onChange={changeColors} />
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/60 px-4 py-2 text-white">
        <div className="text-xs uppercase tracking-wide text-white/70">{data.name}</div>
        <div className="text-lg font-semibold">{zone ?? ru.unknownZone}</div>
        <div className="text-xs text-white/60">{blenderHall ? ru.hallSource.blender : ru.hallSource.code}</div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/60 px-4 py-2 text-sm text-white/90">
        <div>{ru.controls.move}</div>
        <div>{ru.controls.look}</div>
        <div>{ru.controls.zoom}</div>
        <div>{ru.controls.emotes}</div>
      </div>
    </div>
  );
}
