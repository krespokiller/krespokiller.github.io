import React, { useEffect, useRef, useCallback } from 'react';
import { ParticleNetwork } from './ParticleNetwork';
import type { ThemeColorInput } from './ParticleNetwork';

/**
 * Reads a CSS custom property from the document root and parses it as a
 * themed color. Supports rgb()/rgba() and #rgb/#rrggbb (the theme sheets
 * currently use rgba()).
 */
function parseThemeColor(name: string): ThemeColorInput {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3], a: rgbMatch[4] ? +rgbMatch[4] : 1 };
  }
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  return { r: 255, g: 255, b: 255, a: 0.08 };
}

/**
 * Elements the grab interaction must never hijack: interactive controls keep
 * their clicks, text-bearing elements keep text selection. `closest` walks
 * ancestors, so content nested inside these is covered too.
 */
const GRAB_BLOCKED_SELECTOR = [
  'a', 'button', 'input', 'textarea', 'select',
  '[role="button"]', '[contenteditable]',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span',
].join(', ');

function isGrabBlocked(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(GRAB_BLOCKED_SELECTOR) !== null;
}

/**
 * Fullscreen fixed 3D particle-network background.
 * The canvas is decorative: pointer events pass through and it is hidden
 * from assistive technology.
 */
export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<ParticleNetwork | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const hiddenTabRef = useRef(false);
  const grabActiveRef = useRef(false);

  const applyThemeColors = useCallback(() => {
    networkRef.current?.setThemeColors(parseThemeColor('--line-color'), parseThemeColor('--node-color'));
    // With the loop stopped under reduced motion, theme changes need an
    // explicit repaint to reach the canvas.
    if (reducedMotionRef.current) networkRef.current?.renderStaticFrame();
  }, []);

  /**
   * Single source of truth for the animation loop: it runs only when the
   * tab is visible and the user has not asked for reduced motion.
   * Under reduced motion a single static frame is rendered instead.
   */
  const syncLoop = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    if (reducedMotionRef.current || hiddenTabRef.current) {
      network.stop();
      if (reducedMotionRef.current) network.renderStaticFrame();
    } else {
      network.start();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const network = new ParticleNetwork(canvas);
    networkRef.current = network;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = reducedMotionQuery.matches;
    hiddenTabRef.current = document.hidden;

    applyThemeColors();
    syncLoop();

    const handleMouseMove = (event: MouseEvent) => network.setPointer(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) network.setPointer(touch.clientX, touch.clientY);
    };
    const handlePointerLeave = () => network.clearPointer();

    const handleVisibilityChange = () => {
      hiddenTabRef.current = document.hidden;
      // A hidden tab may swallow the pointerup: release rather than keep a
      // node held across the pause.
      if (document.hidden) releaseGrab();
      syncLoop();
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      // Grab is disabled under reduced motion: drop any active drag.
      releaseGrab();
      syncLoop();
    };

    // --- Grab & pull (pointer events; mouse and touch unified) ---

    const handleGrabMove = (event: PointerEvent) => {
      network.moveGrab(event.clientX, event.clientY);
    };

    const handleGrabEnd = () => releaseGrab();

    const releaseGrab = () => {
      if (!grabActiveRef.current) return;
      grabActiveRef.current = false;
      network.endGrab();
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', handleGrabMove);
      document.removeEventListener('pointerup', handleGrabEnd);
      document.removeEventListener('pointercancel', handleGrabEnd);
    };

    const handleGrabStart = (event: PointerEvent) => {
      // Reduced motion keeps the scene static: no grab, loop running or not.
      if (reducedMotionRef.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // Never hijack interactive elements or text selection.
      if (isGrabBlocked(event.target)) return;
      const index = network.pickAt(event.clientX, event.clientY);
      if (index < 0) return;
      network.beginGrab(index);
      grabActiveRef.current = true;
      document.body.style.cursor = 'grabbing';
      // Capture so the pointerup is delivered even if the drag leaves the
      // window; capture retargets events to the origin element, and they
      // still bubble up to the document listeners added below.
      try {
        (event.target as Element).setPointerCapture(event.pointerId);
      } catch {
        // Capture is best-effort; the release listeners above still apply.
      }
      document.addEventListener('pointermove', handleGrabMove);
      document.addEventListener('pointerup', handleGrabEnd);
      document.addEventListener('pointercancel', handleGrabEnd);
    };

    const handleResize = () => {
      if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => {
        network.resize(window.innerWidth, window.innerHeight);
        if (reducedMotionRef.current) network.renderStaticFrame();
      });
    };

    const themeObserver = new MutationObserver(applyThemeColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pointerdown', handleGrabStart);
    window.addEventListener('blur', releaseGrab);
    window.addEventListener('resize', handleResize);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    return () => {
      themeObserver.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pointerdown', handleGrabStart);
      window.removeEventListener('blur', releaseGrab);
      window.removeEventListener('resize', handleResize);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      // Detach any listeners added while a drag was in progress and restore
      // the cursor before tearing the engine down.
      releaseGrab();
      if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
      network.dispose();
      networkRef.current = null;
    };
  }, [applyThemeColors, syncLoop]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
};
