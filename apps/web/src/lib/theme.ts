export const THEME_STORAGE_KEY = 'forge-theme';

export const themes = [
  { id: 'dark', label: 'Forge', swatch: '#ccff00' },
  { id: 'light', label: 'Light', swatch: '#0071e3' },
  { id: 'crimson', label: 'Crimson', swatch: '#ff3b30' },
  { id: 'arctic', label: 'Arctic', swatch: '#2997ff' },
  { id: 'violet', label: 'Violet', swatch: '#bf5af2' },
] as const;

export type ThemeId = (typeof themes)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'dark';

export function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

/** Inlined as a blocking `<script>` in the root layout so the stored theme applies before first paint. */
export const noFlashThemeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.dataset.theme=t||${JSON.stringify(DEFAULT_THEME)};}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;
