import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/atoms';
import type { WorkCardData } from './types';
import { FeaturedWorkCard } from './FeaturedWorkCard';
import { WorkCard } from './WorkCard';

/**
 * Selected Work — flagship case studies (Loopay featured, Galgo, Trebet,
 * this portfolio). Card content lives entirely in i18n (`work.cards`),
 * with identical shape and URLs across en/es.
 */
export const SelectedWork: React.FC = () => {
  const { t } = useTranslation();
  const cards = t('work.cards', { returnObjects: true }) as WorkCardData[];

  // Defensive: a malformed translation bundle must not blank the page.
  if (!Array.isArray(cards) || cards.length === 0) return null;

  const [featured, ...rest] = cards;

  return (
    <section id="work" aria-labelledby="work-title" className="scroll-mt-16 py-24 px-6 md:px-4">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <Heading
            id="work-title"
            level={2}
            className="text-3xl md:text-4xl text-center mb-16"
            style={{ color: 'var(--text)' }}
          >
            {t('work.title')}
          </Heading>
        </div>

        <FeaturedWorkCard card={featured} />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {rest.map((card, i) => (
            <WorkCard key={card.title} card={card} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
};
