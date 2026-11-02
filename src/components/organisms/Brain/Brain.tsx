import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks';
import type { Experience } from '@/models';
import type { ParticleNetwork } from '@/components/organisms/InteractiveBackground/ParticleNetwork';
import { startCorePreview } from './corePreview';
import './brain.css';

/**
 * The "brain": the first screen is a constellation of career nodes living
 * inside the 3D particle network, in chronological order, around a core
 * that opens the playable resume. Each node is a real <button> positioned
 * every frame from the engine's projection (keyboard/screen-reader
 * reachable, 40px+ targets). Open one by tap/click/Enter or by dragging it
 * into the core; the node springs to the front-center, the network dims
 * and an experience panel (side drawer / bottom sheet) shows the full entry.
 */

export const BRAIN_NODE_IDS = ['garage', 'tribuu', 'loopayjs', 'galgo', 'trebet', 'loopay', 'contact'] as const;
export type BrainNodeId = (typeof BRAIN_NODE_IDS)[number];

/** Node → index in the experiences arrays (same order in EN and ES). */
const EXPERIENCE_INDEX: Record<Exclude<BrainNodeId, 'contact'>, number> = { garage: 5, tribuu: 4, loopayjs: 3, galgo: 1, trebet: 2, loopay: 0 };

const HINT_KEY = 'brain-hint-seen';
const DRAG_THRESHOLD = 8;
const LINKEDIN_URL = 'https://www.linkedin.com/in/david-vargas-krespokiller';
const GITHUB_URL = 'https://github.com/krespokiller';

/** Normalized slots (x, y in -1..1 of the viewport, y up), chronological reading order. */
function layoutSlots(width: number, height: number): Float32Array {
  const wide = width >= 760 && width > height * 0.9;
  const slots: [number, number][] = wide
    ? [
        // top-left quadrant is the signature; |x|<0.3 ∧ |y|<0.4 is the core
        [-0.7, 0.05],
        [-0.62, -0.5],
        [0.0, 0.62],
        [0.05, -0.64],
        [0.52, 0.52],
        [0.72, -0.1],
        [0.8, 0.28],
      ]
    : [
        // signature on top (≈96–190px), core pushed to 58% of the height
        [-0.5, 0.44],
        [0.5, 0.44],
        [-0.5, 0.29],
        [0.5, 0.29],
        [-0.5, -0.56],
        [0.5, -0.56],
        [0, -0.73],
      ];
  // Keep clear of the navbar (56px) and the signature block on wide screens.
  const topMax = (height / 2 - 100) / (height / 2);
  const out = new Float32Array(slots.length * 2);
  slots.forEach(([x, y], i) => {
    out[i * 2] = x;
    out[i * 2 + 1] = Math.min(y, topMax);
  });
  return out;
}

interface BrainProps {
  network: ParticleNetwork | null;
  /** Opens the playable resume (host owns the transition). */
  onPlay: () => void;
  /** Prefetch the game chunk on intent. */
  onPlayIntent: () => void;
  /** True while the game shell is not idle; the brain stays quiet then. */
  suspended: boolean;
}

export const Brain: React.FC<BrainProps> = ({ network, onPlay, onPlayIntent, suspended }) => {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState<BrainNodeId | null>(null);
  const [dragging, setDragging] = useState<{ id: BrainNodeId; inZone: boolean } | null>(null);
  const [hintSeen, setHintSeen] = useState(true);
  const [heroVisible, setHeroVisible] = useState(true);
  const [touch, setTouch] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const coreCanvas = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const drag = useRef<{ id: BrainNodeId; index: number; pointerId: number; x0: number; y0: number; moved: boolean; x: number; y: number } | null>(null);
  const activeRef = useRef<BrainNodeId | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  activeRef.current = active;

  const zoneRadius = () => Math.max(70, Math.min(window.innerWidth, window.innerHeight) * 0.16);

  useEffect(() => {
    try {
      setHintSeen(localStorage.getItem(HINT_KEY) === '1');
    } catch {
      setHintSeen(false);
    }
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Core preview animation
  useEffect(() => {
    const cv = coreCanvas.current;
    if (!cv) return;
    const preview = startCorePreview(cv, reducedMotion);
    return () => preview.stop();
  }, [reducedMotion]);

  // Projection → DOM transforms (no React state per frame).
  useEffect(() => {
    if (!network) return;
    const apply = () => {
      network.setSynapses(layoutSlots(window.innerWidth, window.innerHeight), (screen) => {
        const w = window.innerWidth;
        for (let i = 0; i < BRAIN_NODE_IDS.length; i++) {
          const el = nodeRefs.current[i];
          if (!el) continue;
          const m = w < 760 ? 92 : 100;
          const x = Math.min(w - m, Math.max(m, screen[i * 3]));
          const y = screen[i * 3 + 1];
          const depth = screen[i * 3 + 2];
          const scale = 0.9 + depth * 0.25;
          el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        }
      });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      network.setSynapses(new Float32Array(0), null);
    };
  }, [network]);

  // Hero visibility: the brain only lives on the first screen.
  useEffect(() => {
    const onScroll = () => setHeroVisible(window.scrollY < window.innerHeight * 0.55);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const markHint = useCallback(() => {
    setHintSeen(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      // storage unavailable
    }
  }, []);

  const open = useCallback(
    (id: BrainNodeId, opener?: HTMLElement | null) => {
      if (suspended) return;
      const index = BRAIN_NODE_IDS.indexOf(id);
      network?.focusSynapse(index);
      openerRef.current = opener ?? (document.activeElement as HTMLElement | null);
      setActive(id);
      markHint();
    },
    [markHint, network, suspended],
  );

  const close = useCallback(() => {
    network?.focusSynapse(-1);
    setActive(null);
    const back = openerRef.current;
    openerRef.current = null;
    window.setTimeout(() => back?.focus?.(), 0);
  }, [network]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const cur = activeRef.current;
      if (!cur) return;
      const i = BRAIN_NODE_IDS.indexOf(cur);
      const next = BRAIN_NODE_IDS[(i + dir + BRAIN_NODE_IDS.length) % BRAIN_NODE_IDS.length];
      network?.focusSynapse(BRAIN_NODE_IDS.indexOf(next));
      setActive(next);
    },
    [network],
  );

  // Panel keyboard: Esc closes, arrows step, Tab stays inside; focus moves in on open.
  useEffect(() => {
    if (!active) return;
    panelRef.current?.querySelector<HTMLElement>('.brain-x')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, a[href]'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close, step]);
  useEffect(() => {
    if (suspended && activeRef.current) close();
  }, [suspended, close]);

  // ---- drag (pointer events on the node button)
  const onPointerDown = (id: BrainNodeId, index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (suspended || activeRef.current || reducedMotion) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { id, index, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_THRESHOLD) {
      d.moved = true;
      network?.beginGrab(d.index);
      setDragging({ id: d.id, inZone: false });
    }
    if (d.moved) {
      network?.moveGrab(e.clientX, e.clientY);
      const inZone = Math.hypot(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2) < zoneRadius();
      setDragging((s) => (s && s.inZone !== inZone ? { ...s, inZone } : s));
    }
  };
  const suppressClick = useRef(false);
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    if (!d.moved) return; // a plain click: onClick handles it
    network?.endGrab();
    setDragging(null);
    const inZone = e.type !== 'pointercancel' && Math.hypot(d.x - window.innerWidth / 2, d.y - window.innerHeight / 2) < zoneRadius();
    if (inZone) open(d.id, e.currentTarget);
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
  };
  const onClick = (id: BrainNodeId) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClick.current) return;
    if (activeRef.current === id) close();
    else open(id, e.currentTarget);
  };

  // Touch: a drag on a node must not scroll the page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onTouchMove = (e: TouchEvent) => {
      if (drag.current?.moved) e.preventDefault();
    };
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => root.removeEventListener('touchmove', onTouchMove);
  }, []);

  const scrollTo = (target: string) => {
    close();
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }), 60);
  };

  const experiences = t('experiences', { returnObjects: true }) as Experience[];
  const nodes = useMemo(() => BRAIN_NODE_IDS.map((id) => ({ id, label: t(`brain.nodes.${id}.label`), sub: t(`brain.nodes.${id}.sub`) })), [t]);
  const hidden = !heroVisible || suspended;
  const activeIndex = active ? BRAIN_NODE_IDS.indexOf(active) : -1;
  const activeExp = active && active !== 'contact' ? experiences[EXPERIENCE_INDEX[active]] : null;

  return (
    <div ref={rootRef} className={`brain${hidden ? ' brain-hidden' : ''}${reducedMotion ? ' brain-static' : ''}${active ? ' brain-open' : ''}`} aria-hidden={hidden ? 'true' : undefined}>
      <div className="brain-nodes" role="group" aria-label={t('brain.timeline')}>
        {nodes.map((n, i) => (
          <button
            key={n.id}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            type="button"
            className={`syn syn-${n.id}${active === n.id ? ' syn-active' : ''}${dragging?.id === n.id ? ' syn-dragging' : ''}${activeIndex >= 0 && activeIndex !== i ? ' syn-dim' : ''}`}
            onPointerDown={onPointerDown(n.id, i)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={onClick(n.id)}
            aria-expanded={active === n.id}
            aria-haspopup="dialog"
            tabIndex={hidden ? -1 : 0}
          >
            <i aria-hidden="true">{n.id === 'contact' ? '' : i + 1}</i>
            <span>
              <b>{n.label}</b>
              <small>{n.sub}</small>
            </span>
          </button>
        ))}
      </div>

      {/* Core: the portal to the game, and the drop target for the nodes */}
      <button
        type="button"
        className={`brain-core${dragging ? ' zone' : ''}${dragging?.inZone ? ' hot' : ''}${activeIndex >= 0 ? ' dim' : ''}`}
        onClick={onPlay}
        onPointerEnter={onPlayIntent}
        onFocus={onPlayIntent}
        onTouchStart={onPlayIntent}
        aria-label={t('brain.core.aria')}
        tabIndex={hidden ? -1 : 0}
        disabled={suspended}
      >
        <span className="brain-core-ring" aria-hidden="true" />
        <canvas ref={coreCanvas} width={120} height={72} aria-hidden="true" />
        <span className="brain-core-txt">
          <b>{dragging ? t('brain.dropHere') : `▶ ${t('brain.core.label')}`}</b>
          <small>{t('brain.core.sub')}</small>
        </span>
      </button>

      {/* First-visit hint */}
      {!hintSeen && !active && (
        <p className="brain-hint" role="note">
          <span aria-hidden="true">{touch ? '◎' : '✥'}</span> {touch || reducedMotion ? t('brain.hintShort') : t('brain.hint')}
        </p>
      )}

      {/* Experience panel: side drawer (desktop) / bottom sheet (mobile) */}
      {active && (
        <div className="brain-panel-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
          <section ref={panelRef} className="brain-panel" role="dialog" aria-modal="true" aria-labelledby="brain-panel-title">
            <header>
              <p className="kicker">
                {activeIndex >= 0 && active !== 'contact' ? `${activeIndex + 1}/${BRAIN_NODE_IDS.length - 1} · ` : ''}
                {t(`brain.nodes.${active}.label`)}
              </p>
              <button type="button" className="brain-x" onClick={close} aria-label={t('brain.close')}>
                ✕
              </button>
            </header>
            {activeExp ? (
              <>
                <h3 id="brain-panel-title">{activeExp.role}</h3>
                <p className="meta">
                  {activeExp.company} · {activeExp.dates} · {activeExp.location}
                  {activeExp.note ? ` · ${activeExp.note}` : ''}
                </p>
                <ul className="bullets">
                  {activeExp.description.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {activeExp.tags && (
                  <ul className="tags" aria-label="Stack">
                    {activeExp.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <h3 id="brain-panel-title">{t('brain.contactTitle')}</h3>
                <p className="meta">{t('brain.contactBody')}</p>
                <div className="row">
                  <a className="brain-btn primary" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                    LinkedIn ↗
                  </a>
                  <a className="brain-btn" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    GitHub ↗
                  </a>
                </div>
              </>
            )}
            <footer>
              <button type="button" className="brain-btn" onClick={() => step(-1)} aria-label={t('brain.prev')}>
                ← {t('brain.prev')}
              </button>
              <button type="button" className="brain-btn link" onClick={() => scrollTo(active === 'contact' ? 'contact' : 'experience')}>
                {t('brain.readMore')}
              </button>
              <button type="button" className="brain-btn" onClick={() => step(1)} aria-label={t('brain.next')}>
                {t('brain.next')} →
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
