import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors, fontSize, radius, space } from './tokens';

const css = fs.readFileSync(
  path.resolve(__dirname, '../../../design-system/src/styles/tokens.css'),
  'utf8',
);
const cssVars = new Map(
  [...css.matchAll(/--cc-([a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

const toPx = (value: string) => {
  const m = value.match(/^([\d.]+)(rem|px)$/);
  if (!m) throw new Error(`not a dimension: ${value}`);
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
};
const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

describe('native tokens mirror tokens.css', () => {
  it('has every CSS color with the same value', () => {
    const cssColors = [...cssVars].filter(([, v]) => v.startsWith('#'));
    expect(cssColors.length).toBeGreaterThan(0);
    for (const [name, value] of cssColors) {
      expect(colors[camel(name) as keyof typeof colors], `--cc-${name}`).toBe(value.toUpperCase());
    }
    expect(Object.keys(colors)).toHaveLength(cssColors.length);
  });

  it.each([
    ['text-', fontSize],
    ['space-', space],
    ['radius-', radius],
  ] as const)('matches every --cc-%s* dimension', (prefix, scale) => {
    // --cc-text-* holds both font sizes and text colors; only the dimensions count.
    const entries = [...cssVars].filter(([n, v]) => n.startsWith(prefix) && !v.startsWith('#'));
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, value] of entries) {
      const key = name.slice(prefix.length);
      expect((scale as Record<string, number>)[key], `--cc-${name}`).toBe(toPx(value));
    }
    expect(Object.keys(scale)).toHaveLength(entries.length);
  });
});
