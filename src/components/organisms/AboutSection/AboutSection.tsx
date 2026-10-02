import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/atoms';
import { useInView } from '@/hooks';
import { ICON_MAP } from '@/const/iconMap';

// Stack highlights distilled from the technologies used across experience
// entries. Every entry must exist in ICON_MAP so it renders with its icon.
const STACK_HIGHLIGHTS = ['React', 'NestJS', 'AWS', 'Terraform', 'PostgreSQL', 'GitHub Actions'];

export const AboutSection: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const bio = t('about.bio', { returnObjects: true }) as string[];

  return (
    <section id="about" aria-labelledby="about-title" className="py-24 px-6 md:px-4">
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

            {/* Stack highlights */}
            <div className="mt-10">
              <p
                className="text-xs font-medium tracking-widest uppercase mb-4"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('about.stackLabel')}
              </p>
              <ul className="flex flex-wrap gap-2">
                {STACK_HIGHLIGHTS.map((tech) => {
                  const Icon = ICON_MAP[tech];
                  return (
                    <li key={tech} className="tag text-xs px-3 py-1.5">
                      {Icon && <Icon size={14} />}
                      {tech}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
