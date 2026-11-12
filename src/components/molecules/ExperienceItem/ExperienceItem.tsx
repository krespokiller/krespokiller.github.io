import React, { useId, useState } from 'react';
import { Experience } from '@/models';
import { ICON_MAP } from '@/const/iconMap';

/**
 * One role as a collapsed row: period, role · company and a one-line summary.
 * The full highlights and stack open on demand, so the section scans as a
 * short list instead of a wall of bullets. Styles: `.exp-*` in index.css.
 */
export const ExperienceItem: React.FC<Experience> = ({ company, role, dates, note, summary, description, location, tags, links }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Logos of the tools used in the role, as a quick visual cue while collapsed.
  const icons = (tags ?? []).filter((tag) => ICON_MAP[tag]).slice(0, 7);

  return (
    <li className={`exp-row${open ? ' open' : ''}`}>
      <button type="button" className="exp-head" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <span className="exp-dates">{dates}</span>
        <span className="exp-main">
          <span className="exp-title">
            {role} <span className="exp-company">· {company}</span>
          </span>
          {summary && <span className="exp-summary">{summary}</span>}
          {icons.length > 0 && (
            <span className="exp-icons" aria-hidden="true">
              {icons.map((tag) => {
                const Icon = ICON_MAP[tag];
                return (
                  <span key={tag} title={tag}>
                    <Icon size={15} />
                  </span>
                );
              })}
            </span>
          )}
        </span>
        <span className="exp-toggle" aria-hidden="true" />
      </button>

      <div id={panelId} className="exp-panel" hidden={!open}>
        <p className="exp-meta">
          {location}
          {note ? ` · ${note}` : ''}
        </p>
        <ul className="exp-bullets">
          {description.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {links && links.length > 0 && (
          <p className="exp-links">
            {links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label} ↗
              </a>
            ))}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="exp-tags">
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
    </li>
  );
};
