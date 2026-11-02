import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks';
import type { ParticleNetwork } from '@/components/organisms/InteractiveBackground/ParticleNetwork';
import './brain.css';

/**
 * The "brain": content nodes (synapses) living inside the 3D particle
 * network. Each node is a real <button> positioned every frame from the
 * engine's projection, so it is keyboard/screen-reader reachable and gets
 * native tap targets. Two ways to open one:
 *   - tap / click / Enter
 *   - drag it into the center drop zone (desktop and touch)
 * Opening focuses the node in the engine (it springs to the front-center,
 * the rest dims) and shows a card with the content.
 */

export const BRAIN_NODE_IDS = ['play', 'soberana', 'cloud', 'security', 'backend', 'frontend', 'galgo', 'trebet', 'contact'] as const;
export type BrainNodeId = (typeof BRAIN_NODE_IDS)[number];

const HINT_KEY = 'brain-hint-seen';
const DRAG_THRESHOLD = 8;
const LINKEDIN_URL = 'https://www.linkedin.com/in/david-vargas-krespokiller';
const GITHUB_URL = 'https://github.com/krespokiller';

/** Normalized slots (x, y in -1..1 of the viewport, y up). */
function layoutSlots(width: number, height: number): Float32Array {
  const n = BRAIN_NODE_IDS.length;
  const out = new Float32Array(n * 2);
  if (width >= 760 && width > height * 0.9) {
    // Ring around the hero text, starting at the top and skipping nothing:
    // the hero block sits well inside rx/ry.
    // Keep labels clear of the navbar (56px) and the camera parallax (~6%).
    const rx = 0.86; // labels are clamped to a 56px margin by the projection
    const ry = Math.min(0.62, (height / 2 - 110) / (height / 2));
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i / n) * Math.PI * 2;
      out[i * 2] = Math.cos(a) * rx;
      out[i * 2 + 1] = Math.sin(a) * ry;
    }
    return out;
  }
  // Narrow: two bands above and below the hero text block.
  const topMax = (height / 2 - 100) / (height / 2);
  const slots: [number, number][] = [
    [0, topMax],
    [-0.6, topMax - 0.14],
    [0.6, topMax - 0.14],
    [-0.3, topMax - 0.25],
    [0.3, topMax - 0.25],
    [-0.55, -0.57],
    [0.55, -0.57],
    [-0.25, -0.73],
    [0.3, -0.73],
  ];
  for (let i = 0; i < n; i++) {
    out[i * 2] = slots[i][0];
    out[i * 2 + 1] = slots[i][1];
  }
  return out;
}

interface BrainProps {
  network: ParticleNetwork | null;
  /** Opens the playable resume (host owns the transition). */
  onPlay: () => void;
  /** True while the game shell is not idle; the brain stays quiet then. */
  suspended: boolean;
}

export const Brain: React.FC<BrainProps> = ({ network, onPlay, suspended }) => {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState<BrainNodeId | null>(null);
  const [dragging, setDragging] = useState<{ id: BrainNodeId; inZone: boolean } | null>(null);
  const [hintSeen, setHintSeen] = useState(true);
  const [heroVisible, setHeroVisible] = useState(true);
  const [touch, setTouch] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ id: BrainNodeId; index: number; pointerId: number; x0: number; y0: number; moved: boolean; x: number; y: number } | null>(null);
  const activeRef = useRef<BrainNodeId | null>(null);
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

  // Projection → DOM transforms (no React state per frame).
  useEffect(() => {
    if (!network) return;
    const apply = () => {
      network.setSynapses(layoutSlots(window.innerWidth, window.innerHeight), (screen) => {
        const w = window.innerWidth;
        for (let i = 0; i < BRAIN_NODE_IDS.length; i++) {
          const el = nodeRefs.current[i];
          if (!el) continue;
          const x = Math.min(w - 56, Math.max(56, screen[i * 3]));
          const y = screen[i * 3 + 1];
          const depth = screen[i * 3 + 2];
          const scale = 0.85 + depth * 0.35;
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
    (id: BrainNodeId) => {
      if (suspended) return;
      const index = BRAIN_NODE_IDS.indexOf(id);
      network?.focusSynapse(index);
      setActive(id);
      markHint();
    },
    [markHint, network, suspended],
  );

  const close = useCallback(() => {
    network?.focusSynapse(-1);
    setActive(null);
  }, [network]);

  // Close with Escape; close when the game opens.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);
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
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    if (!d.moved) return; // a plain click: onClick handles it
    network?.endGrab();
    setDragging(null);
    const inZone = e.type !== 'pointercancel' && Math.hypot(d.x - window.innerWidth / 2, d.y - window.innerHeight / 2) < zoneRadius();
    if (inZone) open(d.id);
    // Suppress the click that follows a drag release.
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
  };
  const suppressClick = useRef(false);
  const onClick = (id: BrainNodeId) => () => {
    if (suppressClick.current) return;
    if (activeRef.current === id) close();
    else open(id);
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

  const nodes = useMemo(() => BRAIN_NODE_IDS.map((id) => ({ id, label: t(`brain.nodes.${id}.label`) })), [t]);
  const hidden = !heroVisible || suspended;
  const activeIndex = active ? BRAIN_NODE_IDS.indexOf(active) : -1;

  return (
    <div ref={rootRef} className={`brain${hidden ? ' brain-hidden' : ''}${reducedMotion ? ' brain-static' : ''}`} aria-hidden={hidden ? 'true' : undefined}>
      <div className="brain-nodes" role="group" aria-label={t('brain.hint')}>
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
            <i aria-hidden="true" />
            <span>{n.label}</span>
          </button>
        ))}
      </div>

      {/* Drop zone: shown only while dragging */}
      <div className={`brain-zone${dragging ? ' on' : ''}${dragging?.inZone ? ' hot' : ''}`} aria-hidden="true">
        <span>{t('brain.dropHere')}</span>
      </div>

      {/* First-visit hint */}
      {!hintSeen && !active && (
        <p className="brain-hint" role="note">
          <span aria-hidden="true">{touch ? '◎' : '✥'}</span> {touch || reducedMotion ? t('brain.hintShort') : t('brain.hint')}
        </p>
      )}

      {/* Card */}
      {active && (
        <div className="brain-card-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
          <section className="brain-card" role="dialog" aria-modal="false" aria-labelledby="brain-card-title">
            <p className="kicker">{t(`brain.nodes.${active}.label`)}</p>
            <h3 id="brain-card-title">{t(`brain.nodes.${active}.title`)}</h3>
            <p className="body">{t(`brain.nodes.${active}.body`)}</p>
            <div className="row">
              {active === 'play' ? (
                <>
                  <button type="button" className="brain-btn primary" onClick={onPlay} autoFocus>
                    ▶ {t('brain.nodes.play.cta')}
                  </button>
                  <button type="button" className="brain-btn" onClick={close}>
                    {t('brain.nodes.play.alt')}
                  </button>
                </>
              ) : active === 'contact' ? (
                <>
                  <a className="brain-btn primary" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                    LinkedIn ↗
                  </a>
                  <a className="brain-btn" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    GitHub ↗
                  </a>
                  <button type="button" className="brain-btn" onClick={close}>
                    {t('brain.close')}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="brain-btn primary" onClick={() => scrollTo(t(`brain.nodes.${active}.target`))} autoFocus>
                    {t('brain.goTo')} ↓
                  </button>
                  <button type="button" className="brain-btn" onClick={close}>
                    {t('brain.close')}
                  </button>
                </>
              )}
            </div>
            <button type="button" className="brain-x" onClick={close} aria-label={t('brain.close')}>
              ✕
            </button>
          </section>
        </div>
      )}
    </div>
  );
};
