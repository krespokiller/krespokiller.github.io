import React from 'react';
import { useInView } from '@/hooks';
import type { WorkCardData } from './types';
import { CardBullets, CardHeader, CardLinks, CardTags, GhostNumeral, MetricStatement } from './shared';

interface WorkCardProps {
  card: WorkCardData;
  /** Absolute position in the section (0-based): drives ghost numeral + stagger delay. */
  index: number;
}

/**
 * Standard case-study card (numbers "02"–"03"). The reveal transition lives
 * on the wrapper while the hover lift lives on the article, so the stagger
 * delay never slows down the hover micro-interaction.
 */
export const WorkCard: React.FC<WorkCardProps> = ({ card, index }) => {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <article className="card group relative h-full overflow-hidden p-6 md:p-7 flex flex-col motion-safe:hover:-translate-y-1">
        <GhostNumeral index={index} className="-top-6 -right-1 text-[6.5rem] md:text-[7.5rem]" />

        <CardHeader card={card} />
        <CardBullets bullets={card.bullets} />

        <div className="mt-auto pt-7 flex flex-col gap-5">
          {card.metric && <MetricStatement metric={card.metric} />}
          <CardLinks links={card.links} />
          <CardTags tags={card.tags} />
        </div>
      </article>
    </div>
  );
};
