import { tailwindPreset } from '@acme/design-tokens/tailwind-preset';
import type { Config } from 'tailwindcss';

export default {
  presets: [tailwindPreset],
  content: [
    './src/**/*.{ts,tsx}',
    // @acme/ui ships source, so its Tailwind classes only exist in these
    // files — without scanning them the imported components render unstyled.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
