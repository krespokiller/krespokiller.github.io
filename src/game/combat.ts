/**
 * Combat mode ("LOCKDOWN"). Owned by the engine; self-contained so the
 * explore logic stays untouched.
 *
 * Phases: off → closing (doors shut) → fight → dead → (revive → fight) |
 * (opening → off). Every public method is a guarded transition: calls that
 * do not apply to the current phase are ignored, never throw.
 */
import { BUILDINGS, COLORS, MAP_H, MAP_W, T, TILE, collides } from './world';

export type CombatPhase = 'off' | 'closing' | 'fight' | 'dead' | 'opening';

export type CombatEvent =
  | { k: 'combatPhase'; phase: CombatPhase }
  | { k: 'wave'; n: number }
  | { k: 'ammoEmpty' }
  | { k: 'ammoPickup'; n: number }
  | { k: 'hurt' }
  | { k: 'dead'; wave: number; kills: number };

export interface CombatHud {
  phase: CombatPhase;
  hp: number;
  clip: number;
  reserve: number;
  wave: number;
  kills: number;
  best: number;
}

interface Zombie {
  x: number;
  y: number;
  hp: number;
  type: 0 | 1; // 0 shambler (slow, tough) · 1 runner (fast, weak)
  speed: number;
  flash: number;
  bite: number;
  spawn: number; // 0..1 rise-from-ground animation
  wob: number;
}
interface Bullet { x: number; y: number; vx: number; vy: number; life: number }
interface Drop { x: number; y: number; n: number; life: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string }

const DOOR_TIME = 0.7;
const CLIP = 12;
const START_RESERVE = 24;
const FIRE_CD = 0.14;
const BULLET_SPEED = 260;
const BULLET_LIFE = 0.9;
const MAX_HP = 100;

export class Combat {
  phase: CombatPhase = 'off';
  /** 0 = open, 1 = shut. Animates toward the phase target. */
  doors = 0;
  hp = MAX_HP;
  clip = CLIP;
  reserve = START_RESERVE;
  wave = 0;
  kills = 0;
  best = 0;
  aim = { x: 1, y: 0 };
  /** Difficulty multipliers (speed, damage). */
  diff = { speed: 1, damage: 1 };

  private zombies: Zombie[] = [];
  private bullets: Bullet[] = [];
  private drops: Drop[] = [];
  private parts: Particle[] = [];
  private spawnPoints: { x: number; y: number }[] = [];
  private queue = 0;
  private spawnTimer = 0;
  private waveTimer = 0;
  private fireCd = 0;
  private emptyCd = 0;
  private invuln = 0;
  private t = 0;
  private readonly maxZombies: number;

  constructor(
    private readonly tiles: Uint8Array,
    private readonly emit: (e: CombatEvent) => void,
    private readonly mobile: boolean,
    public reducedMotion: boolean,
  ) {
    this.maxZombies = mobile ? 10 : 18;
    for (let x = 0; x < MAP_W; x++) for (const y of [0, MAP_H - 1]) this.addSpawn(x, y);
    for (let y = 0; y < MAP_H; y++) for (const x of [0, MAP_W - 1]) this.addSpawn(x, y);
  }

  private addSpawn(tx: number, ty: number) {
    const t = this.tiles[ty * MAP_W + tx];
    if (t === T.ROAD || t === T.WALK || t === T.PLAZA) this.spawnPoints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE + 4 });
  }

  get active(): boolean {
    return this.phase !== 'off';
  }
  /** Player can move / interact with the world normally. */
  get blocksTerminals(): boolean {
    return this.phase !== 'off';
  }

  hud(): CombatHud {
    return { phase: this.phase, hp: this.hp, clip: this.clip, reserve: this.reserve, wave: this.wave, kills: this.kills, best: this.best };
  }

  // ------------------------------------------------------------ transitions

  start(): boolean {
    if (this.phase !== 'off') return false;
    this.resetRun();
    this.setPhase('closing');
    return true;
  }

  /** Back to explore: doors reopen, threats vanish. Allowed from fight/dead/closing. */
  stop(): boolean {
    if (this.phase === 'off' || this.phase === 'opening') return false;
    this.zombies = [];
    this.bullets = [];
    this.drops = [];
    this.queue = 0;
    this.setPhase('opening');
    return true;
  }

  revive(): boolean {
    if (this.phase !== 'dead') return false;
    this.hp = MAX_HP;
    this.clip = CLIP;
    if (this.reserve < CLIP) this.reserve = CLIP;
    this.invuln = 2.2;
    // Give breathing room: push nearby zombies back and stun them.
    this.zombies = this.zombies.filter((z) => Math.hypot(z.x - this.px, z.y - this.py) > 70);
    this.setPhase('fight');
    return true;
  }

  /** Hard reset (used when the whole game restarts). */
  reset(): void {
    this.resetRun();
    this.doors = 0;
    this.phase = 'off';
  }

  private resetRun() {
    this.hp = MAX_HP;
    this.clip = CLIP;
    this.reserve = START_RESERVE;
    this.wave = 0;
    this.kills = 0;
    this.zombies = [];
    this.bullets = [];
    this.drops = [];
    this.parts = [];
    this.queue = 0;
    this.spawnTimer = 0;
    this.waveTimer = 1.2;
    this.invuln = 0;
  }

  private setPhase(p: CombatPhase) {
    if (this.phase === p) return;
    this.phase = p;
    this.emit({ k: 'combatPhase', phase: p });
  }

  // ------------------------------------------------------------------ input

  setAim(dx: number, dy: number): void {
    const l = Math.hypot(dx, dy);
    if (l < 0.001) return;
    this.aim.x = dx / l;
    this.aim.y = dy / l;
  }

  fire(): void {
    if (this.phase !== 'fight' || this.fireCd > 0) return;
    if (this.clip <= 0) {
      if (this.reserve > 0) {
        this.clip = Math.min(CLIP, this.reserve);
        this.reserve -= this.clip;
        this.fireCd = 0.35; // reload
        return;
      }
      if (this.emptyCd <= 0) {
        this.emptyCd = 1.2;
        this.emit({ k: 'ammoEmpty' });
      }
      return;
    }
    this.clip -= 1;
    this.fireCd = FIRE_CD;
    const sx = this.px + this.aim.x * 5;
    const sy = this.py - 6 + this.aim.y * 5;
    this.bullets.push({ x: sx, y: sy, vx: this.aim.x * BULLET_SPEED, vy: this.aim.y * BULLET_SPEED, life: BULLET_LIFE });
    this.burst(sx, sy, 3, COLORS.cyan, 60, 0.12);
  }

  // ----------------------------------------------------------------- update

  private px = 0;
  private py = 0;

  update(dt: number, px: number, py: number): void {
    this.px = px;
    this.py = py;
    this.t += dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.emptyCd > 0) this.emptyCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    // Doors
    const target = this.phase === 'off' || this.phase === 'opening' ? 0 : 1;
    const step = dt / (this.reducedMotion ? 0.2 : DOOR_TIME);
    if (this.doors < target) this.doors = Math.min(1, this.doors + step);
    else if (this.doors > target) this.doors = Math.max(0, this.doors - step);
    if (this.phase === 'closing' && this.doors >= 1) {
      this.setPhase('fight');
      this.waveTimer = 0.8;
    }
    if (this.phase === 'opening' && this.doors <= 0) this.setPhase('off');

    this.stepParticles(dt);
    if (this.phase !== 'fight') {
      // Dead: keep zombies idle-wobbling, bullets stop.
      return;
    }

    // Waves
    if (this.zombies.length === 0 && this.queue === 0) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wave += 1;
        this.best = Math.max(this.best, this.wave);
        this.queue = 4 + this.wave * 2;
        this.spawnTimer = 0;
        this.emit({ k: 'wave', n: this.wave });
      }
    }
    if (this.queue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.zombies.length < this.maxZombies) {
        this.spawnTimer = Math.max(0.35, 1.1 - this.wave * 0.08);
        this.queue -= 1;
        this.spawnZombie();
      }
    }

    // Bullets
    for (const b of this.bullets) {
      b.life -= dt;
      const nx = b.x + b.vx * dt;
      const ny = b.y + b.vy * dt;
      if (collides(this.tiles, nx, ny + 4)) {
        b.life = 0;
        this.burst(b.x, b.y, 4, COLORS.cyan, 50, 0.2);
        continue;
      }
      b.x = nx;
      b.y = ny;
      for (const z of this.zombies) {
        if (z.spawn < 1) continue;
        if (Math.abs(z.x - b.x) < 6 && Math.abs(z.y - 6 - b.y) < 8) {
          b.life = 0;
          z.hp -= 1;
          z.flash = 0.12;
          z.x += b.vx * 0.015;
          z.y += b.vy * 0.015;
          this.burst(b.x, b.y, 5, COLORS.green, 70, 0.25);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    // Zombies
    const runner = 1.35;
    for (const z of this.zombies) {
      if (z.flash > 0) z.flash -= dt;
      if (z.bite > 0) z.bite -= dt;
      z.wob += dt * (z.type ? 12 : 6);
      if (z.spawn < 1) {
        z.spawn = Math.min(1, z.spawn + dt * (this.reducedMotion ? 5 : 1.6));
        continue;
      }
      if (z.hp <= 0) continue;
      const dx = px - z.x;
      const dy = py - z.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 7) {
        const sp = z.speed * (z.type ? runner : 1) * this.diff.speed;
        let mx = (dx / d) * sp * dt;
        let my = (dy / d) * sp * dt;
        // light separation
        for (const o of this.zombies) {
          if (o === z) continue;
          const ox = z.x - o.x;
          const oy = z.y - o.y;
          const od = Math.hypot(ox, oy);
          if (od > 0 && od < 9) {
            mx += (ox / od) * 14 * dt;
            my += (oy / od) * 14 * dt;
          }
        }
        if (!collides(this.tiles, z.x + mx, z.y)) z.x += mx;
        else if (!collides(this.tiles, z.x, z.y + Math.sign(dy || 1) * sp * dt)) z.y += Math.sign(dy || 1) * sp * dt;
        if (!collides(this.tiles, z.x, z.y + my)) z.y += my;
        else if (!collides(this.tiles, z.x + Math.sign(dx || 1) * sp * dt, z.y)) z.x += Math.sign(dx || 1) * sp * dt;
      } else if (z.bite <= 0 && this.invuln <= 0) {
        z.bite = 0.7;
        this.hp = Math.max(0, this.hp - Math.round((z.type ? 8 : 14) * this.diff.damage));
        this.burst(px, py - 6, 6, COLORS.red, 60, 0.3);
        this.emit({ k: 'hurt' });
        if (this.hp <= 0) {
          this.setPhase('dead');
          this.emit({ k: 'dead', wave: this.wave, kills: this.kills });
          return;
        }
      }
    }
    // Deaths → drops
    const dead = this.zombies.filter((z) => z.hp <= 0 && z.spawn >= 1);
    for (const z of dead) {
      this.kills += 1;
      this.burst(z.x, z.y - 6, 10, COLORS.green, 90, 0.5);
      const total = this.clip + this.reserve;
      if (total < 8 || Math.random() < 0.55) this.drops.push({ x: z.x, y: z.y, n: 6, life: 14 });
    }
    if (dead.length) this.zombies = this.zombies.filter((z) => z.hp > 0 || z.spawn < 1);

    // Drops
    for (const d of this.drops) {
      d.life -= dt;
      if (Math.hypot(d.x - px, d.y - py) < 9) {
        d.life = 0;
        this.reserve += d.n;
        this.emit({ k: 'ammoPickup', n: d.n });
        this.burst(d.x, d.y - 4, 6, COLORS.amber, 50, 0.3);
      }
    }
    this.drops = this.drops.filter((d) => d.life > 0);
  }

  private spawnZombie() {
    // Prefer points away from the player, but never block spawning.
    let best = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    for (let i = 0; i < 6; i++) {
      const c = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
      const dc = Math.hypot(c.x - this.px, c.y - this.py);
      if (dc > 140 && dc < 420) {
        best = c;
        break;
      }
    }
    const type: 0 | 1 = this.wave >= 2 && Math.random() < 0.4 ? 1 : 0;
    this.zombies.push({
      x: best.x + (Math.random() - 0.5) * 6,
      y: best.y,
      hp: type ? 2 : 4,
      type,
      speed: 26 + Math.min(this.wave, 8) * 2 + Math.random() * 6,
      flash: 0,
      bite: 0,
      spawn: 0,
      wob: Math.random() * 10,
    });
  }

  private burst(x: number, y: number, n: number, c: string, sp: number, life: number) {
    if (this.reducedMotion) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = sp * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, c });
    }
    if (this.parts.length > 160) this.parts.splice(0, this.parts.length - 160);
  }

  private stepParticles(dt: number) {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  // ------------------------------------------------------------------- draw

  /** World-space layer (called inside the camera transform). */
  drawWorld(ctx: CanvasRenderingContext2D, vt: number): void {
    if (this.doors > 0) this.drawDoors(ctx, vt);
    if (this.phase === 'off') return;

    for (const d of this.drops) {
      const blink = d.life < 3 && Math.floor(vt * 6) % 2 === 0;
      if (blink) continue;
      const bob = this.reducedMotion ? 0 : Math.round(Math.sin(vt * 5 + d.x) * 1.5);
      ctx.fillStyle = 'rgba(245,158,11,0.18)';
      ctx.fillRect(d.x - 5, d.y - 6 + bob, 10, 7);
      ctx.fillStyle = COLORS.amber;
      ctx.fillRect(d.x - 3, d.y - 5 + bob, 6, 4);
      ctx.fillStyle = '#7a4a00';
      ctx.fillRect(d.x - 3, d.y - 3 + bob, 6, 1);
      ctx.fillStyle = '#fff';
      ctx.fillRect(d.x - 2, d.y - 4 + bob, 1, 1);
    }

    for (const z of this.zombies) this.drawZombie(ctx, z, vt);

    for (const b of this.bullets) {
      ctx.fillStyle = 'rgba(0,240,255,0.35)';
      ctx.fillRect(Math.round(b.x - b.vx * 0.03), Math.round(b.y - b.vy * 0.03), 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2);
    }
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  private drawDoors(ctx: CanvasRenderingContext2D, vt: number) {
    const ease = this.doors < 0.5 ? 2 * this.doors * this.doors : 1 - Math.pow(-2 * this.doors + 2, 2) / 2;
    for (const b of BUILDINGS) {
      const cx = b.x * TILE + (b.w * TILE) / 2;
      const dy = (b.y + b.h) * TILE - 19;
      const w = b.id === 'garage' ? 30 : 14;
      const h = Math.round(19 * ease);
      if (h <= 0) continue;
      ctx.fillStyle = '#12061a';
      ctx.fillRect(cx - w / 2, dy, w, h);
      ctx.fillStyle = 'rgba(255,56,96,0.75)';
      for (let yy = dy + 2; yy < dy + h; yy += 3) ctx.fillRect(cx - w / 2 + 1, yy, w - 2, 1);
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(cx - w / 2, dy + h - 1, w, 1);
      // alarm light
      // 2 Hz: below the 3 Hz photosensitivity threshold (XAG 118).
      const on = this.reducedMotion ? true : Math.floor(vt * 2) % 2 === 0;
      ctx.fillStyle = on ? COLORS.red : '#5a1020';
      ctx.fillRect(cx - 1, dy - 5, 3, 2);
      if (on) {
        ctx.fillStyle = 'rgba(255,56,96,0.12)';
        ctx.fillRect(cx - 14, dy - 8, 30, 24);
      }
    }
  }

  private drawZombie(ctx: CanvasRenderingContext2D, z: Zombie, vt: number) {
    const x = Math.round(z.x);
    const rise = Math.round((1 - z.spawn) * 12);
    const y = Math.round(z.y);
    const sway = this.reducedMotion ? 0 : Math.round(Math.sin(z.wob) * (z.type ? 1 : 1.5));
    const body = z.flash > 0 ? '#ffffff' : z.type ? '#7dff6a' : '#3fbf5a';
    const dark = z.flash > 0 ? '#dddddd' : z.type ? '#2d8a3a' : '#1f6b2f';
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 8, y - 14, 16, 14 - rise);
    ctx.clip();
    const top = y - 11 + rise;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x - 4, y - 1, 8, 2);
    ctx.fillStyle = dark;
    ctx.fillRect(x - 3 + sway, y - 4, 2, 4);
    ctx.fillRect(x + 1 - sway, y - 4, 2, 4);
    ctx.fillStyle = body;
    ctx.fillRect(x - 3, top + 3, 6, 5);
    ctx.fillStyle = dark;
    ctx.fillRect(x - 3, top + 7, 6, 1);
    // arms stretched forward
    ctx.fillStyle = body;
    ctx.fillRect(x - 5 - sway, top + 4, 2, 1);
    ctx.fillRect(x + 3 + sway, top + 4, 2, 1);
    // head
    ctx.fillStyle = body;
    ctx.fillRect(x - 2, top, 5, 4);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(x - 1, top + 1, 1, 1);
    ctx.fillRect(x + 1, top + 1, 1, 1);
    if (z.type) {
      ctx.fillStyle = '#ff2bd6';
      ctx.fillRect(x - 2, top - 1, 5, 1);
    }
    ctx.restore();
    if (z.spawn < 1) {
      ctx.fillStyle = `rgba(182,255,59,${0.25 * (1 - z.spawn)})`;
      ctx.fillRect(x - 6, y - 2, 12, 3);
    }
    void vt;
  }

  /** Screen-space overlay (after the camera transform is restored). */
  drawOverlay(ctx: CanvasRenderingContext2D, vw: number, vh: number, vt: number): void {
    if (this.phase === 'off' && this.doors <= 0) return;
    if ((this.phase === 'closing' || this.phase === 'opening') && !this.reducedMotion) {
      // Lockdown sweep: a scan line crosses the screen with the door animation.
      const y = Math.round((this.phase === 'closing' ? this.doors : 1 - this.doors) * vh);
      ctx.fillStyle = 'rgba(255,56,96,0.35)';
      ctx.fillRect(0, y - 1, vw, 2);
      ctx.fillStyle = 'rgba(255,56,96,0.06)';
      ctx.fillRect(0, this.phase === 'closing' ? 0 : y, vw, this.phase === 'closing' ? y : vh - y);
    }
    const a = this.phase === 'dead' ? 0.35 : 0.1 + 0.08 * (this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(vt * 3));
    const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
    g.addColorStop(0, 'rgba(255,40,80,0)');
    g.addColorStop(1, `rgba(255,40,80,${a * this.doors})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    if (this.phase === 'fight' && this.invuln > 0 && Math.floor(vt * 10) % 2 === 0) {
      ctx.fillStyle = 'rgba(0,240,255,0.06)';
      ctx.fillRect(0, 0, vw, vh);
    }
  }

  get isInvulnerable(): boolean {
    return this.invuln > 0;
  }
}
