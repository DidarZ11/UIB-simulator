import type { Aabb, Box, Facing, FloorData, Placed, Rect, Wall } from "./types";

export type FloorGeometry = {
  walls: Box[];
  wainscot: Box[];
  panels: Box[];
  frames: Box[];
  brown: Box[];
  glass: Box[];
  doors: Box[];
  colliders: Aabb[];
};

const PANEL_SPACING = 0.85;
const PANEL_MARGIN = 0.14;

/** World-space normal (x, z) and Y rotation for something facing a compass direction. */
export const FACING: Record<Facing, { n: [number, number]; rot: number }> = {
  N: { n: [0, -1], rot: Math.PI },
  S: { n: [0, 1], rot: 0 },
  E: { n: [1, 0], rot: Math.PI / 2 },
  W: { n: [-1, 0], rot: -Math.PI / 2 },
};

export function placedPosition(p: Placed, defaultOffset = 0.11): [number, number, number] {
  const { n } = FACING[p.facing];
  const off = p.offset ?? defaultOffset;
  return [p.at[0] + n[0] * off, p.bottom + p.height / 2, -p.at[1] + n[1] * off];
}

export function rectCenter(rect: Rect): [number, number] {
  return [rect[0] + rect[2] / 2, -(rect[1] + rect[3] / 2)];
}

export function boxToAabb(b: Box): Aabb {
  return {
    minX: b.pos[0] - b.size[0] / 2,
    maxX: b.pos[0] + b.size[0] / 2,
    minZ: b.pos[2] - b.size[2] / 2,
    maxZ: b.pos[2] + b.size[2] / 2,
  };
}

/** A box covering [s0, s1] along the wall and [h0, h1] in height. */
function wallBox(wall: Wall, s0: number, s1: number, h0: number, h1: number, thickness: number): Box {
  const [fx, fy] = wall.from;
  const [tx, ty] = wall.to;
  const mid = (s0 + s1) / 2;
  const y = (h0 + h1) / 2;
  if (fy === ty) {
    const dir = Math.sign(tx - fx);
    return { pos: [fx + dir * mid, y, -fy], size: [s1 - s0, h1 - h0, thickness] };
  }
  if (fx === tx) {
    const dir = Math.sign(ty - fy);
    return { pos: [fx, y, -(fy + dir * mid)], size: [thickness, h1 - h0, s1 - s0] };
  }
  throw new Error(`Wall ${wall.id} is not axis-aligned`);
}

function wallLength(wall: Wall): number {
  return Math.abs(wall.to[0] - wall.from[0]) + Math.abs(wall.to[1] - wall.from[1]);
}

export function buildFloorGeometry(data: FloorData): FloorGeometry {
  const g: FloorGeometry = {
    walls: [],
    wainscot: [],
    panels: [],
    frames: [],
    brown: [],
    glass: [],
    doors: [],
    colliders: [],
  };
  const H = data.ceilingHeight;
  const wh = data.wainscotHeight;
  const t = data.wallThickness;

  // Lower part of a solid wall piece: grey wainscot with a rail and inset panels.
  const addWainscot = (wall: Wall, s0: number, s1: number, top: number) => {
    const height = Math.min(top, wh);
    g.wainscot.push(wallBox(wall, s0, s1, 0, height, t + 0.06));
    if (top >= wh) g.wainscot.push(wallBox(wall, s0, s1, wh - 0.03, wh + 0.03, t + 0.12));
    const len = s1 - s0;
    const n = Math.floor(len / PANEL_SPACING);
    if (n < 1 || height < 0.5) return;
    const cell = len / n;
    for (let i = 0; i < n; i++) {
      const a = s0 + i * cell + 0.09;
      const b = s0 + (i + 1) * cell - 0.09;
      g.panels.push(wallBox(wall, a, b, PANEL_MARGIN, height - PANEL_MARGIN, t + 0.09));
    }
  };

  const addSolid = (wall: Wall, s0: number, s1: number, h0: number, h1: number) => {
    if (s1 - s0 < 0.01 || h1 - h0 < 0.01) return;
    if (wall.style === "glass") {
      g.glass.push(wallBox(wall, s0, s1, h0, h1, 0.04));
      // Brown frame: posts at both ends, rails at the bottom and top of the pane.
      g.brown.push(wallBox(wall, s0, s0 + 0.08, h0, h1, 0.1));
      g.brown.push(wallBox(wall, s1 - 0.08, s1, h0, h1, 0.1));
      g.brown.push(wallBox(wall, s0, s1, h0, h0 + 0.08, 0.1));
      g.brown.push(wallBox(wall, s0, s1, h1 - 0.08, h1, 0.1));
      if (h0 === 0 && h1 > 2.2) g.brown.push(wallBox(wall, s0, s1, 2.06, 2.14, 0.1));
    } else {
      g.walls.push(wallBox(wall, s0, s1, h0, h1, t));
      if (h0 === 0) addWainscot(wall, s0, s1, h1);
    }
    if (h0 === 0) g.colliders.push(boxToAabb(wallBox(wall, s0, s1, h0, h1, t)));
  };

  for (const wall of data.walls) {
    const L = wallLength(wall);
    const openings = [...(wall.openings ?? [])].sort((a, b) => a.at - b.at);
    // Extend by half a thickness at both ends so corners close up.
    let cursor = -t / 2;
    for (const o of openings) {
      const sill = o.sill ?? 0;
      const top = o.top ?? H;
      const s0 = o.at;
      const s1 = o.at + o.width;
      addSolid(wall, cursor, s0, 0, H);
      addSolid(wall, s0, s1, 0, sill);
      addSolid(wall, s0, s1, top, H);
      cursor = s1;

      if (o.kind === "window") {
        const f = 0.07;
        g.glass.push(wallBox(wall, s0, s1, sill, top, 0.02));
        g.frames.push(wallBox(wall, s0, s0 + f, sill, top, t * 0.6));
        g.frames.push(wallBox(wall, s1 - f, s1, sill, top, t * 0.6));
        g.frames.push(wallBox(wall, s0, s1, sill, sill + f, t * 0.6));
        g.frames.push(wallBox(wall, s0, s1, top - f, top, t * 0.6));
        const mullions = Math.max(1, Math.round(o.width / 1.2)) - 1;
        for (let i = 1; i <= mullions; i++) {
          const m = s0 + (o.width * i) / (mullions + 1);
          g.frames.push(wallBox(wall, m - f / 2, m + f / 2, sill, top, t * 0.6));
        }
        // Window sill sticking out on both sides.
        g.frames.push(wallBox(wall, s0 - 0.05, s1 + 0.05, sill - 0.04, sill, t + 0.3));
        g.colliders.push(boxToAabb(wallBox(wall, s0, s1, 0, top, t)));
      }

      if (o.kind === "door") {
        const f = 0.06;
        const leaf = wallBox(wall, s0 + f, s1 - f, 0, top - f, 0.06);
        (wall.style === "glass" ? g.brown : g.doors).push(leaf);
        if (wall.style !== "glass") {
          // Frame sits inside the opening so it never shares a face with the wainscot.
          g.frames.push(wallBox(wall, s0, s0 + f, 0, top, t + 0.16));
          g.frames.push(wallBox(wall, s1 - f, s1, 0, top, t + 0.16));
          g.frames.push(wallBox(wall, s0, s1, top - f, top, t + 0.16));
        }
        g.colliders.push(boxToAabb(wallBox(wall, s0, s1, 0, top, t)));
      }
    }
    addSolid(wall, cursor, L + t / 2, 0, H);
  }

  for (const p of data.pillars) {
    const [x, y] = p.at;
    const [w, d] = p.size;
    const body: Box = { pos: [x, H / 2, -y], size: [w, H, d] };
    g.walls.push(body);
    g.wainscot.push({ pos: [x, wh / 2, -y], size: [w + 0.06, wh, d + 0.06] });
    g.wainscot.push({ pos: [x, wh, -y], size: [w + 0.12, 0.06, d + 0.12] });
    const ph = wh - PANEL_MARGIN * 2;
    g.panels.push({ pos: [x, wh / 2, -y], size: [w - 0.3, ph, d + 0.09] });
    g.panels.push({ pos: [x, wh / 2, -y], size: [w + 0.09, ph, d - 0.3] });
    g.colliders.push(boxToAabb(body));
  }

  if (data.stairs) {
    const { from, to } = data.stairs.barrier;
    g.colliders.push({
      minX: Math.min(from[0], to[0]),
      maxX: Math.max(from[0], to[0]),
      minZ: -from[1] - 0.1,
      maxZ: -from[1] + 0.1,
    });
  }

  return g;
}

export function zoneAt(data: FloorData, x: number, z: number): string | null {
  const y = -z;
  for (const zone of data.zones) {
    const [rx, ry, rw, rh] = zone.rect;
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return zone.name;
  }
  return null;
}

export function circleHits(colliders: Aabb[], x: number, z: number, r: number): boolean {
  for (const c of colliders) {
    const dx = x - Math.max(c.minX, Math.min(x, c.maxX));
    const dz = z - Math.max(c.minZ, Math.min(z, c.maxZ));
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}
