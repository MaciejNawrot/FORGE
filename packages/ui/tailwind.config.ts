import { tailwindPreset } from '@acme/design-tokens/tailwind-preset';
import type { Config } from 'tailwindcss';

export default {
  presets: [tailwindPreset],
  content: ['./src/**/*.{ts,tsx}', './stories/**/*.{ts,tsx}'],
} satisfies Config;
