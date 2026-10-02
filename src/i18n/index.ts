import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslations from '../const/locales/en.json';
import esTranslations from '../const/locales/es.json';
import enExperiences from '../const/locales/experiences-en.json';
import esExperiences from '../const/locales/experiences-es.json';

const resources = {
  en: {
    translation: {
      ...enTranslations,
      ...enExperiences,
    },
  },
  es: {
    translation: {
      ...esTranslations,
      ...esExperiences,
    },
  },
};

const LANGUAGE_STORAGE_KEY = 'portfolio-lang';
const SUPPORTED_LANGUAGES = ['en', 'es'];

const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
  return 'en';
};

// Keep <html lang> in sync so screen readers use the right voice rules
// for the active language.
const syncDocumentLanguage = (lng: string) => {
  document.documentElement.lang = lng;
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(), // restored synchronously before the first render
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

syncDocumentLanguage(i18n.language);

// Persist every language change (the navbar toggle calls changeLanguage)
// so the choice survives reloads.
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  syncDocumentLanguage(lng);
});

export default i18n;