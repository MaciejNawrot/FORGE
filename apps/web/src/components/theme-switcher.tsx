'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeId, themes } from '@/utils';

export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setActive((document.documentElement.dataset.theme as ThemeId | undefined) ?? DEFAULT_THEME);
  }, []);

  function selectTheme(id: ThemeId) {
    document.documentElement.dataset.theme = id;
    localStorage.setItem(THEME_STORAGE_KEY, id);
    setActive(id);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {themes.map((theme) => {
        const selected = theme.id === active;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => selectTheme(theme.id)}
            className={`glass-panel flex flex-col items-center gap-3 rounded-xl p-4 transition-colors ${
              selected ? 'border-primary' : 'hover:border-primary/50'
            }`}
          >
            <span
              className="relative flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.swatch }}
            >
              {selected && <Check className="h-5 w-5 text-black" aria-hidden="true" />}
            </span>
            <span className="font-data text-sm uppercase">{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}
