import { lazy, Suspense, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AboutSection, ContactSection, ExperienceSection, Footer, InteractiveBackground, Navbar, SelectedWork } from "@/components";
import { Button } from "@/components/atoms";
import { usePrefersReducedMotion } from "@/hooks";

// The game is a separate chunk: it is only fetched on intent (hover / focus /
// touch on the button) or on click, never as part of the initial page load.
const loadPlayMode = () => import('@/game/PlayMode');
const PlayMode = lazy(loadPlayMode);

export function Home() {
  const { t } = useTranslation();
  // Reduced motion turns smooth scrolling into instant jumps.
  const prefersReducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);

  const closeGame = useCallback(() => setPlaying(false), []);
  const goContactFromGame = useCallback(() => {
    setPlaying(false);
    // Wait for the overlay to unmount (it makes the page inert) before scrolling.
    window.setTimeout(() => {
      document.getElementById('contact')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, 50);
  }, [prefersReducedMotion]);

  return (
    <div className="min-h-screen relative">
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
                  <Button variant="secondary" onClick={() => setPlaying(true)}>
                    <span aria-hidden="true">▶ </span>
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
      {playing && (
        <Suspense fallback={null}>
          <PlayMode onClose={closeGame} onGoContact={goContactFromGame} />
        </Suspense>
      )}
    </div>
  );
}
