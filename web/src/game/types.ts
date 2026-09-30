// Plan coordinates are in metres: x grows east, y grows north.
// In the 3D scene X = x, Z = -y, Y is up.

export type Vec2 = [number, number];
/** [x, y, width, height] with (x, y) the south-west corner. */
export type Rect = [number, number, number, number];
export type Facing = "N" | "S" | "E" | "W";

export type Opening = {
  kind: "window" | "door" | "passage";
  /** Distance from the wall's `from` point to the start of the opening. */
  at: number;
  width: number;
  sill?: number;
  top?: number;
};

export type Wall = {
  id: string;
  from: Vec2;
  to: Vec2;
  style?: "solid" | "glass";
  openings?: Opening[];
};

export type Placed = {
  at: Vec2;
  facing: Facing;
  width: number;
  bottom: number;
  height: number;
  /** Distance from `at` along the facing direction. Defaults to just off a wall surface. */
  offset?: number;
};

export type Mural = Placed & { kind: "mission" | "timeline" | "accreditations" };
export type Sign = Placed & { text: string; bg: string; fg: string };

export type Prop =
  | { type: "banner"; at: Vec2; facing: Facing; color: string }
  | ({ type: "mirror" | "tv" } & Placed)
  | { type: "photoFrame"; at: Vec2; facing: Facing };

export type FloorData = {
  id: string;
  name: string;
  ceilingHeight: number;
  wainscotHeight: number;
  wallThickness: number;
  spawn: { x: number; y: number; yaw: number };
  zones: { name: string; rect: Rect }[];
  floors: { rect: Rect; material?: "tile" | "granite" }[];
  accentTiles: Rect[];
  walls: Wall[];
  pillars: { id: string; at: Vec2; size: Vec2 }[];
  murals: Mural[];
  signs: Sign[];
  props: Prop[];
  stairs?: {
    x: number;
    y: number;
    width: number;
    steps: number;
    stepDepth: number;
    stepHeight: number;
    barrier: { from: Vec2; to: Vec2 };
  };
};

export type Box = {
  pos: [number, number, number];
  size: [number, number, number];
};

export type Aabb = { minX: number; maxX: number; minZ: number; maxZ: number };
