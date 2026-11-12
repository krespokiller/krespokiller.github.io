import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks';
import { startGamePreview } from './gamePreview';

interface GameCardProps {
  label: string;
  note: string;
  /** Opens the playable resume (the host owns the transition). */
  onPlay: () => void;
  /** Prefetches the game chunk on intent: hover, focus or touch. */
  onIntent?: () => void;
  disabled?: boolean;
}

/**
 * Entry point to the playable resume: a live pixel-city preview on one big
 * button. The preview is a tiny standalone canvas; no game code loads until
 * the visitor shows intent. Styles: `.game-card*` in index.css.
 */
export const GameCard: React.FC<GameCardProps> = ({ label, note, onPlay, onIntent, disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preview = startGamePreview(canvas, reducedMotion);
    return () => preview.stop();
  }, [reducedMotion]);

  return (
    <button type="button" className="game-card" onClick={onPlay} onPointerEnter={onIntent} onFocus={onIntent} onTouchStart={onIntent} disabled={disabled}>
      <canvas ref={canvasRef} width={120} height={72} aria-hidden="true" />
      <span className="game-card-label">▶ {label}</span>
      <span className="game-card-note">{note}</span>
    </button>
  );
};
