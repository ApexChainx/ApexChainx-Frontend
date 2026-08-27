'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { Locale, defaultLocale, localeNames, locales } from './config';
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
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: readonly Locale[];
  localeNames: Record<Locale, string>;
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

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = messages[locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    // Plural forms: a message node shaped { one: "...", other: "..." } selects
    // the form by the `count` parameter (1 -> one, anything else -> other).
    if (value && typeof value === 'object' && params && params.count !== undefined) {
      const forms = value as Record<string, unknown>;
      value = params.count === 1 ? forms.one : forms.other;
    }

    if (typeof value !== 'string') {
      return key;
    }

    // ICU-lite interpolation: `{name}` placeholders are substituted from params.
    if (params) {
      let rendered = value;
      for (const [name, replacement] of Object.entries(params)) {
        rendered = rendered.replaceAll(`{${name}}`, String(replacement));
      }
      return rendered;
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, locales, localeNames }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}