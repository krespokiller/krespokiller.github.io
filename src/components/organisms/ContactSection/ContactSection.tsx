import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/atoms';
import { useInView } from '@/hooks';

// Primary contact channels only (user decision: no email, no contact form).
// URLs must stay in sync with the ones rendered in Footer.
const GITHUB_URL = 'https://github.com/krespokiller';
const LINKEDIN_URL = 'https://www.linkedin.com/in/david-vargas-krespokiller';

interface ContactChannel {
  href: string;
  name: string;
  description: string;
  ariaLabel: string;
  icon: React.ReactNode;
}

export const ContactSection: React.FC = () => {
  const { t } = useTranslation();
  const { ref, isInView } = useInView({ threshold: 0.15 });

  const channels: ContactChannel[] = [
    {
      href: GITHUB_URL,
      name: 'GitHub',
      description: t('contact.github.description'),
      ariaLabel: t('contact.github.ariaLabel'),
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
    },
    {
      href: LINKEDIN_URL,
      name: 'LinkedIn',
      description: t('contact.linkedin.description'),
      ariaLabel: t('contact.linkedin.ariaLabel'),
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
  ];

  return (
    <section id="contact" aria-labelledby="contact-title" className="py-24 px-6 md:px-4">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <Heading
            id="contact-title"
            level={2}
            className="text-3xl md:text-4xl text-center mb-6"
            style={{ color: 'var(--text)' }}
          >
            {t('contact.title')}
          </Heading>

          <p
            className="text-base md:text-lg leading-relaxed font-light text-center mb-12"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('contact.invite')}
          </p>

          <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="grid gap-6 md:grid-cols-2">
              {channels.map((channel) => (
                <a
                  key={channel.name}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={channel.ariaLabel}
                  className="card group flex items-center gap-5 px-6 py-7 hover:-translate-y-1 hover:border-[color:var(--border-tag)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className="flex items-center justify-center w-14 h-14 rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: 'var(--bg-tag)', color: 'var(--text-tag)' }}
                  >
                    {channel.icon}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block text-lg font-medium tracking-tight" style={{ color: 'var(--text)' }}>
                      {channel.name}
                    </span>
                    <span className="block text-sm font-light leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {channel.description}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-xl font-light flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: 'var(--text-tag)' }}
                  >
                    ›
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
