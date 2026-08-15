'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { dictionaryFor } from './dictionary';
import { LOCALE_COOKIE, type Locale } from './locales';

interface LocaleContextValue {
  locale: Locale;
  dict: ReturnType<typeof dictionaryFor>;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dict: dictionaryFor(locale),
      setLocale: (next) => {
        document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000`;
        setLocaleState(next);
        router.refresh();
      },
    }),
    [locale, router],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
