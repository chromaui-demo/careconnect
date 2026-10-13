import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTokens, renderTokens, TOKENS_JSON } from '../../scripts/export-figma-tokens.mjs';
import links from './links.json';

describe('Figma design tokens export', () => {
  it('src/figma/tokens.json matches tokens.css (run `npm run tokens:export` after editing tokens)', () => {
    expect(fs.readFileSync(TOKENS_JSON, 'utf8')).toBe(renderTokens());
  });

  it('classifies every kind of token in tokens.css', () => {
    const tokens = buildTokens(`
      :root {
        --cc-primary: #0d7377;
        --cc-font-mono: 'JetBrains Mono', monospace;
        --cc-text-sm: 0.875rem;
        --cc-space-4: 1rem;
        --cc-radius-full: 9999px;
        --cc-shadow-sm: 0 1px 2px rgba(26, 35, 50, 0.06);
        --cc-transition: 150ms ease;
      }
    `) as Record<string, any>;
    expect(tokens.color.primary.$value).toBe('#0D7377');
    expect(tokens.font.family.mono.$value).toEqual(['JetBrains Mono', 'monospace']);
    expect(tokens.font.size.sm.$value).toEqual({ value: 14, unit: 'px' });
    expect(tokens.space['4'].$value).toEqual({ value: 16, unit: 'px' });
    expect(tokens.radius.full.$value).toEqual({ value: 9999, unit: 'px' });
    expect(tokens.shadow.sm.$value.color).toBe('#1A23320F');
    expect(tokens.motion.transition.$value).toEqual({ value: 150, unit: 'ms' });
    expect(tokens.color.primary.$extensions['com.careconnect'].cssVariable).toBe('--cc-primary');
  });

  it('supports the legacy string dimension format', () => {
    const tokens = buildTokens(':root {\n  --cc-space-2: 0.5rem;\n}', { legacy: true }) as Record<string, any>;
    expect(tokens.space['2'].$value).toBe('8px');
  });

  it('rejects a token it cannot classify instead of silently dropping it', () => {
    expect(() => buildTokens(':root {\n  --cc-z-index: 10;\n}')).toThrow(/--cc-z-index/);
  });
});

describe('Figma links registry', () => {
  it('only holds Figma URLs or empty placeholders', () => {
    const urls = [links.file, ...Object.values(links.components)];
    for (const url of urls) {
      if (url) expect(url).toMatch(/^https:\/\/(www\.)?figma\.com\//);
    }
  });
});
