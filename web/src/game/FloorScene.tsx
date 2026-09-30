"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FACING, placedPosition, rectCenter, type FloorGeometry } from "./geometry";
import { makeGridTexture, makeLabelTexture, makeMuralTexture } from "./textures";
import type { Box, FloorData, Mural, Prop, Rect, Sign } from "./types";

const TILE = 0.6;
const COLORS = {
  wall: "#f3f4f2",
  wainscot: "#7d878c",
  panel: "#6f797e",
  frame: "#fbfbfb",
  brown: "#5a2e22",
  door: "#dcd9d2",
  accent: "#ecead8",
  steel: "#c4c9cc",
};

function Boxes({ boxes, children }: { boxes: Box[]; children: React.ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    boxes.forEach((b, i) => {
      m.compose(new THREE.Vector3(...b.pos), q, new THREE.Vector3(...b.size));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [boxes]);
  if (boxes.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} frustumCulled={false}>
      <boxGeometry />
      {children}
    </instancedMesh>
  );
}

/** Horizontal plane whose UVs follow plan coordinates, so tiles line up across rects. */
function TiledPlane({ rect, y, up, map }: { rect: Rect; y: number; up: boolean; map: THREE.Texture }) {
  const geometry = useMemo(() => {
    const [rx, ry, w, h] = rect;
    const geo = new THREE.PlaneGeometry(w, h);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (rx + uv.getX(i) * w) / TILE, (ry + uv.getY(i) * h) / TILE);
    }
    return geo;
  }, [rect]);
  const [cx, cz] = rectCenter(rect);
  return (
    <mesh geometry={geometry} position={[cx, y, cz]} rotation={[up ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
      <meshLambertMaterial map={map} />
    </mesh>
  );
}

function lightPanels(rects: Rect[], height: number): Box[] {
  const panels: Box[] = [];
  for (const [rx, ry, w, h] of rects) {
    for (let x = rx + Math.min(1.5, w / 2); x < rx + w; x += 3) {
      for (let y = ry + Math.min(1.5, h / 2); y < ry + h; y += 3) {
        panels.push({ pos: [x, height - 0.01, -y], size: [TILE, 0.02, TILE] });
      }
    }
  }
  return panels;
}

function MuralPlane({ mural }: { mural: Mural }) {
  const map = useMemo(() => makeMuralTexture(mural.kind), [mural.kind]);
  return (
    <mesh position={placedPosition(mural)} rotation={[0, FACING[mural.facing].rot, 0]}>
      <planeGeometry args={[mural.width, mural.height]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

function SignPlane({ sign }: { sign: Sign }) {
  const map = useMemo(
    () => makeLabelTexture(sign.text, sign.bg, sign.fg, sign.width / sign.height),
    [sign.text, sign.bg, sign.fg, sign.width, sign.height],
  );
  return (
    <mesh position={placedPosition(sign, 0.13)} rotation={[0, FACING[sign.facing].rot, 0]}>
      <planeGeometry args={[sign.width, sign.height]} />
      <meshBasicMaterial map={map} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PropMesh({ prop }: { prop: Prop }) {
  const rot = FACING[prop.facing].rot;
  if (prop.type === "banner") {
    return (
      <group position={[prop.at[0], 0, -prop.at[1]]} rotation={[0, rot, 0]}>
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.85, 2, 0.03]} />
          <meshLambertMaterial color="#f7f7f5" />
        </mesh>
        <mesh position={[0, 1.75, 0.02]}>
          <boxGeometry args={[0.85, 0.6, 0.01]} />
          <meshLambertMaterial color={prop.color} />
        </mesh>
        <mesh position={[0, 0.35, 0.02]}>
          <boxGeometry args={[0.7, 0.3, 0.01]} />
          <meshLambertMaterial color={prop.color} />
        </mesh>
      </group>
    );
  }
  if (prop.type === "photoFrame") {
    const bar = (x: number, y: number, w: number, h: number) => (
      <mesh position={[x, y, 0]}>
        <boxGeometry args={[w, h, 0.12]} />
        <meshLambertMaterial color="#1f7a4a" />
      </mesh>
    );
    return (
      <group position={[prop.at[0], 0, -prop.at[1]]} rotation={[0, rot, 0]}>
        {bar(-0.6, 1, 0.14, 2)}
        {bar(0.6, 1, 0.14, 2)}
        {bar(0, 1.9, 1.34, 0.2)}
        {bar(0, 0.12, 1.34, 0.24)}
      </group>
    );
  }
  const pos = placedPosition(prop, 0.13);
  if (prop.type === "tv") {
    return (
      <mesh position={pos} rotation={[0, rot, 0]}>
        <boxGeometry args={[prop.width, prop.height, 0.06]} />
        <meshLambertMaterial color="#15171a" />
      </mesh>
    );
  }
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh>
        <boxGeometry args={[prop.width + 0.12, prop.height + 0.12, 0.05]} />
        <meshLambertMaterial color="#3a2f26" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[prop.width, prop.height]} />
        <meshLambertMaterial color="#cfdde2" />
      </mesh>
    </group>
  );
}

function Stairs({ stairs }: { stairs: NonNullable<FloorData["stairs"]> }) {
  const steps: Box[] = [];
  for (let i = 0; i < stairs.steps; i++) {
    const h = (i + 1) * stairs.stepHeight;
    steps.push({
      pos: [stairs.x + stairs.width / 2, h / 2, -(stairs.y + (i + 0.5) * stairs.stepDepth)],
      size: [stairs.width, h, stairs.stepDepth],
    });
  }
  // Steel railing closing the half of the landing that leads down.
  const x0 = stairs.barrier.from[0];
  const railLen = stairs.x - x0;
  const rails: Box[] = [
    { pos: [x0 + railLen / 2, 0.95, -stairs.y], size: [railLen, 0.05, 0.05] },
    { pos: [x0 + railLen / 2, 0.5, -stairs.y], size: [railLen, 0.03, 0.03] },
  ];
  for (let x = x0 + 0.1; x <= stairs.x; x += (railLen - 0.2) / 3) {
    rails.push({ pos: [x, 0.48, -stairs.y], size: [0.05, 0.96, 0.05] });
  }
  return (
    <>
      <Boxes boxes={steps}>
        <meshLambertMaterial color="#b9bbb6" />
      </Boxes>
      <Boxes boxes={rails}>
        <meshLambertMaterial color={COLORS.steel} />
      </Boxes>
    </>
  );
}

export function FloorScene({ data, geometry }: { data: FloorData; geometry: FloorGeometry }) {
  const tileMap = useMemo(() => makeGridTexture("#8f979b", "#7b8387"), []);
  const graniteMap = useMemo(() => makeGridTexture("#b4b6b1", "#a3a5a0", 2), []);
  const ceilingMap = useMemo(() => makeGridTexture("#f6f6f4", "#d4d6d3", 4), []);
  const lights = useMemo(
    () => lightPanels(data.floors.map((f) => f.rect), data.ceilingHeight),
    [data],
  );
  const accents = useMemo<Box[]>(
    () =>
      data.accentTiles.map(([x, y, w, h]) => ({
        pos: [x + w / 2, 0.004, -(y + h / 2)],
        size: [w - 0.01, 0.006, h - 0.01],
      })),
    [data],
  );

  return (
    <group>
      {data.floors.map((f, i) => (
        <group key={i}>
          <TiledPlane rect={f.rect} y={0} up map={f.material === "granite" ? graniteMap : tileMap} />
          <TiledPlane rect={f.rect} y={data.ceilingHeight} up={false} map={ceilingMap} />
        </group>
      ))}
      <Boxes boxes={accents}>
        <meshLambertMaterial color={COLORS.accent} />
      </Boxes>
      <Boxes boxes={lights}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </Boxes>

      <Boxes boxes={geometry.walls}>
        <meshLambertMaterial color={COLORS.wall} />
      </Boxes>
      <Boxes boxes={geometry.wainscot}>
        <meshLambertMaterial color={COLORS.wainscot} />
      </Boxes>
      <Boxes boxes={geometry.panels}>
        <meshLambertMaterial color={COLORS.panel} />
      </Boxes>
      <Boxes boxes={geometry.frames}>
        <meshLambertMaterial color={COLORS.frame} />
      </Boxes>
      <Boxes boxes={geometry.brown}>
        <meshLambertMaterial color={COLORS.brown} />
      </Boxes>
      <Boxes boxes={geometry.doors}>
        <meshLambertMaterial color={COLORS.door} />
      </Boxes>
      <Boxes boxes={geometry.glass}>
        <meshLambertMaterial color="#bfe0ea" transparent opacity={0.28} depthWrite={false} />
      </Boxes>

      {data.murals.map((m, i) => (
        <MuralPlane key={i} mural={m} />
      ))}
      {data.signs.map((s, i) => (
        <SignPlane key={i} sign={s} />
      ))}
      {data.props.map((p, i) => (
        <PropMesh key={i} prop={p} />
      ))}
      {data.stairs && <Stairs stairs={data.stairs} />}

      {/* Lawn outside the windows. */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshLambertMaterial color="#7fae6a" />
      </mesh>
    </group>
  );
}
