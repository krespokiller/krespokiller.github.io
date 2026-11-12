import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AboutSection, ContactSection, ExperienceSection, Footer, InteractiveBackground, Navbar } from "@/components";
import { GameCard } from '@/components/molecules';
import { ICON_MAP } from '@/const/iconMap';
import { usePrefersReducedMotion } from "@/hooks";

// The game is a separate chunk: it is only fetched on intent (hover / focus /
// touch on the button) or on click, never as part of the initial page load.
const loadPlayMode = () => import('@/game/PlayMode');
const PlayMode = lazy(loadPlayMode);
type ExitTarget = import('@/game/PlayMode').ExitTarget;

/**
 * Shell state machine for the page ⇄ game handoff. Every transition is
 * guarded: a click while entering/exiting/game does nothing, and all timers
 * are owned here so an unmount can clear them.
 *
 *   page --(click, chunk ready)--> entering --(ENTER_MS)--> game
 *   game --(exit start)--> exiting --(EXIT_MS, PlayMode unmounts)--> page
 */
type Shell = 'page' | 'entering' | 'game' | 'exiting';

/** Tools shown as a logo strip in the hero; each must exist in ICON_MAP. */
const HERO_STACK = ['TypeScript', 'NestJS', 'React', 'PostgreSQL', 'Azure', 'AWS', 'Terraform', 'Python'];
const ENTER_MS = 750;
const EXIT_MS = 700;
const REDUCED_MS = 220;

export function Home() {
  const { t } = useTranslation();
  // Reduced motion turns smooth scrolling into instant jumps.
  const prefersReducedMotion = usePrefersReducedMotion();
  const skills = t('hero.skills', { returnObjects: true }) as { title: string; detail: string }[];
  const [shell, setShell] = useState<Shell>('page');
  const [loadingGame, setLoadingGame] = useState(false);
  const shellRef = useRef<Shell>('page');
  const timer = useRef<number | null>(null);
  const enterMs = prefersReducedMotion ? REDUCED_MS : ENTER_MS;
  const exitMs = prefersReducedMotion ? REDUCED_MS : EXIT_MS;

  const go = useCallback((next: Shell) => {
    shellRef.current = next;
    setShell(next);
  }, []);
  const after = useCallback((ms: number, fn: () => void) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fn();
    }, ms);
  }, []);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const openGame = useCallback(() => {
    if (shellRef.current !== 'page' || loadingGame) return;
    setLoadingGame(true);
    // Start the animation only once the chunk is here, so the veil never
    // closes over a page with nothing behind it.
    loadPlayMode().then(
      () => {
        setLoadingGame(false);
        if (shellRef.current !== 'page') return;
        go('entering');
        after(enterMs, () => {
          if (shellRef.current === 'entering') go('game');
        });
      },
      () => setLoadingGame(false),
    );
  }, [after, enterMs, go, loadingGame]);

  const onExitStart = useCallback(
    (target: ExitTarget) => {
      if (shellRef.current !== 'game' && shellRef.current !== 'entering') return;
      go('exiting');
      // The page is hidden behind the veil: jump instantly so it is already
      // in place when the veil opens.
      if (target === 'top') window.scrollTo({ top: 0, behavior: 'auto' });
      else if (target !== 'stay') document.getElementById(target)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    },
    [go],
  );
  const onExitEnd = useCallback(() => {
    if (shellRef.current !== 'exiting') return;
    go('page');
  }, [go]);

  const veil = shell === 'entering' ? 'closing' : shell === 'exiting' ? 'opening' : shell === 'game' ? 'closed' : '';

  return (
    <div className={`min-h-screen relative page-shell${shell === 'entering' || shell === 'game' ? ' page-dim' : ''}`}>
      <Navbar onPlay={openGame} onPlayIntent={loadPlayMode} playDisabled={shell !== 'page' || loadingGame} />
      <InteractiveBackground />
      {/* Content is pointer-transparent (.layer-content): the background
          canvas owns clicks for grab & pull; links/buttons re-enable
          themselves via CSS. Navbar stays fully interactive (z-40 chrome). */}
      <main className="layer-content container relative z-20">
        {/* Hero: the pitch (what I can do, not a job title) next to the game card.
            On wide screens they sit side by side; on narrow ones the pitch comes
            first with an inline Play button and the card follows. The game stays
            optional: its chunk loads on intent. */}
        <section className="hero-signature px-6 md:px-8" aria-label={t('hero.name')}>
          <div className="hero-copy">
            <h1 className="hero-name">{t('hero.name')}</h1>
            <p className="hero-headline">{t('hero.headline')}</p>
            <p className="hero-facts">{t('hero.facts')}</p>
            <ul className="hero-skills">
              {skills.map((skill) => (
                <li key={skill.title}>
                  <b>{skill.title}</b>
                  <span>{skill.detail}</span>
                </li>
              ))}
            </ul>
            <ul className="hero-stack" aria-label={t('hero.stackLabel')}>
              {HERO_STACK.map((tech) => {
                const Icon = ICON_MAP[tech];
                return (
                  <li key={tech}>
                    {Icon && <Icon size={16} />}
                    {tech}
                  </li>
                );
              })}
            </ul>
            <div className="hero-actions">
              <a
                href="#experience"
                className="hero-btn primary"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('experience')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                }}
              >
                {t('hero.viewWork')} ↓
              </a>
              <button
                type="button"
                className="hero-btn hero-play-inline"
                onClick={openGame}
                onPointerEnter={loadPlayMode}
                onFocus={loadPlayMode}
                onTouchStart={loadPlayMode}
                disabled={shell !== 'page' || loadingGame}
              >
                ▶ {t('hero.play')}
              </button>
            </div>
            <p className="hero-note hero-play-inline">{t('hero.playNote')}</p>
          </div>
          <GameCard label={t('hero.play')} note={t('hero.playNote')} onPlay={openGame} onIntent={loadPlayMode} disabled={shell !== 'page' || loadingGame} />
        </section>

        <ExperienceSection />

        <AboutSection />

        {/* Contact Section */}
        <ContactSection />
      </main>
      <Footer />
      {veil && <div className={`crt-veil ${veil}${prefersReducedMotion ? ' reduced' : ''}`} aria-hidden="true" />}
      {shell !== 'page' && (
        <Suspense fallback={null}>
          <PlayMode onExitStart={onExitStart} onExitEnd={onExitEnd} exitMs={exitMs} />
        </Suspense>
      )}
    </div>
  );
}
