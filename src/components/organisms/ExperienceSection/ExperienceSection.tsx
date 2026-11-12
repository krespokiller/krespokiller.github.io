import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/atoms';
import { ExperienceItem } from '@/components/molecules';
import { Experience } from '@/models';

export const ExperienceSection: React.FC = () => {
  const { t } = useTranslation();
  const experiences = t('experiences', { returnObjects: true }) as Experience[];

  return (
    <section id="experience" className="scroll-mt-16 py-24 px-6 md:px-4">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <Heading level={2} className="text-3xl md:text-4xl text-center mb-12" style={{ color: 'var(--text)' }}>
            {t('experience.title')}
          </Heading>

          <ul className="exp-list">
            {experiences.map((exp) => (
              <ExperienceItem key={`${exp.company}-${exp.dates}`} {...exp} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
