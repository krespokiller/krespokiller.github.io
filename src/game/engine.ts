/**
 * Game engine: input, physics, quests and drawing. Framework-agnostic —
 * React (PlayMode.tsx) only mounts it and renders the DOM HUD / dialogs.
 */
import { doorRect, drawText, renderMini, renderWorld, signRect, textWidth } from './render';
import {
  AVENUE_Y0,
  AVENUE_Y1,
  BUILDINGS,
  CARS,
  COLORS,
  DISTRICTS,
  DRONES,
  MIGRATION_GOAL,
  SHARDS,
  SPAWN,
  TERMINALS,
  TILE,
  WORLD_H,
  WORLD_W,
  buildTiles,
  carPosition,
  collides,
  dronePosition,
} from './world';
import type { ZoneId } from './world';
import { Combat } from './combat';
import { Migration, PROVIDER_META, TF_SHARDS, pieceOf } from './migration';
import type { Delivery, MigrationHud, MigrationResult, Provider, StepId } from './migration';
import type { CombatEvent, CombatHud } from './combat';

export type DialogId = 'garage' | 'tribuu' | 'loopayjs' | 'galgo' | 'trebet' | 'loopay' | 'hub' | 'locked';

export type GameEvent =
  | { k: 'dialog'; id: DialogId }
  | { k: 'shard'; label: string }
  | { k: 'district'; n: number }
  | { k: 'hit' }
  | { k: 'carrying' }
  | { k: 'migration'; e: MigrationEvent }
  | { k: 'info'; id: string }
  | { k: 'car' }
  | { k: 'allDone' }
  | { k: 'combat'; e: CombatEvent };

export type MigrationEvent =
  | { k: 'console' }
  | { k: 'pick' }
  | { k: 'picked'; step: StepId }
  | { k: 'delivered'; d: Delivery }
  | { k: 'done'; r: MigrationResult }
  | { k: 'tf'; n: number }
  | { k: 'replicaReady' }
  | { k: 'goConsole' };

export interface HudState {
  visited: number;
  shards: number;
  delivered: number;
  carrying: boolean;
  hubOpen: boolean;
  near: ZoneId | null;
  combat: CombatHud;
  migration: MigrationHud;
}

export interface GameCallbacks {
  onHud(state: HudState): void;
  onEvent(event: GameEvent): void;
}

const SPEED = 78;
const INTERACT_RADIUS = 22;
const SHARD_RADIUS = 11;
const MINI_W = 120;
const MINI_H = 72;

type Dir = 'down' | 'up' | 'left' | 'right';

interface Drop {
  x: number;
  y: number;
  v: number;
}

const hub = BUILDINGS.find((b) => b.id === 'hub')!;

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly miniCtx: CanvasRenderingContext2D | null;
  private readonly tiles = buildTiles();
  private readonly world: HTMLCanvasElement;
  private readonly miniBase: HTMLCanvasElement;

  private raf = 0;
  private last = 0;
  private running = false;
  private paused = true;

  private vw = 320;
  private vh = 180;
  private scale = 4;

  private player = { x: SPAWN.x, y: SPAWN.y, dir: 'down' as Dir, step: 0, moving: false };
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };

  /** Gameplay clock (frozen while paused) and cosmetic clock (always runs). */
  private t = 0;
  private vt = 0;

  private visited = new Set<ZoneId>();
  private shards = new Set<string>();
  readonly migration = new Migration();
  private tfSpots: { x: number; y: number; taken: boolean }[] = [];
  private lagWasPositive = false;
  private announcedDone = false;
  private invuln = 0;
  private near: ZoneId | null = null;

  private rain: Drop[] = [];
  readonly combat: Combat;
  private holdingFire = false;
  private actKey = 'KeyE';
  private fireKey = 'KeyJ';
  private fireToggle = false;
  private hudSig = '';
  private mouseAimAt = -10;
  private flicker = { building: -1, until: 0, next: 2 };
  /** Per-building door openness 0..1 (opens when the player stands at the door). */
  private doorOpen = new Float32Array(BUILDINGS.length);
  private parts: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string }[] = [];
  private camSX = -1;
  private camSY = -1;
  /** Seconds since the loop started: drives the neon power-on sequence. */
  private bootT = 0;
  private miniAcc = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    mini: HTMLCanvasElement | null,
    private readonly cb: GameCallbacks,
    private reducedMotion: boolean,
    mobile = false,
  ) {
    this.combat = new Combat(this.tiles, (e) => this.onCombatEvent(e), mobile, reducedMotion);
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.miniCtx = mini ? mini.getContext('2d') : null;
    if (mini) {
      mini.width = MINI_W;
      mini.height = MINI_H;
    }
    this.world = renderWorld(this.tiles);
    this.miniBase = renderMini(this.world, MINI_W, MINI_H);
    for (let i = 0; i < 70; i++) this.rain.push({ x: Math.random() * 600, y: Math.random() * 400, v: 160 + Math.random() * 120 });
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.emitHud();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.keys.clear();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.keys.clear();
  }

  setJoystick(x: number, y: number): void {
    this.joy.x = x;
    this.joy.y = y;
  }

  // ---------------------------------------------------------- migration API

  startMigration(from: Provider, to: Provider): boolean {
    const ok = this.migration.start(from, to);
    if (ok) {
      this.lagWasPositive = false;
      this.seedTf();
      this.emitHud();
    }
    return ok;
  }

  pickStep(step: StepId): boolean {
    const ok = this.migration.pick(step);
    if (ok) {
      this.cb.onEvent({ k: 'migration', e: { k: 'picked', step } });
      this.emitHud();
    }
    return ok;
  }

  /** Scatter .tf shards across the yard (walkable plaza tiles only). */
  private seedTf(): void {
    this.tfSpots = [];
    let guard = 0;
    while (this.tfSpots.length < TF_SHARDS && guard++ < 400) {
      const tx = 22 + Math.floor(Math.random() * 60);
      const ty = 27 + Math.floor(Math.random() * 20);
      const x = (tx + 0.5) * TILE;
      const y = (ty + 0.5) * TILE;
      if (collides(this.tiles, x, y + 3)) continue;
      if (Math.abs(tx - 24) < 3 && Math.abs(ty - 35) < 3) continue;
      if (Math.abs(tx - 76) < 3 && Math.abs(ty - 35) < 3) continue;
      if (this.tfSpots.some((p) => Math.hypot(p.x - x, p.y - y) < 48)) continue;
      this.tfSpots.push({ x, y, taken: false });
    }
  }

  // ------------------------------------------------------------ settings API

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
    this.combat.reducedMotion = v;
  }

  setKeys(actKey: string, fireKey: string): void {
    this.actKey = actKey;
    this.fireKey = fireKey;
  }

  setFireMode(toggle: boolean): void {
    this.fireToggle = toggle;
    this.holdingFire = false;
  }

  setDifficulty(speed: number, damage: number): void {
    this.combat.diff = { speed, damage };
  }

  setNoTimeLimit(v: boolean): void {
    this.migration.noTimeLimit = v;
  }

  get keys$(): { act: string; fire: string } {
    return { act: this.actKey, fire: this.fireKey };
  }

  // ------------------------------------------------------------- combat API

  startCombat(): boolean {
    if (this.paused) return false;
    const ok = this.combat.start();
    if (ok) this.emitHud();
    return ok;
  }

  stopCombat(): boolean {
    const ok = this.combat.stop();
    if (ok) this.emitHud();
    return ok;
  }

  revive(): boolean {
    const ok = this.combat.revive();
    if (ok) this.emitHud();
    return ok;
  }

  /** Full restart: explore progress, position and combat. */
  restart(): void {
    this.visited.clear();
    this.shards.clear();
    this.migration.abort();
    this.migration.completed = 0;
    this.tfSpots = [];
    this.announcedDone = false;
    this.invuln = 0;
    this.near = null;
    this.player.x = SPAWN.x;
    this.player.y = SPAWN.y;
    this.holdingFire = false;
    this.combat.reset();
    this.emitHud();
  }

  fire(): void {
    if (this.paused) return;
    this.combat.fire();
    this.emitHud();
  }

  setHoldFire(on: boolean): void {
    this.holdingFire = on;
  }

  /** Aim at a screen (CSS px) position. */
  aimAt(clientX: number, clientY: number): void {
    const wx = clientX / this.scale + this.camX;
    const wy = clientY / this.scale + this.camY;
    this.combat.setAim(wx - this.player.x, wy - (this.player.y - 6));
    this.mouseAimAt = this.vt;
  }

  private onCombatEvent(e: CombatEvent): void {
    this.cb.onEvent({ k: 'combat', e });
    if (e.k === 'combatPhase' || e.k === 'dead' || e.k === 'ammoPickup' || e.k === 'wave' || e.k === 'hurt') this.emitHud();
    if (e.k === 'combatPhase' && e.phase !== 'off' && this.near) {
      this.near = null;
      this.emitHud();
    }
  }

  resize(cssW: number, cssH: number): void {
    this.scale = cssW < 500 ? 2 : cssW < 900 ? 3 : cssW < 1700 ? 4 : 5;
    this.vw = Math.ceil(cssW / this.scale);
    this.vh = Math.ceil(cssH / this.scale);
    this.canvas.width = this.vw;
    this.canvas.height = this.vh;
    this.canvas.style.width = `${this.vw * this.scale}px`;
    this.canvas.style.height = `${this.vh * this.scale}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Dev/QA helpers. */
  terminalPos(id: ZoneId): { x: number; y: number } | null {
    const t = TERMINALS.find((q) => q.id === id);
    return t ? { x: t.x, y: t.y + 4 } : null;
  }

  shardPos(i: number): { x: number; y: number } {
    const s = SHARDS[i];
    return { x: (s.tx + 0.5) * TILE, y: (s.ty + 0.5) * TILE + 4 };
  }

  teleport(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  // -------------------------------------------------------------------- input

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const code = e.code;
    // Let focused buttons/links keep Space/Enter (their native activation).
    const onControl = e.target instanceof Element && e.target.closest('button, a, input, textarea, select') !== null;
    if (onControl && (code === 'Space' || code === 'Enter')) return;
    const isAct = code === this.actKey || code === 'Space' || code === 'Enter';
    const isFire = code === this.fireKey || isAct;
    if (MOVE_KEYS.has(code) || isAct || code === this.fireKey) e.preventDefault();
    if (this.paused) return;
    if (isFire) {
      if (this.combat.phase === 'fight') {
        if (this.fireToggle) {
          if (!e.repeat) this.holdingFire = !this.holdingFire;
        } else this.combat.fire();
      } else if (!e.repeat && isAct) this.act();
      return;
    }
    if (MOVE_KEYS.has(code)) this.keys.add(code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.holdingFire = false;
    this.joy.x = 0;
    this.joy.y = 0;
  };

  act(): void {
    if (this.paused || !this.near || this.combat.blocksTerminals) return;
    this.interact(this.near);
  }

  // ---------------------------------------------------------------- game rules

  private get hubOpen(): boolean {
    return this.visited.size >= DISTRICTS.length && this.shards.size >= SHARDS.length && this.migration.completed >= MIGRATION_GOAL;
  }

  private interact(id: ZoneId): void {
    switch (id) {
      case 'garage':
      case 'tribuu':
      case 'loopayjs':
      case 'galgo':
      case 'trebet':
      case 'loopay': {
        if (!this.visited.has(id)) {
          this.visited.add(id);
          this.cb.onEvent({ k: 'district', n: this.visited.size });
          this.checkDone();
        }
        this.cb.onEvent({ k: 'dialog', id });
        break;
      }
      case 'console': {
        this.cb.onEvent({ k: 'migration', e: { k: 'console' } });
        break;
      }
      case 'src': {
        if (this.migration.phase !== 'run') this.cb.onEvent({ k: 'migration', e: { k: 'goConsole' } });
        else if (this.migration.carrying) this.cb.onEvent({ k: 'carrying' });
        else this.cb.onEvent({ k: 'migration', e: { k: 'pick' } });
        break;
      }
      case 'dst': {
        if (this.migration.phase !== 'run') {
          this.cb.onEvent({ k: 'migration', e: { k: 'goConsole' } });
          break;
        }
        const d = this.migration.deliver();
        if (!d) {
          this.cb.onEvent({ k: 'migration', e: { k: 'pick' } });
          break;
        }
        this.cb.onEvent({ k: 'migration', e: { k: 'delivered', d } });
        if (d.completed && this.migration.lastResult) {
          this.cb.onEvent({ k: 'migration', e: { k: 'done', r: this.migration.lastResult } });
          this.checkDone();
        }
        break;
      }
      case 'hub': {
        this.cb.onEvent({ k: 'dialog', id: this.hubOpen ? 'hub' : 'locked' });
        break;
      }
      default: {
        if (id.startsWith('stack:') || id.startsWith('work:')) this.cb.onEvent({ k: 'info', id });
      }
    }
    this.emitHud();
  }

  private migSig = '';
  private emitHudIfChanged(): void {
    const h = this.migration.hud();
    const sig = `${h.phase}|${h.seconds}|${h.lag === null ? 'n' : h.lag.toFixed(2)}|${h.doneCount}|${h.tf}|${h.carrying}`;
    if (sig !== this.migSig) {
      this.migSig = sig;
      this.emitHud();
    }
  }

  private checkDone(): void {
    if (this.hubOpen && !this.announcedDone) {
      this.announcedDone = true;
      this.cb.onEvent({ k: 'allDone' });
    }
  }

  private emitHud(): void {
    this.cb.onHud({
      visited: this.visited.size,
      shards: this.shards.size,
      delivered: this.migration.completed,
      carrying: this.migration.carrying !== null,
      hubOpen: this.hubOpen,
      near: this.paused || this.combat.blocksTerminals ? null : this.near,
      combat: this.combat.hud(),
      migration: this.migration.hud(),
    });
  }

  // ------------------------------------------------------------------- update

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.lastDt = dt;
    this.vt += dt;
    if (!this.paused) this.update(dt);
    this.stepRain(dt);
    this.draw();
    this.miniAcc += dt;
    if (this.miniAcc > 0.1) {
      this.miniAcc = 0;
      this.drawMini();
    }
  };

  private update(dt: number): void {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;

    this.combat.update(dt, this.player.x, this.player.y);
    if (this.combat.active) {
      const c = this.combat;
      const sig = `${c.phase}|${c.hp}|${c.clip}|${c.reserve}|${c.wave}|${c.kills}`;
      if (sig !== this.hudSig) {
        this.hudSig = sig;
        this.emitHud();
      }
    }
    if (this.combat.phase === 'dead') {
      this.player.moving = false;
      return;
    }
    if (this.holdingFire && this.combat.phase === 'fight') this.combat.fire();

    let ix = 0;
    let iy = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iy += 1;
    ix += this.joy.x;
    iy += this.joy.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }

    const p = this.player;
    p.moving = len > 0.08;
    if (p.moving) {
      const nx = p.x + ix * SPEED * dt;
      if (!collides(this.tiles, nx, p.y)) p.x = nx;
      const ny = p.y + iy * SPEED * dt;
      if (!collides(this.tiles, p.x, ny)) p.y = ny;
      p.x = Math.max(6, Math.min(WORLD_W - 6, p.x));
      p.y = Math.max(8, Math.min(WORLD_H - 2, p.y));
      p.step += dt * 10;
      p.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : iy < 0 ? 'up' : 'down';
      // Keyboard/joystick aim unless the mouse aimed recently.
      if (this.vt - this.mouseAimAt > 1.5) this.combat.setAim(ix, iy);
    }

    const cx = p.x;
    const cy = p.y - 4;

    // Shards
    for (const s of SHARDS) {
      if (this.shards.has(s.id)) continue;
      if (Math.hypot((s.tx + 0.5) * TILE - cx, (s.ty + 0.5) * TILE - cy) <= SHARD_RADIUS) {
        this.shards.add(s.id);
        this.burst((s.tx + 0.5) * TILE, (s.ty + 0.5) * TILE, 14, COLORS.cyan, 70, 0.5);
        this.cb.onEvent({ k: 'shard', label: s.label });
        this.checkDone();
        this.emitHud();
      }
    }

    // Migration clock, replica lag and .tf shards
    if (this.migration.phase === 'run') {
      const lagBefore = this.migration.hud().lag;
      this.migration.update(dt);
      const lagAfter = this.migration.hud().lag;
      if (lagBefore !== null && lagBefore > 0) this.lagWasPositive = true;
      if (this.lagWasPositive && lagAfter === 0) {
        this.lagWasPositive = false;
        this.cb.onEvent({ k: 'migration', e: { k: 'replicaReady' } });
      }
      for (const spot of this.tfSpots) {
        if (spot.taken) continue;
        if (Math.hypot(spot.x - cx, spot.y - cy) <= SHARD_RADIUS) {
          spot.taken = true;
          this.migration.collectTf();
          this.cb.onEvent({ k: 'migration', e: { k: 'tf', n: this.migration.tf } });
        }
      }
      this.emitHudIfChanged();
    }

    // Drones only matter while a crate is on your back.
    if (this.migration.carrying !== null && this.invuln <= 0) {
      for (const d of DRONES) {
        const pos = dronePosition(d, this.t);
        if (Math.abs(pos.x - cx) < 9 && Math.abs(pos.y - cy) < 9) {
          this.migration.drop();
          this.invuln = 1.5;
          p.x = 26.5 * TILE;
          p.y = 36 * TILE;
          this.cb.onEvent({ k: 'hit' });
          this.emitHud();
          break;
        }
      }
    }

    // Cars: a hit throws you onto the nearest sidewalk (and costs the crate / some HP).
    if (this.invuln <= 0) {
      for (const c of CARS) {
        const pos = carPosition(c, this.vt);
        if (Math.abs(pos.x - cx) < 11 && Math.abs(pos.y - cy) < 7) {
          this.invuln = 1.2;
          p.y = cy < pos.y ? AVENUE_Y0 * TILE - 2 : (AVENUE_Y1 + 1) * TILE + 6;
          this.burst(cx, cy, 10, COLORS.amber, 80, 0.4);
          if (this.migration.carrying !== null) this.migration.drop();
          if (this.combat.phase === 'fight') this.combat.hp = Math.max(1, this.combat.hp - 10);
          this.cb.onEvent({ k: 'car' });
          this.emitHud();
          break;
        }
      }
    }

    // Nearest terminal (none while the city is locked down)
    let nearest: ZoneId | null = null;
    let best = this.combat.blocksTerminals ? -1 : INTERACT_RADIUS;
    for (const term of TERMINALS) {
      const dist = Math.hypot(term.x - cx, term.y - cy);
      if (dist < best) {
        best = dist;
        nearest = term.id;
      }
    }
    if (nearest !== this.near) {
      this.near = nearest;
      this.emitHud();
    }

    // Doors open while the player stands at them (sealed in combat).
    for (let i = 0; i < BUILDINGS.length; i++) {
      const b = BUILDINGS[i];
      const want = this.combat.doors > 0.01 ? 0 : Math.hypot((b.doorX + 0.5) * TILE - cx, (b.doorY + 0.5) * TILE - cy) < 26 ? 1 : 0;
      const k = this.reducedMotion ? 1 : 1 - Math.exp(-7 * dt);
      this.doorOpen[i] += (want - this.doorOpen[i]) * k;
    }

    // Neon flicker
    if (!this.reducedMotion) {
      if (this.vt > this.flicker.next) {
        this.flicker.building = Math.floor(Math.random() * BUILDINGS.length);
        this.flicker.until = this.vt + 0.12 + Math.random() * 0.15;
        this.flicker.next = this.vt + 1.5 + Math.random() * 3;
      }
    }
  }

  private stepRain(dt: number): void {
    this.bootT += dt;
    for (const q of this.parts) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.9;
      q.vy *= 0.9;
    }
    if (this.parts.length) this.parts = this.parts.filter((q) => q.life > 0);
    if (this.reducedMotion) return;
    for (const d of this.rain) {
      d.y += d.v * dt;
      d.x -= d.v * 0.18 * dt;
      if (d.y > this.vh + 4 || d.x < -4) {
        d.y = -4;
        d.x = Math.random() * (this.vw + 40);
      }
    }
  }

  private burst(x: number, y: number, n: number, c: string, sp: number, life: number): void {
    if (this.reducedMotion) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = sp * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, c });
    }
    if (this.parts.length > 200) this.parts.splice(0, this.parts.length - 200);
  }

  // --------------------------------------------------------------------- draw

  private draw(): void {
    const { ctx, vw, vh, player } = this;
    ctx.fillStyle = '#05030f';
    ctx.fillRect(0, 0, vw, vh);

    const tx = vw >= WORLD_W ? (WORLD_W - vw) / 2 : Math.max(0, Math.min(WORLD_W - vw, player.x - vw / 2));
    const ty = vh >= WORLD_H ? (WORLD_H - vh) / 2 : Math.max(0, Math.min(WORLD_H - vh, player.y - vh / 2));
    // Camera eases toward the player (snaps on the first frame and under reduced motion).
    if (this.camSX < 0 || this.reducedMotion) {
      this.camSX = tx;
      this.camSY = ty;
    } else {
      const k = 1 - Math.exp(-9 * Math.min(0.05, this.lastDt));
      this.camSX += (tx - this.camSX) * k;
      this.camSY += (ty - this.camSY) * k;
    }
    const camX = Math.round(this.camSX);
    const camY = Math.round(this.camSY);

    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.drawImage(this.world, 0, 0);

    this.drawBoot();
    this.drawFlicker();
    this.drawDoors();
    this.drawHubDoor();
    this.drawCars();
    this.drawTerminals();
    this.drawShards();
    this.drawYard();
    this.combat.drawWorld(ctx, this.vt);
    this.drawPlayer();
    this.drawParticles();
    this.drawDrones();
    ctx.restore();

    this.drawClouds();
    this.combat.drawOverlay(ctx, vw, vh, this.vt);
    this.drawRain();
    this.camX = camX;
    this.camY = camY;
  }

  private camX = 0;
  private camY = 0;
  private lastDt = 0.016;

  /** Neon power-on: during the first 1.6 s the signs flicker in, west to east. */
  private drawBoot(): void {
    if (this.reducedMotion || this.bootT > 1.8) return;
    const ctx = this.ctx;
    BUILDINGS.forEach((b, i) => {
      const start = 0.15 + i * 0.18;
      const t = this.bootT - start;
      if (t >= 0.5) return;
      const on = t > 0 && (Math.floor(t * 26) % 3 !== 0 || t > 0.4);
      if (on) return;
      const r = signRect(b);
      ctx.fillStyle = 'rgba(5,3,15,0.85)';
      ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
      const d = doorRect(b);
      ctx.fillStyle = 'rgba(5,3,15,0.6)';
      ctx.fillRect(d.x - 4, d.y + d.h, d.w + 8, 14);
    });
  }

  /** Door leaves: slide up (roll-up for the garage) as the player approaches. */
  private drawDoors(): void {
    const ctx = this.ctx;
    BUILDINGS.forEach((b, i) => {
      const d = doorRect(b);
      const open = this.doorOpen[i];
      const lit = open * 0.9;
      // lit interior behind the leaf
      ctx.fillStyle = hexA(b.accent, 0.08 + 0.22 * lit);
      ctx.fillRect(d.x + 1, d.y + 1, d.w - 2, d.h - 2);
      if (open > 0.05) {
        ctx.fillStyle = `rgba(255,220,160,${0.25 * lit})`;
        ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      }
      const leafH = Math.round((d.h - 1) * (1 - open));
      if (leafH <= 0) return;
      if (b.kind === 'garage') {
        ctx.fillStyle = '#0d0a22';
        ctx.fillRect(d.x, d.y + 1, d.w, leafH);
        ctx.fillStyle = hexA(b.accent, 0.4);
        for (let yy = d.y + 3; yy < d.y + 1 + leafH; yy += 3) ctx.fillRect(d.x + 1, yy, d.w - 2, 1);
      } else {
        ctx.fillStyle = '#09061a';
        ctx.fillRect(d.x + 1, d.y + 1, d.w - 2, leafH);
        ctx.fillStyle = hexA(b.accent, 0.3);
        ctx.fillRect(d.x + 3, d.y + 3, d.w - 6, Math.max(0, leafH - 4));
        ctx.fillStyle = hexA(b.accent, 0.9);
        ctx.fillRect(d.x + d.w - 4, d.y + Math.min(leafH - 1, 9), 1, 2);
      }
    });
    // Galgo's alert beacon (2 Hz, photosensitivity-safe)
    const galgo = BUILDINGS.find((b) => b.id === 'galgo')!;
    const on = this.reducedMotion || Math.floor(this.vt * 2) % 2 === 0;
    ctx.fillStyle = on ? COLORS.red : '#5a1020';
    ctx.fillRect((galgo.x + galgo.w) * TILE - 16, galgo.y * TILE - 18, 2, 2);
  }

  private drawCars(): void {
    const ctx = this.ctx;
    for (const c of CARS) {
      const pos = carPosition(c, this.reducedMotion ? 0 : this.vt);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      // headlight beam
      ctx.fillStyle = 'rgba(255,230,180,0.08)';
      const bx = c.dir > 0 ? x + 8 : x - 26;
      ctx.fillRect(bx, y - 4, 18, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - 8, y + 3, 16, 2);
      ctx.fillStyle = '#1a1235';
      ctx.fillRect(x - 8, y - 3, 16, 6);
      ctx.fillStyle = c.color;
      ctx.fillRect(x - 7, y - 4, 14, 1);
      ctx.fillStyle = '#0d1a30';
      ctx.fillRect(x - 4, y - 2, 8, 3);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(c.dir > 0 ? x + 7 : x - 8, y - 2, 1, 2);
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(c.dir > 0 ? x - 8 : x + 7, y - 2, 1, 2);
      ctx.fillStyle = '#05030f';
      ctx.fillRect(x - 6, y + 2, 3, 2);
      ctx.fillRect(x + 3, y + 2, 3, 2);
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const q of this.parts) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.c;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Soft clouds drifting over the city (screen space, slow parallax). */
  private drawClouds(): void {
    if (this.reducedMotion) return;
    const ctx = this.ctx;
    const t = this.vt;
    ctx.fillStyle = 'rgba(5,3,15,0.16)';
    for (let i = 0; i < 3; i++) {
      const w = 160 + i * 60;
      const x = ((t * (4 + i * 2) + i * 230 - this.camX * 0.15) % (this.vw + w + 80)) - w - 40;
      const y = 20 + i * 70 - this.camY * 0.05;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y, w / 2, 18 + i * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFlicker(): void {
    if (this.reducedMotion || this.vt > this.flicker.until || this.flicker.building < 0) return;
    const b = BUILDINGS[this.flicker.building];
    this.ctx.fillStyle = 'rgba(5,3,15,0.7)';
    const r = signRect(b);
    this.ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  private drawHubDoor(): void {
    const ctx = this.ctx;
    const cx = hub.x * TILE + (hub.w * TILE) / 2;
    const dy = (hub.y + hub.h) * TILE - 19;
    if (this.hubOpen) {
      const pulse = 0.35 + 0.25 * Math.sin(this.vt * 4);
      ctx.fillStyle = `rgba(182,255,59,${pulse})`;
      ctx.fillRect(cx - 5, dy + 3, 10, 13);
      ctx.fillStyle = 'rgba(182,255,59,0.12)';
      ctx.fillRect(cx - 12, dy - 4, 24, 32);
    } else {
      ctx.fillStyle = 'rgba(255,56,96,0.55)';
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 5, dy + 4 + i * 3, 10, 1);
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(cx - 1, dy + 8, 2, 2);
    }
  }

  private drawTerminals(): void {
    const ctx = this.ctx;
    for (const t of TERMINALS) {
      const visited = this.visited.has(t.id);
      const isNear = this.near === t.id && !this.paused;
      const pulse = 0.5 + 0.5 * Math.sin(this.vt * 4 + t.x);
      // floor ring
      ctx.fillStyle = hexA(t.accent, isNear ? 0.35 : 0.14 + 0.1 * pulse);
      ctx.fillRect(t.x - 9, t.y - 3, 18, 8);
      ctx.fillStyle = hexA(t.accent, isNear ? 0.95 : 0.55);
      ctx.fillRect(t.x - 9, t.y - 3, 18, 1);
      ctx.fillRect(t.x - 9, t.y + 4, 18, 1);
      ctx.fillRect(t.x - 9, t.y - 3, 1, 8);
      ctx.fillRect(t.x + 8, t.y - 3, 1, 8);
      // beacon
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(this.vt * 3 + t.y) * 2);
      const by = t.y - 20 + bob;
      const info = t.id.startsWith('stack:') || t.id.startsWith('work:');
      if (info) {
        ctx.fillStyle = t.accent;
        ctx.fillRect(t.x - 1, by + 1, 2, 2);
        ctx.fillRect(t.x - 1, by - 2, 2, 1);
      } else if (!visited || t.id === 'hub' || t.id === 'src' || t.id === 'dst' || t.id === 'console') {
        ctx.fillStyle = t.accent;
        ctx.fillRect(t.x - 3, by, 7, 1);
        ctx.fillRect(t.x - 2, by + 1, 5, 1);
        ctx.fillRect(t.x - 1, by + 2, 3, 1);
        ctx.fillRect(t.x, by + 3, 1, 1);
      } else {
        ctx.fillStyle = COLORS.green;
        ctx.fillRect(t.x - 2, by + 2, 1, 1);
        ctx.fillRect(t.x - 1, by + 3, 1, 1);
        ctx.fillRect(t.x, by + 2, 1, 1);
        ctx.fillRect(t.x + 1, by + 1, 1, 1);
        ctx.fillRect(t.x + 2, by, 1, 1);
      }
    }
  }

  private drawShards(): void {
    const ctx = this.ctx;
    const px = this.player.x;
    const py = this.player.y - 4;
    SHARDS.forEach((s, i) => {
      if (this.shards.has(s.id)) return;
      const x = (s.tx + 0.5) * TILE;
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(this.vt * 3 + i) * 2);
      const y = (s.ty + 0.5) * TILE + bob;
      const glow = 0.12 + 0.08 * Math.sin(this.vt * 5 + i);
      ctx.fillStyle = `rgba(0,240,255,${glow})`;
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.fillStyle = COLORS.cyan;
      ctx.fillRect(x, y - 4, 1, 1);
      ctx.fillRect(x - 1, y - 3, 3, 1);
      ctx.fillRect(x - 2, y - 2, 5, 1);
      ctx.fillRect(x - 3, y - 1, 7, 1);
      ctx.fillRect(x - 2, y, 5, 1);
      ctx.fillRect(x - 1, y + 1, 3, 1);
      ctx.fillRect(x, y + 2, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1, y - 2, 2, 2);
      if (Math.hypot(x - px, y - py) < 52) {
        const label = s.label;
        drawText(ctx, label, x - textWidth(label, 1) / 2, y - 14, 1, '#ffffff');
      }
    });
  }

  /** Live yard layer: provider tints on the docks, .tf shards. */
  private drawYard(): void {
    const ctx = this.ctx;
    const m = this.migration;
    const docks: [number, number, Provider | null][] = [
      [24, 35, m.from],
      [76, 35, m.to],
    ];
    for (const [tx, ty, prov] of docks) {
      if (!prov) continue;
      const color = PROVIDER_META[prov].color;
      const x = tx * TILE - 12;
      const y = ty * TILE - 12;
      ctx.fillStyle = hexA(color, 0.12 + (this.reducedMotion ? 0 : 0.05 * Math.sin(this.vt * 3)));
      ctx.fillRect(x, y, 40, 40);
      ctx.fillStyle = hexA(color, 0.9);
      ctx.fillRect(x, y, 40, 1);
      ctx.fillRect(x, y + 39, 40, 1);
      ctx.fillRect(x, y, 1, 40);
      ctx.fillRect(x + 39, y, 1, 40);
      const name = PROVIDER_META[prov].name.toUpperCase();
      drawText(ctx, name, tx * TILE + 8 - textWidth(name, 2) / 2, y - 14, 2, color);
      // tint the cargo stack next to the dock
      const cx = tx === 24 ? 21 * TILE : 78 * TILE;
      ctx.fillStyle = hexA(color, 0.35);
      ctx.fillRect(cx, 33 * TILE, 2 * TILE, 5 * TILE);
    }
    if (m.phase === 'run') {
      this.tfSpots.forEach((spot, i) => {
        if (spot.taken) return;
        const bob = this.reducedMotion ? 0 : Math.round(Math.sin(this.vt * 3 + i) * 2);
        const y = spot.y + bob;
        ctx.fillStyle = 'rgba(167,139,250,0.18)';
        ctx.fillRect(spot.x - 7, y - 7, 14, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(spot.x - 4, y - 5, 8, 9);
        ctx.fillStyle = COLORS.violet;
        ctx.fillRect(spot.x - 3, y - 4, 6, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(spot.x - 2, y - 2, 4, 1);
        ctx.fillRect(spot.x - 2, y, 3, 1);
        drawText(ctx, '.TF', spot.x - textWidth('.TF', 1) / 2, y - 13, 1, COLORS.violet);
      });
    }
  }

  private drawDrones(): void {
    const ctx = this.ctx;
    const frame = Math.floor(this.vt * 14) % 2;
    for (const d of DRONES) {
      const pos = dronePosition(d, this.t);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      // searchlight: lights up whatever is beneath (player, zombies, ground)
      const hot = this.migration.carrying !== null || this.combat.active;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x, y + 3, x, y + 26);
      g.addColorStop(0, hot ? 'rgba(255,90,120,0.55)' : 'rgba(255,200,120,0.4)');
      g.addColorStop(1, hot ? 'rgba(255,40,80,0)' : 'rgba(255,170,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 3);
      ctx.lineTo(x + 2, y + 3);
      ctx.lineTo(x + 13, y + 26);
      ctx.lineTo(x - 13, y + 26);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // shadow + body
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x - 4, y + 9, 8, 2);
      ctx.fillStyle = '#3a2f7a';
      ctx.fillRect(x - 5, y - 2, 10, 5);
      ctx.fillStyle = '#1a1235';
      ctx.fillRect(x - 4, y - 1, 8, 3);
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(x - 1, y, 2, 2);
      ctx.fillStyle = '#6c5fd0';
      ctx.fillRect(x - 7 + frame, y - 3, 4, 1);
      ctx.fillRect(x + 3 - frame, y - 3, 4, 1);
    }
  }

  private drawPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;
    if ((this.invuln > 0 || this.combat.isInvulnerable) && Math.floor(this.vt * 12) % 2 === 0) return;
    if (this.combat.phase === 'dead') {
      // Collapsed: a flat body with a fading signal.
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(Math.round(p.x) - 6, Math.round(p.y) - 2, 12, 3);
      ctx.fillStyle = COLORS.magenta;
      ctx.fillRect(Math.round(p.x) - 5, Math.round(p.y) - 5, 10, 3);
      ctx.fillStyle = '#f2c9a0';
      ctx.fillRect(Math.round(p.x) + 5, Math.round(p.y) - 6, 4, 4);
      return;
    }
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const frame = p.moving ? Math.floor(p.step) % 4 : 0;
    const walk = frame === 1 || frame === 3 ? 1 : 0;
    const legA = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const breathe = !p.moving && !this.reducedMotion && Math.floor(this.vt * 1.5) % 2 === 1 ? 1 : 0;
    const bob = p.moving ? (walk ? -1 : 0) : breathe;

    // glow + shadow
    ctx.fillStyle = 'rgba(0,240,255,0.14)';
    ctx.fillRect(x - 7, y - 2, 14, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 4, y - 1, 8, 2);

    // legs
    ctx.fillStyle = '#1a1235';
    ctx.fillRect(x - 3 + (legA > 0 ? 1 : 0), y - 4 + (legA < 0 ? 1 : 0), 2, 4 - (legA < 0 ? 1 : 0));
    ctx.fillRect(x + 1 - (legA < 0 ? 1 : 0), y - 4 + (legA > 0 ? 1 : 0), 2, 4 - (legA > 0 ? 1 : 0));
    // jacket
    const top = y - 11 + bob;
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(x - 3, top + 3, 6, 5);
    ctx.fillStyle = '#7a1a69';
    ctx.fillRect(x - 3, top + 7, 6, 1);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(x - 3, top + 4, 1, 3);
    // arms
    ctx.fillStyle = '#e08bd0';
    ctx.fillRect(x - 4, top + 4, 1, 3);
    ctx.fillRect(x + 3, top + 4, 1, 3);
    // head
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(x - 2, top, 5, 4);
    ctx.fillStyle = '#1a1235';
    ctx.fillRect(x - 3, top - 1, 7, 2);
    if (p.dir === 'down' || p.dir === 'left' || p.dir === 'right') {
      ctx.fillStyle = COLORS.cyan;
      const vx = p.dir === 'left' ? x - 3 : p.dir === 'right' ? x : x - 2;
      ctx.fillRect(vx, top + 1, p.dir === 'down' ? 5 : 3, 2);
    } else {
      ctx.fillStyle = '#1a1235';
      ctx.fillRect(x - 2, top + 1, 5, 3);
    }
    if (this.migration.carrying !== null && this.migration.to) {
      const color = PROVIDER_META[this.migration.to].color;
      const bx = x - 4;
      const by = top - 8 + (this.reducedMotion ? 0 : Math.round(Math.sin(this.vt * 8)));
      ctx.fillStyle = hexA(color, 0.25);
      ctx.fillRect(bx - 2, by - 2, 12, 10);
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, 8, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by + 2, 8, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 1, by + 1, 2, 1);
      const label = pieceOf(this.migration.carrying).slice(0, 3);
      drawText(ctx, label, x - textWidth(label, 1) / 2, by - 8, 1, '#ffffff');
    }
  }

  private drawRain(): void {
    if (this.reducedMotion) return;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(150,190,255,0.32)';
    for (const d of this.rain) ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
  }

  private drawMini(): void {
    const m = this.miniCtx;
    if (!m) return;
    const sx = MINI_W / WORLD_W;
    const sy = MINI_H / WORLD_H;
    m.drawImage(this.miniBase, 0, 0);
    m.fillStyle = 'rgba(5,3,15,0.35)';
    m.fillRect(0, 0, MINI_W, MINI_H);
    const blink = Math.floor(this.vt * 3) % 2 === 0;
    for (const s of SHARDS) {
      if (this.shards.has(s.id)) continue;
      m.fillStyle = COLORS.cyan;
      m.fillRect(Math.round((s.tx + 0.5) * TILE * sx) - 1, Math.round((s.ty + 0.5) * TILE * sy) - 1, 2, 2);
    }
    for (const t of TERMINALS) {
      if (t.id.startsWith('stack:') || t.id.startsWith('work:')) {
        m.fillStyle = t.accent;
        m.fillRect(Math.round(t.x * sx), Math.round(t.y * sy), 1, 1);
        continue;
      }
      const order = DISTRICTS.indexOf(t.id);
      const done = t.id === 'hub' ? false : this.visited.has(t.id);
      if (t.id === 'hub' && !this.hubOpen && !blink) continue;
      m.fillStyle = t.id === 'hub' ? (this.hubOpen ? COLORS.green : COLORS.red) : done ? '#4b4470' : t.accent;
      const mx = Math.round(t.x * sx);
      const my = Math.round(t.y * sy);
      if (order >= 0) {
        m.fillRect(mx - 3, my - 7, 7, 7);
        drawText(m, String(order + 1), mx - 1, my - 6, 1, done ? '#8f87c9' : '#05030f');
      } else {
        m.fillRect(mx - 2, my - 2, 4, 4);
      }
    }
    // viewport
    m.strokeStyle = 'rgba(255,255,255,0.35)';
    m.lineWidth = 1;
    m.strokeRect(Math.round(this.camX * sx) + 0.5, Math.round(this.camY * sy) + 0.5, Math.round(this.vw * sx), Math.round(this.vh * sy));
    // player
    m.fillStyle = blink ? '#ffffff' : COLORS.magenta;
    m.fillRect(Math.round(this.player.x * sx) - 2, Math.round(this.player.y * sy) - 2, 4, 4);
  }
}

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
