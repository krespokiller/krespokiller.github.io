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
 * Interactive elements the grab interaction must never hijack — kept as
 * defense-in-depth: page content is pointer-transparent (see .layer-content
 * in index.css), so these targets normally never receive a pointerdown, but
 * if one ever does, grabbing must still yield to it. Text-bearing elements
 * are deliberately NOT guarded: grabbing behind text is the point of the
 * pointer-transparent layer (text selection is knowingly disabled).
 */
const GRAB_BLOCKED_SELECTOR = [
  'a', 'button', 'input', 'textarea', 'select',
  '[role="button"]', '[contenteditable]',
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

    // Single dark theme: colors are read from the CSS vars once at init —
    // there is no theme switching to observe.
    network.setThemeColors(parseThemeColor('--line-color'), parseThemeColor('--node-color'));
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
      // Defense-in-depth: never hijack interactive elements, even if one
      // somehow receives the pointerdown despite the transparent layer.
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
  }, [syncLoop]);

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
