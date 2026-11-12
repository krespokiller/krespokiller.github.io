/**
 * Tiny animated preview of the pixel city for the game card (no game code
 * loaded): neon skyline, rain, a walking figure and a flickering sign.
 * ~2 KB, canvas 2D, pauses when hidden or under reduced motion.
 */
export interface GamePreview {
  stop(): void;
}

export function startGamePreview(canvas: HTMLCanvasElement, reducedMotion: boolean): GamePreview {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { stop() {} };
  const W = canvas.width;
  const H = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // Deterministic skyline
  const towers: { x: number; w: number; h: number; c: string }[] = [];
  const palette = ['#ff2bd6', '#00f0ff', '#f59e0b', '#b6ff3b', '#a78bfa'];
  let x = 0;
  let i = 0;
  while (x < W) {
    const w = 8 + ((i * 7) % 9);
    const h = 14 + ((i * 13) % 22);
    towers.push({ x, w, h, c: palette[i % palette.length] });
    x += w + 2;
    i++;
  }
  const windows: { x: number; y: number; c: string }[] = [];
  towers.forEach((t, k) => {
    for (let wy = H - 10 - t.h + 3; wy < H - 12; wy += 4) {
      for (let wx = t.x + 2; wx < t.x + t.w - 2; wx += 3) {
        if ((wx * 31 + wy * 17 + k) % 5 < 2) windows.push({ x: wx, y: wy, c: (wx + wy) % 7 === 0 ? t.c : '#ffd27a' });
      }
    }
  });
  const rain = Array.from({ length: 26 }, (_, k) => ({ x: (k * 37) % W, y: (k * 53) % H, v: 60 + (k % 5) * 14 }));

  let raf = 0;
  let last = performance.now();
  let t = 0;
  let px = -10;

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reducedMotion) t += dt;
    draw();
    if (!reducedMotion) raf = requestAnimationFrame(frame);
  };

  const draw = () => {
    ctx.fillStyle = '#07041a';
    ctx.fillRect(0, 0, W, H);
    // sky glow
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,43,214,0.12)');
    g.addColorStop(1, 'rgba(0,240,255,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // towers
    for (const tw of towers) {
      ctx.fillStyle = '#0f0b25';
      ctx.fillRect(tw.x, H - 10 - tw.h, tw.w, tw.h);
      ctx.fillStyle = tw.c;
      ctx.fillRect(tw.x, H - 10 - tw.h, tw.w, 1);
    }
    for (const w of windows) {
      ctx.fillStyle = w.c;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(w.x, w.y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // sign (flickers)
    const on = reducedMotion || Math.floor(t * 7) % 9 !== 4;
    ctx.fillStyle = on ? '#ff2bd6' : '#5a1a50';
    ctx.fillRect(W - 30, 8, 22, 7);
    ctx.fillStyle = '#07041a';
    ctx.fillRect(W - 28, 10, 18, 3);
    // road
    ctx.fillStyle = '#120e27';
    ctx.fillRect(0, H - 10, W, 10);
    ctx.fillStyle = 'rgba(245,158,11,0.6)';
    for (let rx = ((t * 20) % 12) - 12; rx < W; rx += 12) ctx.fillRect(rx, H - 5, 6, 1);
    // walker
    px = reducedMotion ? W * 0.4 : ((t * 22) % (W + 20)) - 10;
    const step = Math.floor(t * 8) % 2;
    ctx.fillStyle = '#1a1235';
    ctx.fillRect(px - 2 + step, H - 8, 2, 3);
    ctx.fillRect(px + 1 - step, H - 8, 2, 3);
    ctx.fillStyle = '#ff2bd6';
    ctx.fillRect(px - 2, H - 13, 6, 5);
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(px - 1, H - 17, 4, 4);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(px - 1, H - 16, 4, 1);
    // rain
    if (!reducedMotion) {
      ctx.fillStyle = 'rgba(150,190,255,0.35)';
      for (const d of rain) {
        d.y += d.v * dtScale;
        d.x -= d.v * 0.15 * dtScale;
        if (d.y > H) {
          d.y = -3;
          d.x = Math.random() * (W + 10);
        }
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
      }
    }
  };
  const dtScale = 1 / 60;

  raf = requestAnimationFrame(frame);
  const onVis = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (!reducedMotion) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVis);
  return {
    stop() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
