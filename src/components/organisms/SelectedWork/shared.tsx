import React from 'react';
import { Heading } from '@/components/atoms';
import { ICON_MAP } from '@/const/iconMap';
import type { WorkCardData, WorkLink, WorkMetric } from './types';

/**
 * Internal building blocks shared by FeaturedWorkCard and WorkCard.
 * Every color/spacing value resolves through the theme CSS vars —
 * no hardcoded colors, so both themes stay refined.
 */

/**
 * Editorial oversized ghost numeral ("01"–"04") bleeding off the card's
 * top corner, magazine-style. The article clips it via overflow-hidden.
 * It shifts slightly on card hover; reduced motion disables the transform.
 */
export const GhostNumeral: React.FC<{ index: number; className?: string }> = ({ index, className = '' }) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none select-none absolute z-10 font-bold leading-none tracking-tighter transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1.5 ${className}`}
    style={{ color: 'var(--text-tag)', opacity: 0.09 }}
  >
    {String(index + 1).padStart(2, '0')}
  </span>
);

export const CardHeader: React.FC<{ card: WorkCardData; large?: boolean }> = ({ card, large = false }) => (
  <header className="mb-5">
    <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--text-tag)' }}>
      {card.eyebrow}
    </p>
    <Heading
      level={3}
      className={`mt-2.5 font-medium tracking-tight ${large ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}
      style={{ color: 'var(--text)' }}
    >
      {card.title}
    </Heading>
    <p
      className={`mt-2 font-light leading-relaxed ${large ? 'text-base' : 'text-sm'}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      {card.summary}
    </p>
    {card.note && (
      <p className="mt-2.5 text-xs font-light italic" style={{ color: 'var(--text-muted)' }}>
        {card.note}
      </p>
    )}
  </header>
);

export const CardBullets: React.FC<{ bullets: string[] }> = ({ bullets }) => (
  <ul className="space-y-2.5">
    {bullets.map((bullet, i) => (
      <li key={i} className="flex gap-2.5 text-sm leading-relaxed font-light" style={{ color: 'var(--text-secondary)' }}>
        <span aria-hidden="true" className="mt-1.5 flex-shrink-0 font-medium" style={{ color: 'var(--text-tag)' }}>›</span>
        <span>{bullet}</span>
      </li>
    ))}
  </ul>
);

/**
 * Headline metric: big primary-colored number (tabular numerals so digits
 * don't jitter) with a small muted label underneath.
 */
export const MetricStatement: React.FC<{ metric: WorkMetric; large?: boolean }> = ({ metric, large = false }) => (
  <div className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
    <p
      className={`${large ? 'text-5xl md:text-6xl' : 'text-4xl'} font-light tracking-tight tabular-nums`}
      style={{ color: 'var(--color-primary)' }}
    >
      {metric.value}
    </p>
    <p className="mt-1.5 text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
      {metric.label}
    </p>
  </div>
);

export const CardLinks: React.FC<{ links: WorkLink[] }> = ({ links }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {links.map((link) => (
      <a
        key={link.href}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.ariaLabel}
        className="group/link inline-flex items-center gap-1 rounded text-sm font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        style={{ color: 'var(--text-tag)' }}
      >
        {link.label}
        <span
          aria-hidden="true"
          className="transition-transform duration-300 ease-out motion-safe:group-hover/link:translate-x-1"
        >
          →
        </span>
      </a>
    ))}
  </div>
);

export const CardTags: React.FC<{ tags: string[] }> = ({ tags }) => (
  <div className="flex flex-wrap gap-1.5">
    {tags.map((tag) => {
      const Icon = ICON_MAP[tag];
      return (
        <span key={tag} className="tag text-[11px] px-2.5 py-0.5">
          {Icon && <Icon size={12} />}
          {tag}
        </span>
      );
    })}
  </div>
);
