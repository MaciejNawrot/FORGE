import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Guards the cross-platform contract for `src/primitives` and `src/lib`:
 * these files must stay portable to React Native via NativeWind, which
 * means Tailwind class strings only — no DOM APIs, no inline style
 * objects, and no imports from web-only packages.
 *
 * Without this, the split between primitives/ and web/ is only a
 * convention and drifts the first time someone reaches for a Radix
 * import or a `style={{}}` escape hatch.
 */
const here = dirname(fileURLToPath(import.meta.url));
const portableDirs = [here, join(here, '..', 'lib')];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((file) => /\.tsx?$/.test(file))
    .filter((file) => !file.includes('.test.') && !file.includes('.stories.'))
    .map((file) => join(dir, file));
}

const files = portableDirs.flatMap(sourceFiles);

const forbidden: Array<{ label: string; pattern: RegExp }> = [
  { label: 'DOM global `document`', pattern: /\bdocument\s*\./ },
  { label: 'DOM global `window`', pattern: /\bwindow\s*\./ },
  { label: 'inline style object (CSS-in-JS)', pattern: /style=\{\{/ },
  { label: 'web-only Radix import', pattern: /from\s+'@radix-ui/ },
  { label: 'import from the web-only entrypoint', pattern: /from\s+'\.\.\/web/ },
];

describe('primitive portability', () => {
  it('finds primitive source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s stays portable to React Native', (file) => {
    const source = readFileSync(file, 'utf8');
    for (const { label, pattern } of forbidden) {
      expect(pattern.test(source), `${file} must not use ${label}`).toBe(false);
    }
  });
});
