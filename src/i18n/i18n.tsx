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
  t: (key: string) => string;
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