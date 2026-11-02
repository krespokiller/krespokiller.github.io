import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks';
import { Game } from './engine';
import type { DialogId, GameEvent, HudState } from './engine';
import { GAME_TEXT } from './text';
import type { DialogText, Lang } from './text';
import { COLORS, DISTRICTS, MIGRATION_GOAL, SHARDS } from './world';
import './game.css';

interface PlayModeProps {
  /** Close the game and return to the page. */
  onClose: () => void;
  /** Close the game and scroll to the contact section. */
  onGoContact: () => void;
}

const LINKEDIN_URL = 'https://www.linkedin.com/in/david-vargas-krespokiller';
const GITHUB_URL = 'https://github.com/krespokiller';

const ACCENT: Record<DialogId, string> = {
  garage: COLORS.amber,
  tribuu: COLORS.cyan,
  loopay: COLORS.magenta,
  galgo: COLORS.green,
  trebet: COLORS.orange,
  dock: COLORS.aws,
  migrated: COLORS.azure,
  hub: COLORS.violet,
  locked: COLORS.red,
};

interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

const EMPTY_HUD: HudState = { visited: 0, shards: 0, delivered: 0, carrying: false, hubOpen: false, near: null };

export default function PlayMode({ onClose, onGoContact }: PlayModeProps) {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('es') ? 'es' : 'en';
  const text = GAME_TEXT[lang];
  const reducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<'boot' | 'play'>('boot');
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [dialog, setDialog] = useState<{ id: DialogId; page: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [touch, setTouch] = useState(false);
  const [joy, setJoy] = useState<{ bx: number; by: number; kx: number; ky: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const textRef = useRef(text);
  const toastId = useRef(0);
  const timers = useRef<number[]>([]);
  textRef.current = text;

  const pushToast = useCallback((msg: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, text: msg, tone }]);
    timers.current.push(
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800),
    );
  }, []);

  const handleEvent = useCallback(
    (e: GameEvent) => {
      const tx = textRef.current.toast;
      switch (e.k) {
        case 'dialog':
          gameRef.current?.setPaused(true);
          setDialog({ id: e.id, page: 0 });
          break;
        case 'shard':
          pushToast(tx.shard(e.label), 'good');
          break;
        case 'district':
          pushToast(tx.district(e.n, DISTRICTS.length), 'good');
          break;
        case 'loaded':
          pushToast(tx.loaded, 'info');
          break;
        case 'delivered':
          pushToast(tx.delivered(e.n, MIGRATION_GOAL), 'good');
          break;
        case 'hit':
          pushToast(tx.hit, 'bad');
          break;
        case 'needContainer':
          pushToast(tx.needContainer, 'info');
          break;
        case 'carrying':
          pushToast(tx.carrying, 'info');
          break;
        case 'allDone':
          pushToast(tx.allDone, 'good');
          break;
      }
    },
    [pushToast],
  );

  // Mount: engine, sizing, page isolation (inert + no scroll), focus.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas, miniRef.current, { onHud: setHud, onEvent: handleEvent }, reducedMotion);
    gameRef.current = game;
    const resize = () => game.resize(window.innerWidth, window.innerHeight);
    resize();
    window.addEventListener('resize', resize);
    game.start();

    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;

    const appRoot = document.getElementById('root');
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    appRoot?.setAttribute('inert', '');
    window.dispatchEvent(new CustomEvent('playmode', { detail: { open: true } }));
    setTouch(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700);
    rootRef.current?.focus();

    const pendingTimers = timers.current;
    return () => {
      window.removeEventListener('resize', resize);
      game.destroy();
      gameRef.current = null;
      pendingTimers.forEach((id) => window.clearTimeout(id));
      document.body.style.overflow = prevOverflow;
      appRoot?.removeAttribute('inert');
      window.dispatchEvent(new CustomEvent('playmode', { detail: { open: false } }));
      previouslyFocused?.focus?.();
    };
    // The engine is created once per mount; language/motion changes mid-game
    // only affect DOM text, which re-renders from props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gameplay is paused on the boot screen and while a dialog is open.
  useEffect(() => {
    gameRef.current?.setPaused(phase !== 'play' || dialog !== null);
  }, [phase, dialog]);

  const dialogContent: DialogText | null = useMemo(() => {
    if (!dialog) return null;
    if (dialog.id === 'locked') {
      return text.locked({
        districts: DISTRICTS.length - hud.visited,
        shards: SHARDS.length - hud.shards,
        migration: MIGRATION_GOAL - hud.delivered,
      });
    }
    return text.zones[dialog.id];
    // hud counts only matter for the locked dialog, which is re-created on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog?.id, text]);

  const advance = useCallback(() => {
    setDialog((d) => {
      if (!d || !dialogContent) return d;
      return d.page + 1 < dialogContent.pages.length ? { ...d, page: d.page + 1 } : null;
    });
  }, [dialogContent]);

  const closeDialog = useCallback(() => setDialog(null), []);

  // Keyboard: ESC (back out), E/Space/Enter (advance dialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (dialog) closeDialog();
        else onClose();
        return;
      }
      if (!dialog || e.repeat) return;
      const onControl = e.target instanceof Element && e.target.closest('button, a') !== null;
      if (e.code === 'KeyE' || ((e.code === 'Space' || e.code === 'Enter') && !onControl)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, advance, closeDialog, onClose]);

  const start = () => {
    setPhase('play');
    pushToast(text.hud.hint, 'info');
    rootRef.current?.focus();
  };

  // ---- touch joystick (floating, left half of the screen)
  const joyId = useRef<number | null>(null);
  const onJoyDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (joyId.current !== null) return;
    joyId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setJoy({ bx: e.clientX, by: e.clientY, kx: e.clientX, ky: e.clientY });
  };
  const onJoyMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyId.current) return;
    setJoy((j) => {
      if (!j) return j;
      const R = 44;
      let dx = e.clientX - j.bx;
      let dy = e.clientY - j.by;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      const dead = d < 8 ? 0 : 1;
      gameRef.current?.setJoystick((dx / R) * dead, (dy / R) * dead);
      return { ...j, kx: j.bx + dx, ky: j.by + dy };
    });
  };
  const onJoyUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyId.current) return;
    joyId.current = null;
    gameRef.current?.setJoystick(0, 0);
    setJoy(null);
  };

  const t = text.hud;
  const districtsDone = hud.visited >= DISTRICTS.length;
  const shardsDone = hud.shards >= SHARDS.length;
  const migrationDone = hud.delivered >= MIGRATION_GOAL;
  const accent = dialog ? ACCENT[dialog.id] : COLORS.cyan;
  const isLast = dialog && dialogContent ? dialog.page + 1 >= dialogContent.pages.length : false;
  const nearName = hud.near ? text.names[hud.near] : null;

  const ui = (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={text.boot.kicker}
      className={`pm-root${reducedMotion ? ' pm-reduced' : ''}`}
    >
      <div className="pm-stage" aria-hidden="true">
        <canvas ref={canvasRef} className="pm-canvas" />
      </div>
      <div className="pm-crt" aria-hidden="true" />

      {/* Top bar */}
      <div className="pm-top">
        <section className="pm-panel pm-objectives" aria-label={t.objectives}>
          <h2>{t.objectives}</h2>
          <ul>
            <li className={districtsDone ? 'done' : ''}>
              <span>{districtsDone ? '✓' : '▢'}</span> {t.districts} <b>{hud.visited}/{DISTRICTS.length}</b>
            </li>
            <li className={shardsDone ? 'done' : ''}>
              <span>{shardsDone ? '✓' : '▢'}</span> {t.shards} <b>{hud.shards}/{SHARDS.length}</b>
            </li>
            <li className={migrationDone ? 'done' : ''}>
              <span>{migrationDone ? '✓' : '▢'}</span> {t.migration} <b>{hud.delivered}/{MIGRATION_GOAL}</b>
            </li>
          </ul>
          <p className={hud.hubOpen ? 'open' : ''}>{hud.hubOpen ? t.hubOpen : t.hubLocked}</p>
        </section>

        <div className="pm-right">
          <button type="button" className="pm-btn pm-exit" onClick={onClose} aria-label={t.exitLabel}>
            {t.exit} <span aria-hidden="true">✕</span>
          </button>
          <canvas ref={miniRef} className="pm-mini" aria-hidden="true" />
        </div>
      </div>

      {/* Toasts */}
      <div className="pm-toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={`pm-toast ${x.tone}`}>
            {x.text}
          </div>
        ))}
      </div>

      {/* Interaction prompt */}
      {phase === 'play' && !dialog && nearName && (
        <div className="pm-prompt">
          <kbd>{touch ? t.actTouch : t.actKey}</kbd> {nearName}
        </div>
      )}

      {/* Touch controls */}
      {phase === 'play' && !dialog && touch && (
        <>
          <div
            className="pm-joy-zone"
            onPointerDown={onJoyDown}
            onPointerMove={onJoyMove}
            onPointerUp={onJoyUp}
            onPointerCancel={onJoyUp}
          />
          {joy && (
            <div className="pm-joy" style={{ left: joy.bx, top: joy.by }} aria-hidden="true">
              <i style={{ transform: `translate(${joy.kx - joy.bx}px, ${joy.ky - joy.by}px)` }} />
            </div>
          )}
          <button
            type="button"
            className={`pm-act${hud.near ? ' ready' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              gameRef.current?.act();
            }}
            aria-label={t.actTouch}
          >
            {t.actTouch}
          </button>
        </>
      )}

      {/* Dialog */}
      {dialog && dialogContent && (
        <div className="pm-dialog-wrap">
          <section className="pm-panel pm-dialog" style={{ ['--accent' as string]: accent }} aria-live="polite">
            <header>
              <h3>{dialogContent.title}</h3>
              <p>{dialogContent.tag}</p>
            </header>
            <p className="pm-body">{dialogContent.pages[dialog.page]}</p>
            <footer>
              <span className="pm-page">
                {dialog.page + 1}/{dialogContent.pages.length}
              </span>
              {dialog.id === 'hub' && isLast && (
                <span className="pm-links">
                  <a className="pm-btn" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                    {text.hubActions.linkedin} ↗
                  </a>
                  <a className="pm-btn" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    {text.hubActions.github} ↗
                  </a>
                  <button type="button" className="pm-btn" onClick={onGoContact}>
                    {text.hubActions.contact}
                  </button>
                </span>
              )}
              <button type="button" className="pm-btn pm-primary" onClick={advance} autoFocus>
                {isLast ? t.close : t.next}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Boot screen */}
      {phase === 'boot' && (
        <div className="pm-boot">
          <section className="pm-panel pm-boot-card">
            <p className="kicker">{text.boot.kicker}</p>
            <h1>{text.boot.title}</h1>
            <p className="lead">{text.boot.lead}</p>
            <ol>
              {text.boot.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
            <p className="controls">{touch ? text.boot.controlsTouch : text.boot.controlsDesktop}</p>
            <div className="row">
              <button type="button" className="pm-btn pm-primary" onClick={start} autoFocus>
                ▶ {text.boot.start}
              </button>
              <button type="button" className="pm-btn" onClick={onClose}>
                {text.boot.classic}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}
