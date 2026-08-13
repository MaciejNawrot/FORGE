import { en } from './dictionaries/en';
import { pl } from './dictionaries/pl';
import type { Locale } from './locales';

export type { Dictionary } from './dictionaries/en';

const dictionaries = { en, pl };

export function dictionaryFor(locale: Locale) {
  return dictionaries[locale];
}
