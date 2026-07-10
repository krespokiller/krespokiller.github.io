import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage, useTheme } from '@/hooks';

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const { toggleLanguage, isEnglish } = useLanguage();
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="fixed top-0 right-0 z-50 flex items-center gap-3 p-6">
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ background: 'var(--bg-tag)', border: '1px solid var(--border-tag)' }}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <svg className="w-4 h-4" style={{ color: 'var(--text-tag)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg className="w-4 h-4" style={{ color: 'var(--text-tag)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <button
        onClick={toggleLanguage}
        className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ background: 'var(--bg-tag)', border: '1px solid var(--border-tag)' }}
        aria-label={isEnglish ? 'Switch to Spanish' : 'Cambiar a Inglés'}
      >
        <svg className="w-4 h-4" style={{ color: 'var(--text-tag)' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
      </button>
    </header>
  );
};
