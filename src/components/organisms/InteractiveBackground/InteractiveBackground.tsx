import React, { useEffect, useRef, useCallback } from 'react';
import { INTERACTIVE_BACKGROUND_CONFIG as CONFIG } from '@/const';
import { NodeService, LineService, RenderService } from '@/services/InteractiveBackground';
import type { Point, Node, Line } from '@/models';

function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function parseColor(colorStr: string): { r: number; g: number; b: number } {
  if (!colorStr) return { r: 0, g: 0, b: 0 };
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) return { r: +match[1], g: +match[2], b: +match[3] };
  return { r: 0, g: 0, b: 0 };
}

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const rendererRef = useRef<RenderService | null>(null);
  const fadeOutTimeoutRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);

  const interactionRef = useRef<{ isActive: boolean; currentPoint: Point | null }>({
    isActive: false,
    currentPoint: null,
  });
  const linesRef = useRef<Line[]>([]);
  const colorsRef = useRef<{ line: { r: number; g: number; b: number }; node: { r: number; g: number; b: number } }>({
    line: { r: 0, g: 0, b: 0 },
    node: { r: 0, g: 0, b: 0 },
  });

  const refreshColors = useCallback(() => {
    colorsRef.current = {
      line: parseColor(getCSSVar('--line-color')),
      node: parseColor(getCSSVar('--node-color')),
    };
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new RenderService(ctx);
    }

    rendererRef.current.setColors(colorsRef.current.line, colorsRef.current.node);
    rendererRef.current.render(linesRef.current, interactionRef.current.currentPoint, interactionRef.current.isActive);
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const startFadeOut = useCallback(() => {
    if (fadeOutTimeoutRef.current) clearTimeout(fadeOutTimeoutRef.current);
    fadeOutTimeoutRef.current = setTimeout(() => {
      interactionRef.current = { isActive: false, currentPoint: null };
    }, CONFIG.FADE_OUT_DELAY);
  }, []);

  const cancelFadeOut = useCallback(() => {
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      cancelFadeOut();
      interactionRef.current = { currentPoint: { x: event.clientX, y: event.clientY }, isActive: true };
      startFadeOut();
    };

    const handleMouseLeave = () => {
      interactionRef.current = { isActive: false, currentPoint: null };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      cancelFadeOut();
      interactionRef.current = { currentPoint: { x: touch.clientX, y: touch.clientY }, isActive: true };
      startFadeOut();
    };

    const handleTouchEnd = () => {
      interactionRef.current = { isActive: false, currentPoint: null };
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [cancelFadeOut, startFadeOut]);

  const initializeNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const newNodes = NodeService.createGrid(viewportWidth, viewportHeight);
    const newLines = LineService.createConnections(newNodes);
    linesRef.current = newLines;
  }, []);

  useEffect(() => {
    initializeNetwork();

    const handleResize = () => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(initializeNetwork);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
    };
  }, [initializeNetwork]);

  useEffect(() => {
    refreshColors();
    const observer = new MutationObserver(refreshColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [refreshColors]);

  useEffect(() => {
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

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
