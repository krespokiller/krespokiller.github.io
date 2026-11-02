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
import { PROVIDER_META, TF_SHARDS, loadBest, saveBest } from './migration';
import type { Delivery, MigrationResult, Provider } from './migration';
import { MigrationPanels } from './MigrationPanels';
import './game.css';

/** Where the page should land after the game closes. */
export type ExitTarget = 'stay' | 'top' | 'work' | 'contact';

interface PlayModeProps {
  /** Fired the moment the exit animation starts (page becomes visible underneath). */
  onExitStart: (target: ExitTarget) => void;
  /** Fired once the exit animation finished: safe to unmount. */
  onExitEnd: (target: ExitTarget) => void;
  /** Durations, chosen by the host (shorter under reduced motion). */
  exitMs: number;
}

const LINKEDIN_URL = 'https://www.linkedin.com/in/david-vargas-krespokiller';
const GITHUB_URL = 'https://github.com/krespokiller';

const ACCENT: Record<DialogId, string> = {
  garage: COLORS.amber,
  tribuu: COLORS.cyan,
  loopayjs: COLORS.teal,
  loopay: COLORS.magenta,
  galgo: COLORS.green,
  trebet: COLORS.orange,
  hub: COLORS.violet,
  locked: COLORS.red,
};

interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info' | 'alert';
}

const EMPTY_HUD: HudState = {
  visited: 0,
  shards: 0,
  delivered: 0,
  carrying: false,
  hubOpen: false,
  near: null,
  combat: { phase: 'off', hp: 100, clip: 12, reserve: 24, wave: 0, kills: 0, best: 0 },
  migration: { phase: 'idle', from: null, to: null, carrying: null, steps: [], doneCount: 0, requiredCount: 10, lag: null, ttlLowered: false, seconds: 0, tf: 0, completed: 0 },
};

/** Migration UI overlays (one at a time). */
export type MigUi =
  | { kind: 'console' }
  | { kind: 'briefing'; page: number }
  | { kind: 'pick' }
  | { kind: 'card'; d: Delivery }
  | { kind: 'result'; r: MigrationResult };

/**
 * Screen phases. `leaving` is orthogonal and wins over everything: once the
 * exit animation starts no input is accepted.
 */
type Phase = 'boot' | 'play';

export default function PlayMode({ onExitStart, onExitEnd, exitMs }: PlayModeProps) {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('es') ? 'es' : 'en';
  const text = GAME_TEXT[lang];
  const reducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<Phase>('boot');
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [dialog, setDialog] = useState<{ id: DialogId; page: number } | null>(null);
  const [mig, setMig] = useState<MigUi | null>(null);
  const [pair, setPair] = useState<{ from: Provider; to: Provider }>({ from: 'aws', to: 'azure' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [touch, setTouch] = useState(false);
  const [joy, setJoy] = useState<{ bx: number; by: number; kx: number; ky: number } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const textRef = useRef(text);
  const leavingRef = useRef(false);
  const toastId = useRef(0);
  const pendingResult = useRef<MigrationResult | null>(null);
  const timers = useRef<number[]>([]);
  textRef.current = text;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const pushToast = useCallback(
    (msg: string, tone: Toast['tone'] = 'info') => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-2), { id, text: msg, tone }]);
      later(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
    },
    [later],
  );

  const handleEvent = useCallback(
    (e: GameEvent) => {
      if (leavingRef.current) return;
      const tx = textRef.current.toast;
      const cx = textRef.current.combat;
      switch (e.k) {
        case 'dialog':
          setDialog({ id: e.id, page: 0 });
          break;
        case 'shard':
          pushToast(tx.shard(e.label), 'good');
          break;
        case 'district':
          pushToast(tx.district(e.n, DISTRICTS.length), 'good');
          break;
        case 'hit':
          pushToast(textRef.current.migration.toast.dropped, 'bad');
          break;
        case 'migration': {
          const m = e.e;
          const mt = textRef.current.migration;
          if (m.k === 'console') setMig({ kind: 'console' });
          else if (m.k === 'pick') setMig({ kind: 'pick' });
          else if (m.k === 'goConsole') pushToast(mt.toast.goConsole, 'info');
          else if (m.k === 'picked') pushToast(mt.toast.picked(mt.steps[m.step].title), 'info');
          else if (m.k === 'delivered') setMig({ kind: 'card', d: m.d });
          else if (m.k === 'done') {
            saveBest(m.r);
            pendingResult.current = m.r;
          } else if (m.k === 'tf') pushToast(mt.toast.tf(m.n, TF_SHARDS), 'good');
          else if (m.k === 'replicaReady') pushToast(mt.toast.replicaReady, 'good');
          break;
        }
        case 'carrying':
          pushToast(tx.carrying, 'info');
          break;
        case 'allDone':
          pushToast(tx.allDone, 'good');
          break;
        case 'combat': {
          const c = e.e;
          if (c.k === 'combatPhase') {
            if (c.phase === 'closing') pushToast(cx.lockdown, 'alert');
            if (c.phase === 'opening') pushToast(cx.doorsOpen, 'good');
            if (c.phase !== 'fight') gameRef.current?.setHoldFire(false);
          } else if (c.k === 'wave') pushToast(cx.waveToast(c.n), 'alert');
          else if (c.k === 'ammoEmpty') pushToast(cx.ammoEmpty, 'bad');
          else if (c.k === 'ammoPickup') pushToast(cx.ammoPickup(c.n), 'good');
          else if (c.k === 'hurt') {
            // Restart the CSS shake without touching the canvas element
            // (re-keying the stage would detach the engine's canvas).
            const st = stageRef.current;
            if (st) {
              st.classList.remove('pm-shake');
              void st.offsetWidth;
              st.classList.add('pm-shake');
            }
          }
          break;
        }
      }
    },
    [pushToast],
  );

  // Mount: engine, sizing, page isolation (inert + no scroll), focus.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
    const game = new Game(canvas, miniRef.current, { onHud: setHud, onEvent: handleEvent }, reducedMotion, isTouch);
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
    setTouch(isTouch);
    rootRef.current?.focus();

    const pendingTimers = timers.current;
    return () => {
      window.removeEventListener('resize', resize);
      game.destroy();
      gameRef.current = null;
      pendingTimers.forEach((id) => window.clearTimeout(id));
      pendingTimers.length = 0;
      document.body.style.overflow = prevOverflow;
      appRoot?.removeAttribute('inert');
      window.dispatchEvent(new CustomEvent('playmode', { detail: { open: false } }));
      previouslyFocused?.focus?.();
    };
    // The engine is created once per mount; language/motion changes mid-game
    // only affect DOM text, which re-renders from props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gameplay runs only on the play screen, with no dialog, and not while leaving.
  useEffect(() => {
    gameRef.current?.setPaused(phase !== 'play' || dialog !== null || mig !== null || leaving);
  }, [phase, dialog, mig, leaving]);

  // ---- exit (single entry point; guarded)
  const requestExit = useCallback(
    (target: ExitTarget) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      setLeaving(true);
      setDialog(null);
      setMig(null);
      setJoy(null);
      gameRef.current?.setHoldFire(false);
      gameRef.current?.setJoystick(0, 0);
      // Page becomes visible underneath right away so the host can scroll it
      // into place behind the closing veil.
      document.getElementById('root')?.removeAttribute('inert');
      onExitStart(target);
      later(() => onExitEnd(target), exitMs);
    },
    [exitMs, later, onExitEnd, onExitStart],
  );

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

  // ---- combat (guarded transitions)
  const combatPhase = hud.combat.phase;
  const canEnterCombat = phase === 'play' && !dialog && !mig && !leaving && combatPhase === 'off';
  const canLeaveCombat = phase === 'play' && !leaving && (combatPhase === 'fight' || combatPhase === 'closing');

  const enterCombat = useCallback(() => {
    if (!gameRef.current || leavingRef.current) return;
    gameRef.current.startCombat();
  }, []);
  const leaveCombat = useCallback(() => {
    if (!gameRef.current || leavingRef.current) return;
    gameRef.current.stopCombat();
  }, []);

  const start = useCallback(
    (combat: boolean) => {
      if (leavingRef.current || phase !== 'boot') return;
      setPhase('play');
      const game = gameRef.current;
      if (game) {
        // Unpause synchronously so the combat transition can begin this frame;
        // the effect above keeps the flag consistent afterwards.
        game.setPaused(false);
        if (combat) game.startCombat();
      }
      pushToast(combat ? text.combat.lockdown : text.hud.hint, combat ? 'alert' : 'info');
      rootRef.current?.focus();
    },
    [phase, pushToast, text],
  );

  const restartToBoot = useCallback(() => {
    if (leavingRef.current) return;
    const game = gameRef.current;
    if (!game) return;
    game.setPaused(true);
    game.restart();
    setDialog(null);
    setMig(null);
    setPhase('boot');
  }, []);

  // ---- migration UI handlers (all guarded by the engine's own rules)
  const closeMig = useCallback(() => {
    setMig((m) => {
      if (m?.kind === 'card' && pendingResult.current) {
        const r = pendingResult.current;
        pendingResult.current = null;
        return { kind: 'result', r };
      }
      return null;
    });
  }, []);
  const startMigration = useCallback(() => {
    const game = gameRef.current;
    if (!game || leavingRef.current || pair.from === pair.to) return;
    if (game.startMigration(pair.from, pair.to)) setMig({ kind: 'briefing', page: 0 });
  }, [pair]);
  const takeStep = useCallback((id: Parameters<Game['pickStep']>[0]) => {
    if (gameRef.current?.pickStep(id)) setMig(null);
  }, []);
  const advanceMig = useCallback(() => {
    setMig((m) => {
      if (!m) return m;
      if (m.kind === 'briefing') return m.page + 1 < textRef.current.migration.briefing.steps.length ? { ...m, page: m.page + 1 } : null;
      if (m.kind === 'card') {
        const r = pendingResult.current;
        if (r) {
          pendingResult.current = null;
          return { kind: 'result', r };
        }
        return null;
      }
      return m;
    });
  }, []);

  // Keyboard: ESC (back out), E/Space/Enter (advance dialog), C (toggle combat).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (leavingRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        if (dialog) closeDialog();
        else if (mig) closeMig();
        else if (combatPhase === 'dead') return; // the menu owns the choices
        else requestExit('stay');
        return;
      }
      if (mig && !e.repeat && (mig.kind === 'briefing' || mig.kind === 'card')) {
        const onControl = e.target instanceof Element && e.target.closest('button, a') !== null;
        if (e.code === 'KeyE' || ((e.code === 'Space' || e.code === 'Enter') && !onControl)) {
          e.preventDefault();
          advanceMig();
        }
        return;
      }
      if (e.code === 'KeyC' && !e.repeat && phase === 'play' && !dialog && !mig) {
        e.preventDefault();
        if (combatPhase === 'off') enterCombat();
        else if (combatPhase === 'fight' || combatPhase === 'closing') leaveCombat();
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
  }, [dialog, mig, advance, advanceMig, closeDialog, closeMig, requestExit, combatPhase, phase, enterCombat, leaveCombat]);

  // ---- mouse aim + click to shoot (desktop)
  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || leaving) return;
    gameRef.current?.aimAt(e.clientX, e.clientY);
  };
  const onStageDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || leaving || phase !== 'play' || dialog || mig) return;
    const game = gameRef.current;
    if (!game) return;
    game.aimAt(e.clientX, e.clientY);
    if (combatPhase === 'fight') {
      game.setHoldFire(true);
      const up = () => {
        game.setHoldFire(false);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }
  };

  // ---- touch joystick (floating, left part of the screen)
  const joyId = useRef<number | null>(null);
  const onJoyDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (joyId.current !== null || leaving) return;
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
  const c = text.combat;
  const districtsDone = hud.visited >= DISTRICTS.length;
  const shardsDone = hud.shards >= SHARDS.length;
  const migrationDone = hud.delivered >= MIGRATION_GOAL;
  const accent = dialog ? ACCENT[dialog.id] : COLORS.cyan;
  const isLast = dialog && dialogContent ? dialog.page + 1 >= dialogContent.pages.length : false;
  const nearName = hud.near ? text.names[hud.near] : null;
  const inCombat = combatPhase !== 'off';
  const isDead = combatPhase === 'dead';
  const showTouchControls = phase === 'play' && !dialog && !mig && touch && !isDead && !leaving;
  const migRun = hud.migration.phase === 'run';
  const hpPct = Math.max(0, Math.min(100, hud.combat.hp));

  const ui = (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={text.boot.kicker}
      className={`pm-root${reducedMotion ? ' pm-reduced' : ''}${leaving ? ' pm-exit' : ' pm-enter'}${inCombat ? ' pm-combat' : ''}`}
    >
      <div
        ref={stageRef}
        className="pm-stage"
        aria-hidden="true"
        onPointerMove={onStageMove}
        onPointerDown={onStageDown}
      >
        <canvas ref={canvasRef} className="pm-canvas" />
      </div>
      <div className="pm-crt" aria-hidden="true" />

      {/* Top bar */}
      <div className="pm-top">
        {inCombat ? (
          <section className="pm-panel pm-combat-hud" aria-label={c.enter}>
            <div className="pm-hp">
              <span>{c.hp}</span>
              <i>
                <b style={{ width: `${hpPct}%` }} />
              </i>
            </div>
            <ul>
              <li>
                {c.ammo} <b>{hud.combat.clip}</b>
                <small>/{hud.combat.reserve}</small>
              </li>
              <li>
                {c.wave} <b>{hud.combat.wave}</b>
              </li>
              <li>
                {c.kills} <b>{hud.combat.kills}</b>
              </li>
            </ul>
          </section>
        ) : (
          <section className="pm-panel pm-objectives" aria-label={t.objectives}>
            <h2>{t.objectives}</h2>
            <ul>
              <li className={districtsDone ? 'done' : ''}>
                <span>{districtsDone ? '✓' : '▢'}</span> {t.districts}{' '}
                <b>
                  {hud.visited}/{DISTRICTS.length}
                </b>
              </li>
              <li className={shardsDone ? 'done' : ''}>
                <span>{shardsDone ? '✓' : '▢'}</span> {t.shards}{' '}
                <b>
                  {hud.shards}/{SHARDS.length}
                </b>
              </li>
              <li className={migrationDone ? 'done' : ''}>
                <span>{migrationDone ? '✓' : '▢'}</span> {t.migration}{' '}
                <b>
                  {Math.min(hud.delivered, MIGRATION_GOAL)}/{MIGRATION_GOAL}
                </b>
              </li>
            </ul>
            {migRun && hud.migration.from && hud.migration.to ? (
              <div className="pm-mig-strip">
                <div className="pair">
                  <b style={{ color: PROVIDER_META[hud.migration.from].color }}>{PROVIDER_META[hud.migration.from].name}</b>
                  <span>→</span>
                  <b style={{ color: PROVIDER_META[hud.migration.to].color }}>{PROVIDER_META[hud.migration.to].name}</b>
                  <em>{hud.migration.seconds}s</em>
                </div>
                <ul>
                  <li>
                    {text.migration.hud.pieces} <b>{hud.migration.doneCount}/{hud.migration.requiredCount}</b>
                  </li>
                  <li>
                    {text.migration.hud.ttl} <b className={hud.migration.ttlLowered ? 'ok' : 'warn'}>{hud.migration.ttlLowered ? text.migration.hud.ttlOk : text.migration.hud.ttlNo}</b>
                  </li>
                  <li>
                    {text.migration.hud.tf} <b>{hud.migration.tf}/{TF_SHARDS}</b>
                  </li>
                </ul>
                {hud.migration.lag !== null && (
                  <div className="lag">
                    <span>{text.migration.hud.lag}</span>
                    <i>
                      <b style={{ width: `${Math.round(hud.migration.lag * 100)}%` }} />
                    </i>
                  </div>
                )}
                <p>
                  {text.migration.hud.carrying}:{' '}
                  <b>{hud.migration.carrying ? text.migration.steps[hud.migration.carrying].title : text.migration.hud.none}</b>
                </p>
              </div>
            ) : (
              <p className={hud.hubOpen ? 'open' : ''}>{hud.hubOpen ? t.hubOpen : t.hubLocked}</p>
            )}
          </section>
        )}

        <div className="pm-right">
          <div className="pm-right-row">
            {phase === 'play' && !isDead && (
              <button
                type="button"
                className={`pm-btn pm-mode${inCombat ? ' danger' : ''}`}
                onClick={inCombat ? leaveCombat : enterCombat}
                disabled={inCombat ? !canLeaveCombat : !canEnterCombat}
                aria-label={inCombat ? c.leaveLabel : c.enterHint}
                title={inCombat ? c.leaveLabel : c.enterHint}
              >
                {inCombat ? c.leave : `⚔ ${c.enter}`}
              </button>
            )}
            <button type="button" className="pm-btn pm-exit-btn" onClick={() => requestExit('stay')} aria-label={t.exitLabel} disabled={leaving}>
              {t.exit} <span aria-hidden="true">✕</span>
            </button>
          </div>
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
      {phase === 'play' && !dialog && !mig && !leaving && nearName && (
        <div className="pm-prompt">
          <kbd>{touch ? t.actTouch : t.actKey}</kbd> {nearName}
        </div>
      )}
      {phase === 'play' && !dialog && !leaving && !touch && combatPhase === 'fight' && (
        <div className="pm-prompt alert">
          <kbd>{c.fireKey}</kbd> {c.fireTouch}
        </div>
      )}

      {/* Touch controls */}
      {showTouchControls && (
        <>
          <div className="pm-joy-zone" onPointerDown={onJoyDown} onPointerMove={onJoyMove} onPointerUp={onJoyUp} onPointerCancel={onJoyUp} />
          {joy && (
            <div className="pm-joy" style={{ left: joy.bx, top: joy.by }} aria-hidden="true">
              <i style={{ transform: `translate(${joy.kx - joy.bx}px, ${joy.ky - joy.by}px)` }} />
            </div>
          )}
          {combatPhase === 'fight' ? (
            <button
              type="button"
              className="pm-act fire"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                gameRef.current?.setHoldFire(true);
              }}
              onPointerUp={() => gameRef.current?.setHoldFire(false)}
              onPointerCancel={() => gameRef.current?.setHoldFire(false)}
              onLostPointerCapture={() => gameRef.current?.setHoldFire(false)}
              aria-label={c.fireTouch}
            >
              {c.fireTouch}
            </button>
          ) : (
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
          )}
        </>
      )}

      {/* Migration overlays */}
      {mig && !leaving && (
        <MigrationPanels
          ui={mig}
          text={text.migration}
          hud={hud.migration}
          pair={pair}
          onPair={setPair}
          onStart={startMigration}
          onTake={takeStep}
          onAdvance={advanceMig}
          onClose={closeMig}
          onAgain={() => setMig({ kind: 'console' })}
          best={loadBest()}
        />
      )}

      {/* Dialog */}
      {dialog && dialogContent && !leaving && (
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
                  <button type="button" className="pm-btn" onClick={() => requestExit('contact')}>
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

      {/* Death menu */}
      {isDead && !leaving && (
        <div className="pm-boot pm-dead">
          <section className="pm-panel pm-boot-card pm-dead-card">
            <p className="kicker">{c.enter}</p>
            <h1>{c.deadTitle}</h1>
            <p className="lead">{c.deadTag(hud.combat.wave, hud.combat.kills)}</p>
            <div className="pm-dead-grid">
              <button type="button" className="pm-btn pm-primary" onClick={() => gameRef.current?.revive()} autoFocus>
                ♥ {c.revive}
              </button>
              <button type="button" className="pm-btn" onClick={leaveCombat}>
                {c.toExplore}
              </button>
              <button type="button" className="pm-btn" onClick={restartToBoot}>
                {c.toBoot}
              </button>
              <button type="button" className="pm-btn" onClick={() => requestExit('top')}>
                {c.toProfile}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Boot screen */}
      {phase === 'boot' && !leaving && (
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
            <p className="controls">{touch ? c.controlsTouch : c.controlsDesktop}</p>
            <div className="row">
              <button type="button" className="pm-btn pm-primary" onClick={() => start(false)} autoFocus>
                ▶ {text.boot.start}
              </button>
              <button type="button" className="pm-btn pm-danger" onClick={() => start(true)} title={c.enterHint}>
                ⚔ {c.enter}
              </button>
              <button type="button" className="pm-btn" onClick={() => requestExit('stay')}>
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
