/**
 * Procedural pixel art. No image assets: the world is painted once into an
 * offscreen canvas (static layer); the engine blits a window of it per frame.
 */
import { BUILDINGS, COLORS, CRATES, MAP_H, MAP_W, RACKS, TILE, T, WORLD_H, WORLD_W } from './world';
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

function rgba(hex: string, a: number): string {
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
};

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
  for (let i = 0; i < 5200; i++) {
    const x = Math.floor(rand() * WORLD_W);
    const y = Math.floor(rand() * WORLD_H);
    ctx.fillStyle = rand() > 0.5 ? 'rgba(120,90,255,0.06)' : 'rgba(0,240,255,0.04)';
    ctx.fillRect(x, y, 1, 1);
  }

  // Plaza circuit grid
  ctx.fillStyle = PAL.plazaLine;
  for (let tx = 21; tx <= 58; tx += 4) ctx.fillRect(tx * TILE, 25 * TILE, 1, (MAP_H - 25) * TILE);
  for (let ty = 25; ty < MAP_H; ty += 4) ctx.fillRect(21 * TILE, ty * TILE, 38 * TILE, 1);
  ctx.fillStyle = 'rgba(0,240,255,0.5)';
  for (let tx = 21; tx <= 58; tx += 4) for (let ty = 25; ty < MAP_H; ty += 4) ctx.fillRect(tx * TILE - 1, ty * TILE - 1, 3, 3);
  drawText(ctx, 'TERRAFORM YARD', 28 * TILE, 26 * TILE + 4, 3, 'rgba(0,240,255,0.16)');

  // Road lane dashes
  const isVRoad = (tx: number) => (tx >= 17 && tx <= 20) || (tx >= 38 && tx <= 41) || (tx >= 59 && tx <= 62);
  ctx.fillStyle = 'rgba(245,158,11,0.55)';
  for (let x = 0; x < WORLD_W; x += 20) {
    if (isVRoad(Math.floor(x / TILE)) || isVRoad(Math.floor((x + 10) / TILE))) continue;
    ctx.fillRect(x, 23 * TILE - 1, 10, 2);
  }
  for (const cx of [19 * TILE, 40 * TILE, 61 * TILE]) {
    const yMax = cx === 40 * TILE ? 21 * TILE : WORLD_H;
    for (let y = 0; y < yMax; y += 20) {
      if (y >= 21 * TILE - 4 && y < 25 * TILE) continue;
      ctx.fillRect(cx - 1, y, 2, 10);
    }
  }
  // Crosswalks
  ctx.fillStyle = 'rgba(220,220,255,0.18)';
  for (const vx of [17, 38, 59]) {
    for (let i = 0; i < 4; i++) {
      ctx.fillRect((vx + i) * TILE + 2, 20 * TILE + 3, 12, 3);
      ctx.fillRect((vx + i) * TILE + 2, 25 * TILE + 8, 12, 3);
    }
  }

  // Puddles with neon reflections
  const reflect = [COLORS.cyan, COLORS.magenta, COLORS.amber];
  for (let i = 0; i < 46; i++) {
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

  // Lot clutter (dumpsters, vents)
  for (let i = 0; i < 70; i++) {
    const tx = Math.floor(rand() * MAP_W);
    const ty = Math.floor(rand() * MAP_H);
    if (tiles[ty * MAP_W + tx] !== T.LOT) continue;
    const px = tx * TILE + 2;
    const py = ty * TILE + 4;
    if (rand() > 0.5) {
      ctx.fillStyle = '#0b1f1c';
      ctx.fillRect(px, py, 10, 6);
      ctx.fillStyle = '#143b35';
      ctx.fillRect(px, py, 10, 2);
    } else {
      ctx.fillStyle = '#1b1538';
      ctx.fillRect(px, py, 8, 8);
      ctx.fillStyle = '#0a0720';
      for (let k = 0; k < 3; k++) ctx.fillRect(px + 1, py + 2 + k * 2, 6, 1);
    }
  }

  // Dock pads (provider colors are drawn live by the engine)
  for (const [tx, ty, color] of [[24, 35, COLORS.violet], [55, 35, COLORS.violet]] as const) {
    const x = tx * TILE - 8;
    const y = ty * TILE - 8;
    ctx.fillStyle = rgba(color, 0.08);
    ctx.fillRect(x - 4, y - 4, 40, 40);
    ctx.fillStyle = rgba(color, 0.55);
    ctx.fillRect(x - 4, y - 4, 40, 1);
    ctx.fillRect(x - 4, y + 35, 40, 1);
    ctx.fillRect(x - 4, y - 4, 1, 40);
    ctx.fillRect(x + 35, y - 4, 1, 40);
  }

  // Lamps
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      if (tiles[ty * MAP_W + tx] !== T.WALK) continue;
      if (!((ty === 20 || ty === 25) && tx % 7 === 3)) continue;
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

  // Cargo stacks (neutral; the engine tints and labels them per migration)
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
    const x = 40 * TILE - 12;
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

/** Sign plate rect (px). Sits right above the door so it is on screen where the player stands. */
export function signRect(b: Building): { x: number; y: number; w: number; h: number; scale: number } {
  const scale = b.sign.length > 6 ? 2 : 3;
  const plateW = Math.min(b.w * TILE - 12, textWidth(b.sign, scale) + 14);
  const plateH = scale * 5 + 8 + (b.sub ? 12 : 0);
  const doorTop = (b.y + b.h) * TILE - 19;
  return { x: Math.round(b.x * TILE + (b.w * TILE) / 2 - plateW / 2), y: doorTop - plateH - 12, w: plateW, h: plateH, scale };
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, rand: () => number) {
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const cx = x + w / 2;
  const accent = b.accent;

  glowRect(ctx, x, y, w, h, accent, 0.5);
  ctx.fillStyle = PAL.wall;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.wallLight;
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = rgba(accent, 0.9);
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = rgba(accent, 0.35);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);

  // Sign plate (above the door)
  const sr = signRect(b);
  const mainW = textWidth(b.sign, sr.scale);

  // Windows fill the facade above the sign
  const winTop = y + 14;
  const winBottom = sr.y - 8;
  const lit = [accent, '#ffd27a', '#7df9ff', '#ff7ad9'];
  for (let wy = winTop; wy < winBottom; wy += 10) {
    for (let wx = x + 9; wx < x + w - 10; wx += 9) {
      const on = rand() < 0.38;
      ctx.fillStyle = on ? rgba(lit[Math.floor(rand() * lit.length)], 0.85) : PAL.win;
      ctx.fillRect(wx, wy, 4, 5);
    }
  }
  // A few windows below the sign, flanking the door
  for (let wy = sr.y + sr.h + 5; wy < y + h - 24; wy += 10) {
    for (const wx of [x + 10, x + 19, x + w - 14, x + w - 23]) {
      const on = rand() < 0.38;
      ctx.fillStyle = on ? rgba(lit[Math.floor(rand() * lit.length)], 0.85) : PAL.win;
      ctx.fillRect(wx, wy, 4, 5);
    }
  }

  glowRect(ctx, sr.x, sr.y, sr.w, sr.h, accent, 0.8);
  ctx.fillStyle = '#07041a';
  ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
  ctx.fillStyle = rgba(accent, 0.9);
  ctx.fillRect(sr.x, sr.y, sr.w, 1);
  ctx.fillRect(sr.x, sr.y + sr.h - 1, sr.w, 1);
  drawText(ctx, b.sign, cx - mainW / 2, sr.y + 4, sr.scale, accent);
  if (b.sub) {
    const sw = textWidth(b.sub, 2);
    drawText(ctx, b.sub, cx - sw / 2, sr.y + 4 + sr.scale * 5 + 3, 2, '#ffffff');
  }

  // Roof details
  if (b.id === 'loopay') {
    ctx.fillStyle = '#2a2250';
    ctx.fillRect(cx - 1, y - 12, 2, 12);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(cx - 1, y - 14, 3, 3);
    ctx.fillStyle = rgba(accent, 0.25);
    ctx.fillRect(x + 12, y - 4, 20, 4);
    ctx.fillRect(x + w - 32, y - 4, 20, 4);
  }

  // Door
  const doorY = y + h - 19;
  if (b.id === 'garage') {
    const dw = 30;
    ctx.fillStyle = '#05030f';
    ctx.fillRect(cx - dw / 2, doorY, dw, 19);
    ctx.fillStyle = rgba(accent, 0.45);
    for (let sy = doorY + 2; sy < doorY + 19; sy += 3) ctx.fillRect(cx - dw / 2 + 1, sy, dw - 2, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(cx - dw / 2 - 1, doorY - 1, dw + 2, 1);
  } else {
    glowRect(ctx, cx - 7, doorY, 14, 19, accent, 0.9);
    ctx.fillStyle = '#05030f';
    ctx.fillRect(cx - 7, doorY, 14, 19);
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 7, doorY, 14, 1);
    ctx.fillRect(cx - 7, doorY, 1, 19);
    ctx.fillRect(cx + 6, doorY, 1, 19);
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(cx - 5, doorY + 3, 10, 13);
  }
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
