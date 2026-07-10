import { useTranslation } from 'react-i18next';
import { ExperienceSection, Footer, InteractiveBackground, Header } from "@/components";
import { Button } from "@/components/atoms";

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen relative">
      <Header />
      <InteractiveBackground />
      <main className="container relative z-20">
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
              <div className="flex justify-center pt-8">
                <Button
                  onClick={() => {
                    const element = document.getElementById('experience');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {t('hero.viewWork')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <ExperienceSection />
      </main>
      <Footer />
    </div>
  );
}
