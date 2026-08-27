'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { Locale, defaultLocale, localeNames, locales } from './config';
import { formatDate as formatDateWithLocale, formatNumber as formatNumberWithLocale } from './format';
import en from './messages/en.json';
import es from './messages/es.json';
import pt from './messages/pt.json';

const messages = {
  en,
  es,
  pt,
};

type Messages = typeof en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  locales: readonly Locale[];
  localeNames: Record<Locale, string>;
  /** Format a date with the active locale's conventions. */
  formatDate: (value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  /** Format a number with the active locale's conventions. */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred-locale');
      if (saved && locales.includes(saved as Locale)) {
        return saved as Locale;
      }
    }
    return defaultLocale;
  });

  useEffect(() => {
    localStorage.setItem('preferred-locale', locale);
  }, [locale]);

  // Keep the document language in sync with the selected locale so screen
  // readers and search engines announce the correct language, including
  // across hard refreshes (the locale is re-read from localStorage at init).
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = messages[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const formatDate = (value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions) =>
    formatDateWithLocale(value, locale, options);

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumberWithLocale(value, locale, options);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales, localeNames, formatDate, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
}

// A fallback context so components that use the i18n helpers (formatDate,
// formatNumber, t) render with the default locale even when they appear
// outside an I18nProvider (e.g. in isolated unit tests or previews) instead
// of throwing.
const defaultContext: I18nContextType = {
  locale: defaultLocale,
  setLocale: () => {},
  t: (key: string) => key,
  locales,
  localeNames,
  formatDate: (value, options) => formatDateWithLocale(value, defaultLocale, options),
  formatNumber: (value, options) => formatNumberWithLocale(value, defaultLocale, options),
};

export function useI18n() {
  return useContext(I18nContext) ?? defaultContext;
}
