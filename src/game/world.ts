/**
 * World data for the open-world resume ("Settle Once").
 *
 * Pure data + pure functions (no DOM) so the layout can be validated in Node:
 * spawn, shards and terminals must be walkable and reachable.
 */

export const TILE = 16;
export const MAP_W = 80;
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

export type ZoneId = 'garage' | 'tribuu' | 'loopay' | 'galgo' | 'trebet' | 'hub' | 'aws' | 'azure';

/** The five career districts, in chronological order. */
export const DISTRICTS: ZoneId[] = ['garage', 'tribuu', 'loopay', 'galgo', 'trebet'];

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
} as const;

export interface Building {
  id: ZoneId;
  /** Footprint in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  sign: string;
  sub?: string;
  /** Door tile (the terminal sits here). */
  doorX: number;
  doorY: number;
}

export const BUILDINGS: Building[] = [
  { id: 'garage', x: 3, y: 10, w: 11, h: 9, accent: COLORS.amber, sign: 'CHIA', sub: 'GARAGE', doorX: 8, doorY: 19 },
  { id: 'tribuu', x: 23, y: 7, w: 12, h: 12, accent: COLORS.cyan, sign: 'TRIBUU', doorX: 29, doorY: 19 },
  { id: 'loopay', x: 44, y: 1, w: 12, h: 18, accent: COLORS.magenta, sign: 'LOOPAY', sub: 'SOBERANA', doorX: 50, doorY: 19 },
  { id: 'galgo', x: 65, y: 8, w: 12, h: 11, accent: COLORS.green, sign: 'GALGO', doorX: 70, doorY: 19 },
  { id: 'trebet', x: 3, y: 28, w: 11, h: 12, accent: COLORS.orange, sign: 'TREBET', doorX: 8, doorY: 40 },
  { id: 'hub', x: 65, y: 28, w: 12, h: 14, accent: COLORS.violet, sign: 'SETTLE', sub: 'ONCE', doorX: 70, doorY: 42 },
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
  { id: 'aws', x: center(24), y: center(35), accent: COLORS.aws },
  { id: 'azure', x: center(55), y: center(35), accent: COLORS.azure },
];

export interface ShardDef {
  id: string;
  label: string;
  /** Tile coordinates (center of the tile). */
  tx: number;
  ty: number;
}

/** Stack shards scattered around the city. */
export const SHARDS: ShardDef[] = [
  { id: 'ts', label: 'TypeScript', tx: 10, ty: 23 },
  { id: 'nest', label: 'NestJS', tx: 19, ty: 12 },
  { id: 'react', label: 'React', tx: 30, ty: 22 },
  { id: 'pg', label: 'PostgreSQL', tx: 40, ty: 8 },
  { id: 'docker', label: 'Docker', tx: 60, ty: 12 },
  { id: 'tf', label: 'Terraform', tx: 43, ty: 34 },
  { id: 'azure', label: 'Azure', tx: 19, ty: 38 },
  { id: 'gha', label: 'GitHub Actions', tx: 54, ty: 44 },
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
  { laneX: 39, speed: 52, phase: 0.6 },
  { laneX: 47, speed: 44, phase: 0.35 },
];

export const MIGRATION_GOAL = 3;

/** Rack decor (solid), tile rects {x,y,w,h} inside the Terraform yard. */
export const RACKS = [
  { x: 34, y: 29, w: 2, h: 2 },
  { x: 43, y: 41, w: 2, h: 2 },
  { x: 27, y: 41, w: 2, h: 2 },
  { x: 51, y: 29, w: 2, h: 2 },
];

/** AWS / Azure cargo stacks (solid). */
export const CRATES = [
  { x: 21, y: 33, w: 2, h: 5, dock: 'aws' as const },
  { x: 57, y: 33, w: 2, h: 5, dock: 'azure' as const },
];

export const SPAWN = { x: 40 * TILE, y: 23 * TILE };

const inRoadX = (x: number) => (x >= 17 && x <= 20) || (x >= 38 && x <= 41) || (x >= 59 && x <= 62);

/** Builds the tile grid. Deterministic. */
export function buildTiles(): Uint8Array {
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) tiles[y * MAP_W + x] = v;
  };
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : tiles[y * MAP_W + x]);

  // Roads: one main avenue + three side streets (the middle one only north of the avenue).
  for (let y = 21; y <= 24; y++) for (let x = 0; x < MAP_W; x++) set(x, y, T.ROAD);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!inRoadX(x)) continue;
      if (x >= 38 && x <= 41 && y > 24) continue;
      set(x, y, T.ROAD);
    }
  }
  // Plaza ("Terraform Yard") south of the avenue between the side streets.
  for (let y = 25; y < MAP_H; y++) for (let x = 21; x <= 58; x++) set(x, y, T.PLAZA);

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
