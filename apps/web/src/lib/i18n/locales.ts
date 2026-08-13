export const locales = ['en', 'pl'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  pl: 'Polski',
};

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'forge-locale';

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
