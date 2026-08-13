import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildTokens, distDir, modeTree } from './build-tokens.mjs';

describe('modeTree', () => {
  it('resolves the requested color mode and keeps shared categories', () => {
    const light = modeTree('light');
    const dark = modeTree('dark');

    expect(light.color.background.$value).toBe('{palette.neutral.0}');
    expect(dark.color.background.$value).toBe('#0a0a0a');
    expect(light.spacing).toBe(dark.spacing);
    expect(light.palette).toBe(dark.palette);
  });
});

describe('buildTokens', () => {
  beforeAll(async () => {
    await buildTokens();
  });

  it('emits variables.css with both a :root and a [data-theme=dark] block', () => {
    const css = readFileSync(`${distDir}/variables.css`, 'utf8');
    expect(css).toContain(':root');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('--color-primary');
    expect(css).toContain('--spacing-4');
  });

  it('emits a tailwind preset with semantic colors mapped to css vars', () => {
    const preset = readFileSync(`${distDir}/tailwind-preset.ts`, 'utf8');
    expect(preset).toContain('export const tailwindPreset');
    expect(preset).toContain('"primary": "var(--color-primary)"');
    expect(preset).not.toContain('palette');
  });

  it('emits a native theme with light and dark css-variable maps', () => {
    const theme = readFileSync(`${distDir}/theme.native.ts`, 'utf8');
    expect(theme).toContain('export const lightVars');
    expect(theme).toContain('export const darkVars');
    expect(theme).toContain('--color-primary');
  });
});
