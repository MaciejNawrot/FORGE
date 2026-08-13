import { cookies } from 'next/headers';
import { dictionaryFor } from './dictionary';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './locales';

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

export async function getServerDictionary() {
  return dictionaryFor(await getServerLocale());
}
