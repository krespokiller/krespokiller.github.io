import React from 'react';
import { Heading } from '@/components/atoms';
import { Experience } from '@/models';
import { useInView } from '@/hooks';
import { ICON_MAP } from '@/const/iconMap';

interface ExperienceItemProps extends Experience {
  index: number;
}

export const ExperienceItem: React.FC<ExperienceItemProps> = ({
  company,
  role,
  dates,
  description,
  location,
  tags,
  index,
}) => {
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const delay = index * 100;

  return (
    <div
      ref={ref}
      className={`relative flex gap-4 md:gap-6 transition-all duration-700 ease-out ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 pt-8">
        <div
          className={`w-3 h-3 rounded-full border-2 border-primary transition-all duration-500 ${
            isInView ? 'scale-100' : 'scale-0'
          }`}
          style={{
            transitionDelay: `${delay + 200}ms`,
            background: isInView ? 'var(--text-tag)' : 'var(--bg)',
            boxShadow: isInView ? '0 0 0 4px var(--bg-tag)' : 'none',
          }}
        />
        <div
          className="w-px flex-1 min-h-[80px]"
          style={{
            background: `linear-gradient(to bottom, var(--gradient-line), transparent)`,
          }}
        />
      </div>

      {/* Card */}
      <article className="card relative flex-1 min-w-0 mb-8 overflow-hidden hover:-translate-y-1 hover:border-[color:var(--border-tag)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.10)]">
        {/* Timeline accent edge */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-0.5"
          style={{ background: 'linear-gradient(to bottom, var(--color-primary), transparent)' }}
        />

        <div className="p-5 md:p-6">
          {/* Period badge */}
          <span
            className="inline-block text-xs font-medium tracking-wider uppercase mb-3 rounded-full px-3 py-1"
            style={{ background: 'var(--bg-tag)', color: 'var(--text-tag)' }}
          >
            {dates}
          </span>

          {/* Header */}
          <div className="mb-4">
            <Heading level={3} className="text-xl md:text-2xl font-medium tracking-tight" style={{ color: 'var(--text)' }}>
              {role}
            </Heading>
            <p className="text-base font-light" style={{ color: 'var(--text-secondary)' }}>
              {company}
              {location && (
                <span className="ml-2" style={{ color: 'var(--text-muted)' }}>· {location}</span>
              )}
            </p>
          </div>

          {/* Highlights */}
          <ul className="space-y-2.5 mb-5">
            {description.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed font-light" style={{ color: 'var(--text-secondary)' }}>
                <span aria-hidden="true" className="mt-1.5 flex-shrink-0 font-medium" style={{ color: 'var(--text-tag)' }}>›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Tech chips with icons */}
          {tags && tags.length > 0 && (
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
          )}
        </div>
      </article>
    </div>
  );
};
