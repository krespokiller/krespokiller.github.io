/**
 * World data for the open-world resume ("Settle Once").
 *
 * The city is a timeline: the main avenue runs west (2019) → east (today)
 * and every career stop is a distinct building on its north side, in
 * chronological order. South of the avenue: the Terraform Yard (migration)
 * and, at the east end, the Settle Once HQ (contact hub).
 *
 * Pure data + pure functions (no DOM) so the layout can be validated in Node:
 * spawn, shards and terminals must be walkable and reachable.
 */

export const TILE = 16;
export const MAP_W = 120;
export const MAP_H = 48;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/** Tile kinds. Plain numbers (not `const enum`) to stay isolatedModules-safe. */
export const T = {
  LOT: 0,
  WALK: 1,
  ROAD: 2,
  WALL: 3,
  PLAZA: 4,
  RACK: 5,
  CRATE: 6,
} as const;

export type ZoneId = 'garage' | 'tribuu' | 'loopayjs' | 'galgo' | 'trebet' | 'loopay' | 'hub' | 'src' | 'dst' | 'console';

/** The six career districts, in chronological order (= the timeline). */
export const DISTRICTS: ZoneId[] = ['garage', 'tribuu', 'loopayjs', 'galgo', 'trebet', 'loopay'];

export const COLORS = {
  amber: '#f59e0b',
  cyan: '#00f0ff',
  magenta: '#ff2bd6',
  green: '#b6ff3b',
  orange: '#ff6a3d',
  violet: '#a78bfa',
  aws: '#ff9900',
  azure: '#2f8bff',
  red: '#ff3860',
  teal: '#2dd4bf',
} as const;

export type BuildingKind = 'garage' | 'loft' | 'office' | 'ops' | 'residential' | 'tower' | 'hq';

export interface Building {
  id: ZoneId;
  kind: BuildingKind;
  /** Footprint in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  sign: string;
  sub?: string;
  /** Year label shown on the sidewalk post. */
  year: string;
  /** Door tile (the terminal sits here). */
  doorX: number;
  doorY: number;
}

/** Terraform Yard columns (inclusive). */
export const YARD_X0 = 21;
export const YARD_X1 = 82;

/** Avenue rows (inclusive). */
export const AVENUE_Y0 = 21;
export const AVENUE_Y1 = 24;

export const BUILDINGS: Building[] = [
  { id: 'garage', kind: 'garage', x: 3, y: 13, w: 10, h: 6, accent: COLORS.amber, sign: 'CHIA', sub: 'GARAGE', year: '2019', doorX: 8, doorY: 19 },
  { id: 'tribuu', kind: 'loft', x: 19, y: 11, w: 12, h: 8, accent: COLORS.cyan, sign: 'TRIBUU', year: '2021', doorX: 25, doorY: 19 },
  { id: 'loopayjs', kind: 'office', x: 37, y: 9, w: 10, h: 10, accent: COLORS.teal, sign: 'LOOPAY', year: '2023', doorX: 42, doorY: 19 },
  { id: 'galgo', kind: 'ops', x: 53, y: 8, w: 12, h: 11, accent: COLORS.green, sign: 'GALGO', year: '2023', doorX: 59, doorY: 19 },
  { id: 'trebet', kind: 'residential', x: 71, y: 6, w: 11, h: 13, accent: COLORS.orange, sign: 'TREBET', year: '2024', doorX: 76, doorY: 19 },
  { id: 'loopay', kind: 'tower', x: 88, y: 1, w: 13, h: 18, accent: COLORS.magenta, sign: 'LOOPAY', sub: 'SOBERANA', year: '2025', doorX: 94, doorY: 19 },
  { id: 'hub', kind: 'hq', x: 103, y: 28, w: 13, h: 14, accent: COLORS.violet, sign: 'KRESPOKILLER', sub: 'OFFICE', year: 'NOW', doorX: 109, doorY: 42 },
];

export interface Terminal {
  id: ZoneId;
  /** Pixel center. */
  x: number;
  y: number;
  accent: string;
}

const center = (t: number) => (t + 0.5) * TILE;

export const TERMINALS: Terminal[] = [
  ...BUILDINGS.map((b) => ({ id: b.id, x: center(b.doorX), y: center(b.doorY), accent: b.accent })),
  { id: 'src', x: center(24), y: center(35), accent: COLORS.violet },
  { id: 'dst', x: center(76), y: center(35), accent: COLORS.violet },
  { id: 'console', x: center(50), y: center(31), accent: COLORS.cyan },
];

export interface ShardDef {
  id: string;
  label: string;
  /** Tile coordinates (center of the tile). */
  tx: number;
  ty: number;
}

/** Stack shards scattered along the timeline and the yard. */
export const SHARDS: ShardDef[] = [
  { id: 'ts', label: 'TypeScript', tx: 15, ty: 12 },
  { id: 'nest', label: 'NestJS', tx: 33, ty: 14 },
  { id: 'react', label: 'React', tx: 49, ty: 13 },
  { id: 'pg', label: 'PostgreSQL', tx: 67, ty: 12 },
  { id: 'docker', label: 'Docker', tx: 85, ty: 10 },
  { id: 'tf', label: 'Terraform', tx: 47, ty: 44 },
  { id: 'azure', label: 'Azure', tx: 66, ty: 44 },
  { id: 'gha', label: 'GitHub Actions', tx: 90, ty: 42 },
];

export interface DroneDef {
  /** Lane x in tiles; drones patrol vertically along it. */
  laneX: number;
  /** Pixels per second. */
  speed: number;
  /** Start offset along the patrol path, 0..1. */
  phase: number;
}

export const DRONE_Y_MIN = 27 * TILE;
export const DRONE_Y_MAX = 46 * TILE;

export const DRONES: DroneDef[] = [
  { laneX: 31, speed: 38, phase: 0.1 },
  { laneX: 41, speed: 52, phase: 0.6 },
  { laneX: 50, speed: 44, phase: 0.35 },
  { laneX: 60, speed: 48, phase: 0.8 },
  { laneX: 69, speed: 40, phase: 0.25 },
];

/** Migrations completed to satisfy the hub objective. */
export const MIGRATION_GOAL = 1;

/** Rack decor (solid), tile rects {x,y,w,h} inside the Terraform yard. */
export const RACKS = [
  { x: 34, y: 29, w: 2, h: 2 },
  { x: 43, y: 41, w: 2, h: 2 },
  { x: 27, y: 41, w: 2, h: 2 },
  { x: 56, y: 29, w: 2, h: 2 },
  { x: 64, y: 41, w: 2, h: 2 },
  { x: 72, y: 29, w: 2, h: 2 },
];

/** Source / target cargo stacks (solid). */
export const CRATES = [
  { x: 21, y: 33, w: 2, h: 5, dock: 'src' as const },
  { x: 78, y: 33, w: 2, h: 5, dock: 'dst' as const },
];

/** Cars drive along the avenue: lane y (tiles), direction, speed (px/s). */
export const CARS = [
  { laneY: 21.5, dir: 1, speed: 46, color: COLORS.cyan, phase: 0.1 },
  { laneY: 23.5, dir: -1, speed: 38, color: COLORS.magenta, phase: 0.55 },
  { laneY: 21.5, dir: 1, speed: 52, color: COLORS.amber, phase: 0.7 },
];

/** The journey starts at the beginning of the timeline, in front of the garage. */
export const SPAWN = { x: 12 * TILE, y: 23 * TILE };

/** Side streets (x ranges, inclusive); the middle ones only north of the avenue. */
const SIDE_STREETS: { x0: number; x1: number; south: boolean }[] = [
  { x0: 15, x1: 18, south: true },
  { x0: 33, x1: 36, south: false },
  { x0: 49, x1: 52, south: false },
  { x0: 67, x1: 70, south: false },
  { x0: 84, x1: 87, south: false },
  { x0: 99, x1: 102, south: true },
];

export const sideStreetAt = (x: number) => SIDE_STREETS.find((s) => x >= s.x0 && x <= s.x1) ?? null;

/** Builds the tile grid. Deterministic. */
export function buildTiles(): Uint8Array {
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) tiles[y * MAP_W + x] = v;
  };
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : tiles[y * MAP_W + x]);

  // Main avenue + side streets.
  for (let y = AVENUE_Y0; y <= AVENUE_Y1; y++) for (let x = 0; x < MAP_W; x++) set(x, y, T.ROAD);
  for (const s of SIDE_STREETS) {
    for (let y = 0; y < MAP_H; y++) {
      if (y > AVENUE_Y1 && !s.south) continue;
      for (let x = s.x0; x <= s.x1; x++) set(x, y, T.ROAD);
    }
  }
  // Plaza ("Terraform Yard") south of the avenue.
  for (let y = AVENUE_Y1 + 1; y < MAP_H; y++) for (let x = YARD_X0; x <= YARD_X1; x++) set(x, y, T.PLAZA);

  // Sidewalks: any lot tile touching a road.
  const sidewalks: number[] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (get(x, y) !== T.LOT) continue;
      if (get(x + 1, y) === T.ROAD || get(x - 1, y) === T.ROAD || get(x, y + 1) === T.ROAD || get(x, y - 1) === T.ROAD) {
        sidewalks.push(y * MAP_W + x);
      }
    }
  }
  sidewalks.forEach((i) => (tiles[i] = T.WALK));

  for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, T.WALL);
  for (const r of RACKS) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, T.RACK);
  for (const c of CRATES) for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) set(x, y, T.CRATE);

  return tiles;
}

export const isSolidTile = (t: number) => t === T.WALL || t === T.RACK || t === T.CRATE;

export function tileAt(tiles: Uint8Array, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.WALL;
  return tiles[ty * MAP_W + tx];
}

/** Player feet box: 8 wide, 5 tall, anchored at (x, y) = bottom-center. */
const HALF_W = 4;
const BOX_H = 5;

export function collides(tiles: Uint8Array, x: number, y: number): boolean {
  const x0 = Math.floor((x - HALF_W) / TILE);
  const x1 = Math.floor((x + HALF_W - 0.001) / TILE);
  const y0 = Math.floor((y - BOX_H) / TILE);
  const y1 = Math.floor((y - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolidTile(tileAt(tiles, tx, ty))) return true;
    }
  }
  return false;
}

/** Drone position along its lane at time `t` seconds (ping-pong patrol). */
export function dronePosition(d: DroneDef, t: number): { x: number; y: number } {
  const span = DRONE_Y_MAX - DRONE_Y_MIN;
  const travelled = d.phase * span * 2 + t * d.speed;
  const m = travelled % (span * 2);
  const y = DRONE_Y_MIN + (m < span ? m : span * 2 - m);
  return { x: center(d.laneX), y };
}

/** Car position along the avenue at time `t` (wraps around the world). */
export function carPosition(c: (typeof CARS)[number], t: number): { x: number; y: number } {
  const span = WORLD_W + 64;
  const travelled = (c.phase * span + t * c.speed) % span;
  const x = c.dir > 0 ? travelled - 32 : WORLD_W + 32 - travelled;
  return { x, y: c.laneY * TILE };
}
