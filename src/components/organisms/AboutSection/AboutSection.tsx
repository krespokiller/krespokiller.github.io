import { STACK_GROUPS } from '@/const/stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/atoms';
import { useInView } from '@/hooks';

// Stack from the CV, grouped by category and rendered as plain text rows (no
// chips or icons) so it reads as a short reference table. Group labels are
// i18n'd via about.stack.* keys.

export const AboutSection: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const bio = t('about.bio', { returnObjects: true }) as string[];

  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-16 py-24 px-6 md:px-4">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <Heading
            id="about-title"
            level={2}
            className="text-3xl md:text-4xl text-center mb-16"
            style={{ color: 'var(--text)' }}
          >
            {t('about.title')}
          </Heading>

          <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Bio */}
            <div className="space-y-5">
              {bio.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-base md:text-lg leading-relaxed font-light"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Stack grouped by category */}
            <div className="mt-10">
              <p
                className="text-xs font-medium tracking-widest uppercase mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('about.stackLabel')}
              </p>
              <div className="space-y-3">
                {STACK_GROUPS.map((group) => (
                  <div key={group.labelKey} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <span
                      className="text-[11px] font-medium tracking-wider uppercase sm:w-36 sm:flex-shrink-0"
                      style={{ color: 'var(--text-tag)' }}
                    >
                      {t(group.labelKey)}
                    </span>
                    <span className="text-sm md:text-base font-light leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {group.items.join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
