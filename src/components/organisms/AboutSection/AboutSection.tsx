import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/atoms';
import { useInView } from '@/hooks';
import { ICON_MAP } from '@/const/iconMap';

// Full stack from the CV, grouped by category. Group labels are i18n'd via
// about.stack.* keys; every icon'd item must exist in ICON_MAP. Concept tags
// (Multi-tenant, CI/CD, IaC, OCR, ...) are intentionally text-only.
const STACK_GROUPS: { labelKey: string; items: string[] }[] = [
  {
    labelKey: 'about.stack.languages',
    items: ['TypeScript', 'Python', 'JavaScript', 'PHP'],
  },
  {
    labelKey: 'about.stack.backend',
    items: ['NestJS', 'Django', 'FastAPI', 'Node.js', 'Laravel', 'GraphQL', 'RedwoodJS', 'WebSockets', 'WebRTC'],
  },
  {
    labelKey: 'about.stack.frontend',
    items: ['React', 'Angular', 'React Native'],
  },
  {
    labelKey: 'about.stack.databases',
    items: ['PostgreSQL', 'Aurora', 'MongoDB', 'Redis', 'Prisma', 'SQLAlchemy'],
  },
  {
    labelKey: 'about.stack.cloudDevops',
    items: ['AWS', 'Terraform', 'DigitalOcean', 'Docker', 'GitHub Actions', 'Datadog'],
  },
  {
    labelKey: 'about.stack.architecture',
    items: ['Multi-tenant', 'Event-driven', 'Clean Architecture', 'CI/CD', 'IaC'],
  },
  {
    labelKey: 'about.stack.testing',
    items: ['Jest', 'pytest', 'Pydantic', 'Automated Testing', 'Code Reviews'],
  },
  {
    labelKey: 'about.stack.aiOcr',
    items: ['Google Gemini', 'OCR'],
  },
];

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
                style={{ color: 'var(--text-muted)' }}
              >
                {t('about.stackLabel')}
              </p>
              <div className="space-y-3">
                {STACK_GROUPS.map((group) => (
                  <div key={group.labelKey} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <span
                      className="text-[11px] font-medium tracking-wider uppercase sm:w-32 sm:flex-shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t(group.labelKey)}
                    </span>
                    <ul className="flex flex-wrap gap-1.5">
                      {group.items.map((tech) => {
                        const Icon = ICON_MAP[tech];
                        return (
                          <li key={tech} className="tag text-xs px-3 py-1">
                            {Icon && <Icon size={13} />}
                            {tech}
                          </li>
                        );
                      })}
                    </ul>
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
