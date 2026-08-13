'use client';

import { Check } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';
import { localeNames, locales } from '@/lib/i18n/locales';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {locales.map((id) => {
        const selected = id === locale;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLocale(id)}
            className={`glass-panel flex flex-col items-center gap-3 rounded-xl p-4 transition-colors ${
              selected ? 'border-primary' : 'hover:border-primary/50'
            }`}
          >
            <span className="bg-muted relative flex h-10 w-10 items-center justify-center rounded-full">
              {selected && <Check className="text-primary h-5 w-5" aria-hidden="true" />}
            </span>
            <span className="font-data text-sm uppercase">{localeNames[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
