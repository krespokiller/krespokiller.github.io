/**
 * Procedural pixel art. No image assets: the world is painted once into an
 * offscreen canvas (static layer); the engine blits a window of it per frame
 * and draws the live parts (doors, cars, lights, actors) on top.
 */
import { AVENUE_Y0, AVENUE_Y1, BUILDINGS, COLORS, CRATES, MAP_H, MAP_W, RACKS, TILE, T, WORLD_H, WORLD_W, YARD_X0, YARD_X1, sideStreetAt } from './world';
import type { Building } from './world';

// ---------------------------------------------------------------- pixel font

const G: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '-': ['...', '...', '###', '...', '...'],
  '.': ['...', '...', '...', '...', '.#.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  ' ': ['...', '...', '...', '...', '...'],
};

export const textWidth = (text: string, scale: number) => Math.max(0, text.length * 4 * scale - scale);

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string): void {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text.toUpperCase()) {
    const glyph = G[ch] ?? G[' '];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (glyph[r][c] === '#') ctx.fillRect(cx + c * scale, Math.round(y) + r * scale, scale, scale);
      }
    }
    cx += 4 * scale;
  }
}

// ---------------------------------------------------------------------- misc

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function glowRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, strength = 1) {
  for (let i = 3; i >= 1; i--) {
    ctx.fillStyle = rgba(color, 0.07 * strength);
    ctx.fillRect(x - i * 2, y - i * 2, w + i * 4, h + i * 4);
  }
}

const PAL = {
  lot: '#0e0b20',
  lotAlt: '#110d26',
  walk: '#1c1739',
  walkLine: '#251e4b',
  road: '#120e27',
  roadAlt: '#0f0b21',
  plaza: '#150f2f',
  plazaLine: '#1f1848',
  wall: '#0f0b25',
  wallLight: '#19133a',
  win: '#17123a',
  brick: '#2a1a2e',
  concrete: '#1b1735',
};

// ------------------------------------------------------------- door / sign

/** Door rect in px. The static layer draws the frame; the engine animates the leaf. */
export function doorRect(b: Building): { x: number; y: number; w: number; h: number } {
  const cx = b.x * TILE + (b.w * TILE) / 2;
  const h = b.kind === 'garage' ? 22 : 19;
  const w = b.kind === 'garage' ? 34 : b.kind === 'residential' ? 12 : 14;
  return { x: Math.round(cx - w / 2), y: (b.y + b.h) * TILE - h, w, h };
}

/** Sign plate rect (px), right above the door so it is on screen where the player stands. */
export function signRect(b: Building): { x: number; y: number; w: number; h: number; scale: number } {
  const scale = b.sign.length > 6 ? 2 : 3;
  const plateW = Math.min(b.w * TILE - 12, textWidth(b.sign, scale) + 14);
  const plateH = scale * 5 + 8 + (b.sub ? 12 : 0);
  const door = doorRect(b);
  return { x: Math.round(b.x * TILE + (b.w * TILE) / 2 - plateW / 2), y: door.y - plateH - 10, w: plateW, h: plateH, scale };
}

// -------------------------------------------------------------- world render

export function renderWorld(tiles: Uint8Array): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = WORLD_W;
  cv.height = WORLD_H;
  const ctx = cv.getContext('2d')!;
  const rand = rng(1337);

  // Ground
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const t = tiles[ty * MAP_W + tx];
      const x = tx * TILE;
      const y = ty * TILE;
      if (t === T.ROAD) ctx.fillStyle = (tx + ty) % 2 ? PAL.road : PAL.roadAlt;
      else if (t === T.WALK) ctx.fillStyle = PAL.walk;
      else if (t === T.PLAZA) ctx.fillStyle = (tx + ty) % 2 ? PAL.plaza : '#130d2b';
      else ctx.fillStyle = (tx + ty) % 2 ? PAL.lot : PAL.lotAlt;
      ctx.fillRect(x, y, TILE, TILE);
      if (t === T.WALK) {
        ctx.fillStyle = PAL.walkLine;
        ctx.fillRect(x, y + TILE - 1, TILE, 1);
        ctx.fillRect(x + TILE - 1, y, 1, TILE);
      }
    }
  }
  // Grain
  for (let i = 0; i < 7800; i++) {
    const x = Math.floor(rand() * WORLD_W);
    const y = Math.floor(rand() * WORLD_H);
    ctx.fillStyle = rand() > 0.5 ? 'rgba(120,90,255,0.06)' : 'rgba(0,240,255,0.04)';
    ctx.fillRect(x, y, 1, 1);
  }

  // Plaza circuit grid
  ctx.fillStyle = PAL.plazaLine;
  for (let tx = YARD_X0; tx <= YARD_X1; tx += 4) ctx.fillRect(tx * TILE, 25 * TILE, 1, (MAP_H - 25) * TILE);
  for (let ty = 25; ty < MAP_H; ty += 4) ctx.fillRect(YARD_X0 * TILE, ty * TILE, (YARD_X1 - YARD_X0 + 1) * TILE, 1);
  ctx.fillStyle = 'rgba(0,240,255,0.5)';
  for (let tx = YARD_X0; tx <= YARD_X1; tx += 4) for (let ty = 25; ty < MAP_H; ty += 4) ctx.fillRect(tx * TILE - 1, ty * TILE - 1, 3, 3);
  drawText(ctx, 'TERRAFORM YARD', 38 * TILE, 26 * TILE + 4, 3, 'rgba(0,240,255,0.16)');

  // Avenue center line (dashed amber) and side-street dashes
  ctx.fillStyle = 'rgba(245,158,11,0.55)';
  for (let x = 0; x < WORLD_W; x += 20) {
    if (sideStreetAt(Math.floor(x / TILE)) || sideStreetAt(Math.floor((x + 10) / TILE))) continue;
    ctx.fillRect(x, 23 * TILE - 1, 10, 2);
  }
  for (let tx = 0; tx < MAP_W; tx++) {
    const s = sideStreetAt(tx);
    if (!s || tx !== s.x0 + 2) continue;
    const cx = tx * TILE;
    const yMax = s.south ? WORLD_H : AVENUE_Y0 * TILE;
    for (let y = 0; y < yMax; y += 20) {
      if (y >= AVENUE_Y0 * TILE - 4 && y < (AVENUE_Y1 + 1) * TILE) continue;
      ctx.fillRect(cx - 1, y, 2, 10);
    }
  }
  // Crosswalks at every side street
  ctx.fillStyle = 'rgba(220,220,255,0.18)';
  for (let tx = 0; tx < MAP_W; tx++) {
    const s = sideStreetAt(tx);
    if (!s || tx !== s.x0) continue;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect((tx + i) * TILE + 2, AVENUE_Y0 * TILE - 13, 12, 3);
      if (s.south) ctx.fillRect((tx + i) * TILE + 2, (AVENUE_Y1 + 1) * TILE + 8, 12, 3);
    }
  }

  // Timeline path: dotted trail on the north sidewalk linking the doors, west → east.
  ctx.fillStyle = 'rgba(245,158,11,0.35)';
  for (let x = 2 * TILE; x < WORLD_W - 2 * TILE; x += 6) ctx.fillRect(x, 20 * TILE + 7, 3, 2);
  // then down to the HQ door
  const hq = BUILDINGS.find((b) => b.id === 'hub')!;
  for (let y = 20 * TILE + 7; y < hq.doorY * TILE; y += 6) ctx.fillRect(hq.doorX * TILE + 7, y, 2, 3);

  // Year posts on the sidewalk, one per building, with an arrow pointing east.
  for (const b of BUILDINGS) {
    if (b.id === 'hub') continue;
    const px = b.doorX * TILE - 22;
    const py = 20 * TILE + 2;
    ctx.fillStyle = '#2a2250';
    ctx.fillRect(px + 4, py - 6, 2, 16);
    glowRect(ctx, px - 2, py - 14, 24, 9, b.accent, 0.6);
    ctx.fillStyle = '#07041a';
    ctx.fillRect(px - 2, py - 14, 24, 9);
    ctx.fillStyle = b.accent;
    ctx.fillRect(px - 2, py - 14, 24, 1);
    drawText(ctx, b.year, px + 10 - textWidth(b.year, 1) / 2, py - 12, 1, b.accent);
  }

  // Puddles with neon reflections
  const reflect = [COLORS.cyan, COLORS.magenta, COLORS.amber];
  for (let i = 0; i < 70; i++) {
    const tx = Math.floor(rand() * MAP_W);
    const ty = Math.floor(rand() * MAP_H);
    const t = tiles[ty * MAP_W + tx];
    if (t !== T.ROAD && t !== T.PLAZA) continue;
    const px = tx * TILE + Math.floor(rand() * 8);
    const py = ty * TILE + Math.floor(rand() * 10);
    const c = reflect[Math.floor(rand() * reflect.length)];
    ctx.fillStyle = rgba(c, 0.1);
    ctx.fillRect(px, py, 10, 4);
    ctx.fillStyle = rgba(c, 0.16);
    ctx.fillRect(px + 2, py + 1, 6, 2);
  }

  // Lot clutter (dumpsters, vents, trees)
  for (let i = 0; i < 110; i++) {
    const tx = Math.floor(rand() * MAP_W);
    const ty = Math.floor(rand() * MAP_H);
    if (tiles[ty * MAP_W + tx] !== T.LOT) continue;
    const px = tx * TILE + 2;
    const py = ty * TILE + 4;
    const r = rand();
    if (r > 0.66) {
      ctx.fillStyle = '#0b1f1c';
      ctx.fillRect(px, py, 10, 6);
      ctx.fillStyle = '#143b35';
      ctx.fillRect(px, py, 10, 2);
    } else if (r > 0.33) {
      ctx.fillStyle = '#1b1538';
      ctx.fillRect(px, py, 8, 8);
      ctx.fillStyle = '#0a0720';
      for (let k = 0; k < 3; k++) ctx.fillRect(px + 1, py + 2 + k * 2, 6, 1);
    } else {
      // neon tree
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(px + 4, py + 4, 2, 6);
      ctx.fillStyle = '#143b35';
      ctx.fillRect(px + 1, py, 8, 6);
      ctx.fillStyle = '#1f6b4f';
      ctx.fillRect(px + 2, py - 2, 6, 4);
    }
  }

  // Dock pads (provider colors are drawn live by the engine)
  for (const [tx, ty] of [[24, 35], [76, 35]] as const) {
    const x = tx * TILE - 8;
    const y = ty * TILE - 8;
    ctx.fillStyle = rgba(COLORS.violet, 0.08);
    ctx.fillRect(x - 4, y - 4, 40, 40);
    ctx.fillStyle = rgba(COLORS.violet, 0.55);
    ctx.fillRect(x - 4, y - 4, 40, 1);
    ctx.fillRect(x - 4, y + 35, 40, 1);
    ctx.fillRect(x - 4, y - 4, 1, 40);
    ctx.fillRect(x + 35, y - 4, 1, 40);
  }

  // Lamps along both sidewalks of the avenue
  for (let tx = 3; tx < MAP_W; tx += 7) {
    for (const ty of [AVENUE_Y0 - 1, AVENUE_Y1 + 1]) {
      if (tiles[ty * MAP_W + tx] !== T.WALK) continue;
      const x = tx * TILE + 8;
      const y = ty * TILE + 12;
      const g = ctx.createRadialGradient(x, y, 1, x, y, 30);
      g.addColorStop(0, 'rgba(255,210,122,0.2)');
      g.addColorStop(1, 'rgba(255,210,122,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 30, y - 30, 60, 60);
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(x, y - 8, 1, 9);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(x - 1, y - 10, 3, 2);
    }
  }

  // Racks
  for (const r of RACKS) {
    const x = r.x * TILE;
    const y = r.y * TILE;
    const w = r.w * TILE;
    const h = r.h * TILE;
    ctx.fillStyle = '#0a0720';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1a1440';
    ctx.fillRect(x, y, w, 3);
    for (let ry = y + 6; ry < y + h - 3; ry += 5) {
      ctx.fillStyle = '#150f33';
      ctx.fillRect(x + 2, ry, w - 4, 3);
      ctx.fillStyle = rand() > 0.5 ? COLORS.cyan : COLORS.green;
      ctx.fillRect(x + 4, ry + 1, 2, 1);
      ctx.fillStyle = rand() > 0.6 ? COLORS.magenta : '#3a2f7a';
      ctx.fillRect(x + 8, ry + 1, 2, 1);
    }
    glowRect(ctx, x, y, w, h, COLORS.cyan, 0.4);
  }

  // Cargo stacks (neutral; the engine tints them per migration)
  for (const c of CRATES) {
    const color = '#8f87c9';
    const x = c.x * TILE;
    const y = c.y * TILE;
    const w = c.w * TILE;
    const h = c.h * TILE;
    glowRect(ctx, x, y, w, h, color, 0.6);
    for (let by = y; by < y + h; by += 16) {
      ctx.fillStyle = '#0d0a22';
      ctx.fillRect(x, by, w, 15);
      ctx.fillStyle = rgba(color, 0.85);
      ctx.fillRect(x, by, w, 2);
      ctx.fillRect(x, by, 2, 15);
      ctx.fillRect(x + w - 2, by, 2, 15);
      ctx.fillStyle = rgba(color, 0.35);
      ctx.fillRect(x + 4, by + 5, w - 8, 1);
      ctx.fillRect(x + 4, by + 9, w - 8, 1);
    }
  }

  // Migration console pad (center of the yard)
  {
    const x = 50 * TILE - 12;
    const y = 31 * TILE - 10;
    glowRect(ctx, x, y, 24, 14, COLORS.cyan, 0.7);
    ctx.fillStyle = '#07041a';
    ctx.fillRect(x, y, 24, 14);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(x, y, 24, 1);
    ctx.fillStyle = 'rgba(0,240,255,0.5)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 3, y + 3 + i * 3, 10 + (i % 2) * 6, 1);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(x + 20, y + 3, 2, 2);
    drawText(ctx, 'CONSOLE', x + 12 - textWidth('CONSOLE', 1) / 2, y - 8, 1, COLORS.cyan);
  }

  // Buildings last (they overlap clutter)
  for (const b of BUILDINGS) drawBuilding(ctx, b, rand);

  return cv;
}

// ------------------------------------------------------------- buildings

type Rand = () => number;

function windows(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, accent: string, rand: Rand, stepX = 9, stepY = 10, w = 4, h = 5, litChance = 0.38) {
  const lit = [accent, '#ffd27a', '#7df9ff', '#ff7ad9'];
  for (let wy = y0; wy + h <= y1; wy += stepY) {
    for (let wx = x0; wx + w <= x1; wx += stepX) {
      const on = rand() < litChance;
      ctx.fillStyle = on ? rgba(lit[Math.floor(rand() * lit.length)], 0.85) : PAL.win;
      ctx.fillRect(wx, wy, w, h);
    }
  }
}

function signPlate(ctx: CanvasRenderingContext2D, b: Building) {
  const sr = signRect(b);
  const cx = b.x * TILE + (b.w * TILE) / 2;
  const mainW = textWidth(b.sign, sr.scale);
  glowRect(ctx, sr.x, sr.y, sr.w, sr.h, b.accent, 0.8);
  ctx.fillStyle = '#07041a';
  ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
  ctx.fillStyle = rgba(b.accent, 0.9);
  ctx.fillRect(sr.x, sr.y, sr.w, 1);
  ctx.fillRect(sr.x, sr.y + sr.h - 1, sr.w, 1);
  drawText(ctx, b.sign, cx - mainW / 2, sr.y + 4, sr.scale, b.accent);
  if (b.sub) {
    const sw = textWidth(b.sub, 2);
    drawText(ctx, b.sub, cx - sw / 2, sr.y + 4 + sr.scale * 5 + 3, 2, '#ffffff');
  }
}

function doorFrame(ctx: CanvasRenderingContext2D, b: Building) {
  const d = doorRect(b);
  glowRect(ctx, d.x, d.y, d.w, d.h, b.accent, 0.9);
  ctx.fillStyle = '#05030f';
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = b.accent;
  ctx.fillRect(d.x, d.y, d.w, 1);
  ctx.fillRect(d.x, d.y, 1, d.h);
  ctx.fillRect(d.x + d.w - 1, d.y, 1, d.h);
  // warm light spilling onto the sidewalk
  const g = ctx.createLinearGradient(0, d.y + d.h, 0, d.y + d.h + 14);
  g.addColorStop(0, rgba(b.accent, 0.22));
  g.addColorStop(1, rgba(b.accent, 0));
  ctx.fillStyle = g;
  ctx.fillRect(d.x - 4, d.y + d.h, d.w + 8, 14);
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, rand: Rand) {
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const cx = x + w / 2;
  const accent = b.accent;
  const sr = signRect(b);
  const d = doorRect(b);

  glowRect(ctx, x, y, w, h, accent, 0.5);

  switch (b.kind) {
    case 'garage': {
      // Low concrete box with a flat roof, a workbench window and a big roll-up door.
      ctx.fillStyle = PAL.concrete;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#231d44';
      ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      // corrugated wall lines
      ctx.fillStyle = '#16122f';
      for (let yy = y + 10; yy < y + h; yy += 4) ctx.fillRect(x + 2, yy, w - 4, 1);
      // side window with the monitor glow
      ctx.fillStyle = PAL.win;
      ctx.fillRect(x + 8, y + 12, 18, 12);
      ctx.fillStyle = rgba(COLORS.cyan, 0.75);
      ctx.fillRect(x + 11, y + 15, 7, 5);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(x + 20, y + 14, 3, 2);
      // oil stain + tyre by the door
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + w - 30, y + h + 2, 12, 4);
      ctx.fillStyle = '#0a0720';
      ctx.fillRect(x + w - 14, y + h - 10, 8, 8);
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(x + w - 12, y + h - 8, 4, 4);
      // roll-up door frame (leaf drawn live)
      ctx.fillStyle = '#05030f';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = accent;
      ctx.fillRect(d.x - 1, d.y - 1, d.w + 2, 1);
      ctx.fillRect(d.x - 1, d.y, 1, d.h);
      ctx.fillRect(d.x + d.w, d.y, 1, d.h);
      break;
    }
    case 'loft': {
      // Wide brick coworking loft with big grid windows and screens inside.
      ctx.fillStyle = PAL.brick;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#1b1020';
      for (let yy = y + 3; yy < y + h; yy += 4) for (let xx = x + ((yy / 4) % 2 ? 0 : 4); xx < x + w; xx += 8) ctx.fillRect(xx, yy, 6, 1);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      // big windows
      for (let wx = x + 8; wx + 22 <= x + w - 8; wx += 26) {
        ctx.fillStyle = '#0d1a30';
        ctx.fillRect(wx, y + 10, 22, 16);
        ctx.fillStyle = '#2a2250';
        ctx.fillRect(wx + 10, y + 10, 2, 16);
        ctx.fillRect(wx, y + 17, 22, 2);
        // video-call screens
        ctx.fillStyle = rgba(COLORS.cyan, 0.7);
        ctx.fillRect(wx + 3, y + 12, 5, 3);
        ctx.fillStyle = rgba('#7df9ff', 0.6);
        ctx.fillRect(wx + 14, y + 20, 5, 3);
      }
      doorFrame(ctx, b);
      break;
    }
    case 'office': {
      ctx.fillStyle = PAL.wall;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PAL.wallLight;
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      windows(ctx, x + 9, y + 14, x + w - 8, sr.y - 6, accent, rand);
      // rooftop AC units
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(x + 10, y - 5, 12, 5);
      ctx.fillRect(x + w - 24, y - 5, 12, 5);
      doorFrame(ctx, b);
      break;
    }
    case 'ops': {
      // Operations center: dark glass, server-rack windows, alert antenna.
      ctx.fillStyle = '#0a0d1f';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = rgba(accent, 0.3);
      ctx.fillRect(x, y, 1, h);
      ctx.fillRect(x + w - 1, y, 1, h);
      for (let wy = y + 12; wy < sr.y - 8; wy += 9) {
        ctx.fillStyle = '#101a33';
        ctx.fillRect(x + 8, wy, w - 16, 6);
        for (let k = x + 12; k < x + w - 12; k += 7) {
          ctx.fillStyle = rand() > 0.5 ? COLORS.green : rand() > 0.5 ? COLORS.cyan : '#2a3b6a';
          ctx.fillRect(k, wy + 2, 2, 2);
        }
      }
      // antenna with red beacon (lit live)
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(x + w - 16, y - 16, 2, 16);
      ctx.fillRect(x + w - 20, y - 8, 10, 1);
      doorFrame(ctx, b);
      break;
    }
    case 'residential': {
      // Apartment block: balconies, warm windows, an intercom by the door.
      ctx.fillStyle = '#1a1230';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      for (let wy = y + 10; wy < sr.y - 8; wy += 14) {
        // balcony slab
        ctx.fillStyle = '#2a2250';
        ctx.fillRect(x + 4, wy + 9, w - 8, 2);
        ctx.fillStyle = rgba(accent, 0.35);
        ctx.fillRect(x + 4, wy + 6, w - 8, 1);
        windows(ctx, x + 8, wy, x + w - 6, wy + 9, '#ffd27a', rand, 11, 10, 5, 6, 0.55);
      }
      doorFrame(ctx, b);
      // intercom panel
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(d.x + d.w + 3, d.y + 4, 5, 8);
      ctx.fillStyle = COLORS.green;
      ctx.fillRect(d.x + d.w + 4, d.y + 5, 3, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(d.x + d.w + 5, d.y + 9, 1, 1);
      break;
    }
    case 'tower': {
      ctx.fillStyle = PAL.wall;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PAL.wallLight;
      ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.fillRect(x, y, 1, h);
      ctx.fillRect(x + w - 1, y, 1, h);
      windows(ctx, x + 9, y + 14, x + w - 8, sr.y - 8, accent, rand);
      // helipad + mast
      ctx.fillStyle = '#1a1440';
      ctx.fillRect(cx - 14, y - 6, 28, 6);
      ctx.fillStyle = rgba(accent, 0.5);
      ctx.fillRect(cx - 10, y - 4, 20, 1);
      ctx.fillRect(cx - 1, y - 5, 2, 4);
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(cx - 1, y - 20, 2, 14);
      doorFrame(ctx, b);
      break;
    }
    case 'hq': {
      ctx.fillStyle = '#0d0a22';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = rgba(accent, 0.9);
      ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = rgba(accent, 0.25);
      for (let yy = y + 6; yy < y + h; yy += 6) ctx.fillRect(x + 3, yy, w - 6, 1);
      windows(ctx, x + 10, y + 12, x + w - 8, sr.y - 8, accent, rand, 10, 10, 5, 5, 0.45);
      doorFrame(ctx, b);
      break;
    }
  }

  signPlate(ctx, b);
}

// ------------------------------------------------------------------ minimap

export function renderMini(world: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(world, 0, 0, w, h);
  return cv;
}
