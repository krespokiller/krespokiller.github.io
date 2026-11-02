import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AboutSection, ContactSection, ExperienceSection, Footer, InteractiveBackground, Navbar, SelectedWork } from "@/components";
import { Button } from "@/components/atoms";
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
const ENTER_MS = 750;
const EXIT_MS = 700;
const REDUCED_MS = 220;

export function Home() {
  const { t } = useTranslation();
  // Reduced motion turns smooth scrolling into instant jumps.
  const prefersReducedMotion = usePrefersReducedMotion();
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
      <Navbar />
      <InteractiveBackground />
      {/* Content is pointer-transparent (.layer-content): the background
          canvas owns clicks for grab & pull; links/buttons re-enable
          themselves via CSS. Navbar stays fully interactive (z-40 chrome). */}
      <main className="layer-content container relative z-20">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-6 md:px-4">
          <div className="container">
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <div className="space-y-3 group cursor-default">
                <h1 className="text-5xl md:text-7xl font-light tracking-tight" style={{ color: 'var(--text)' }}>
                  {t('hero.name')}
                </h1>
                <p className="text-xl md:text-2xl font-light tracking-wide text-gradient">
                  {t('hero.title')}
                </p>
                <p className="text-sm md:text-base font-light tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                  {t('hero.subtitle')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-8">
                <Button
                  onClick={() => {
                    const element = document.getElementById('work');
                    element?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                  }}
                >
                  {t('hero.viewWork')}
                </Button>
                {/* Prefetch the game chunk when the user shows intent. */}
                <span onPointerEnter={loadPlayMode} onFocusCapture={loadPlayMode} onTouchStart={loadPlayMode}>
                  <Button variant="secondary" onClick={openGame} disabled={shell !== 'page' || loadingGame}>
                    <span aria-hidden="true">{loadingGame ? '… ' : '▶ '}</span>
                    {t('hero.play')}
                  </Button>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Selected Work Section */}
        <SelectedWork />

        {/* About Section */}
        <AboutSection />

        <ExperienceSection />

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
