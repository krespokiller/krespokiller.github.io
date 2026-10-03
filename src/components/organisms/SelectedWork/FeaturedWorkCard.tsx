import React from 'react';
import { SiNestjs } from 'react-icons/si';
import { useInView } from '@/hooks';
import type { WorkCardData } from './types';
import { CardBullets, CardHeader, CardLinks, CardTags, GhostNumeral, MetricStatement } from './shared';

/**
 * Featured case study (card "01"): horizontal split on desktop — content
 * ~60% left, layered gradient visual panel ~40% right with an oversized
 * brand glyph — stacking vertically on mobile. The panel is decorative
 * (aria-hidden, pointer-transparent) so the background canvas stays
 * grabbable through it.
 */
export const FeaturedWorkCard: React.FC<{ card: WorkCardData }> = ({ card }) => {
  const { ref, isInView } = useInView({ threshold: 0.12 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      <article className="card group relative overflow-hidden p-0 flex flex-col lg:grid lg:grid-cols-5 motion-safe:hover:-translate-y-1">
        <GhostNumeral index={0} className="-top-8 right-2 text-[9rem] md:text-[12rem]" />

        {/* Content — ~60% */}
        <div className="p-6 md:p-9 lg:col-span-3 lg:p-10 flex flex-col">
          <CardHeader card={card} large />
          <CardBullets bullets={card.bullets} />

          <div className="mt-auto pt-8 flex flex-col gap-6">
            {card.metric && <MetricStatement metric={card.metric} large />}
            <CardLinks links={card.links} />
            <CardTags tags={card.tags} />
          </div>
        </div>

        {/* Visual panel — ~40%: layered var-based gradient wash, a faint
            node-grid texture echoing the particle network, and the brand
            glyph at low opacity. */}
        <div
          aria-hidden="true"
          className="relative overflow-hidden min-h-44 lg:min-h-0 lg:col-span-2 border-t lg:border-t-0 lg:border-l"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg, var(--bg-tag) 0%, transparent 55%)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 70% 25%, var(--border-tag) 0%, transparent 65%)' }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: 'radial-gradient(var(--border-tag) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <SiNestjs
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 md:w-52 md:h-52 transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
            style={{ color: 'var(--text-tag)', opacity: 0.14 }}
          />
        </div>
      </article>
    </div>
  );
};
