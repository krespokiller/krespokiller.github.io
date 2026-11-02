/**
 * Mobile browsers fire `resize` in bursts while the address bar collapses or
 * expands; the width never changes and the height moves by ~60–140 px.
 * Re-laying out on every one of those makes canvases and fixed layouts
 * jitter right after load. This helper calls `fn` only for meaningful
 * changes (width changed, or height changed by at least `minHeightDelta`),
 * debounced, and always once up front.
 */
export function onStableResize(fn: (width: number, height: number) => void, minHeightDelta = 160, debounceMs = 120): () => void {
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let timer = 0;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const handler = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const heightJump = Math.abs(h - lastH);
      if (w === lastW && heightJump < (coarse ? minHeightDelta : 1)) return;
      lastW = w;
      lastH = h;
      fn(w, h);
    }, debounceMs);
  };
  window.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
  };
}
