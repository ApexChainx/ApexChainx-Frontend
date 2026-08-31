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

/** Parameters substituted into a message's `{placeholder}` slots. */
export type TParams = Record<string, string | number>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TParams) => string;
  locales: readonly Locale[];
  localeNames: Record<Locale, string>;
}

const I18nContext = createContext<I18nContextType | null>(null);

function resolveValue(tree: unknown, keys: string[]): unknown {
  let value = tree;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return value;
}

function lookup(
  locale: Locale,
  key: string,
  params?: TParams,
): string | undefined {
  const keys = key.split('.');

  // Plural convention: `key` -> first try `key_other`/`key_one` when a
  // `count` param is present, otherwise resolve `key` directly.
  const count = typeof params?.count === 'number' ? params.count : undefined;
  if (count !== undefined) {
    const pluralKey =
      count === 1 ? `${key}_one` : `${key}_other`;
    const pluralValue = resolveValue(messages[locale], pluralKey.split('.'));
    if (typeof pluralValue === 'string') {
      return pluralValue;
    }
    // Fall back to the base key when no plural variants are defined.
  }

  const value = resolveValue(messages[locale], keys);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string, params?: TParams): string => {
    const value = lookup(locale, key, params);
    if (value !== undefined) {
      return interpolate(value, params);
    }
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
    return key;
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