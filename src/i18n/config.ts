export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
};