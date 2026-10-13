#!/usr/bin/env node
// Exports src/styles/tokens.css as a W3C DTCG design-tokens file
// (src/figma/tokens.json) that Figma's variable import, Tokens Studio and the
// other DTCG-aware plugins can turn into Figma Variables.
//
// tokens.css stays the single source of truth; this file is derived from it and
// committed so designers can grab it without a checkout. `npm run tokens:export`
// regenerates it, `npm run tokens:export -- --check` (used by the unit tests)
// fails when the committed file is stale.
//
// Flags:
//   --check              exit 1 if src/figma/tokens.json is out of date
//   --legacy-dimensions  emit "16px" strings instead of { value, unit } objects,
//                        for importers that predate the 2025 DTCG spec
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TOKENS_CSS = path.join(pkgDir, 'src/styles/tokens.css');
export const TOKENS_JSON = path.join(pkgDir, 'src/figma/tokens.json');

const ROOT_FONT_SIZE_PX = 16;
const EXTENSION_KEY = 'com.careconnect';

/** Reads every `--cc-*` declaration in the `:root` block, in source order. */
export function parseCssVariables(css) {
  const root = css.match(/:root\s*\{([^}]*)\}/);
  if (!root) throw new Error('tokens.css: no :root block found');
  const vars = [];
  for (const m of root[1].matchAll(/--cc-([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars.push({ name: m[1], value: m[2].trim() });
  }
  return vars;
}

function dimension(cssValue, legacy) {
  const m = cssValue.match(/^(-?[\d.]+)(rem|px|ms)$/);
  if (!m) throw new Error(`unsupported dimension: ${cssValue}`);
  let value = Number(m[1]);
  let unit = m[2];
  if (unit === 'rem') {
    value = Math.round(value * ROOT_FONT_SIZE_PX * 100) / 100;
    unit = 'px';
  }
  return legacy ? `${value}${unit}` : { value, unit };
}

function colorHex(cssValue) {
  if (/^#[0-9a-f]{6}$/i.test(cssValue)) return cssValue.toUpperCase();
  const rgba = cssValue.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (!rgba) throw new Error(`unsupported color: ${cssValue}`);
  const hex = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  const [, r, g, b, a] = rgba;
  return `#${hex(+r)}${hex(+g)}${hex(+b)}${a === undefined ? '' : hex(+a * 255)}`;
}

function shadow(cssValue, legacy) {
  const m = cssValue.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(rgba?\(.*\))$/);
  if (!m) throw new Error(`unsupported shadow: ${cssValue}`);
  const px = (v) => dimension(v === '0' ? '0px' : v, legacy);
  return {
    offsetX: px(m[1]),
    offsetY: px(m[2]),
    blur: px(m[3]),
    spread: px('0px'),
    color: colorHex(m[4]),
  };
}

function fontFamily(cssValue) {
  return cssValue.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, ''));
}

/** Maps one CSS variable onto a DTCG group path + token. */
function classify({ name, value }, legacy) {
  const ext = { [EXTENSION_KEY]: { cssVariable: `--cc-${name}`, cssValue: value } };
  const token = (group, key, $type, $value, extra = {}) => ({
    group,
    key,
    token: { $type, $value, ...extra, $extensions: ext },
  });

  if (name.startsWith('font-')) {
    return token(['font', 'family'], name.slice(5), 'fontFamily', fontFamily(value));
  }
  if (/^text-(xs|sm|base|lg|xl|\dxl)$/.test(name)) {
    return token(['font', 'size'], name.slice(5), 'dimension', dimension(value, legacy));
  }
  if (name.startsWith('space-')) {
    return token(['space'], name.slice(6), 'dimension', dimension(value, legacy));
  }
  if (name.startsWith('radius-')) {
    return token(['radius'], name.slice(7), 'dimension', dimension(value, legacy));
  }
  if (name.startsWith('shadow-')) {
    return token(['shadow'], name.slice(7), 'shadow', shadow(value, legacy));
  }
  if (name === 'transition') {
    const [duration, easing] = value.split(/\s+/);
    return token(['motion'], name, 'duration', dimension(duration, legacy), {
      $description: `CSS transition timing: ${duration} ${easing ?? ''}`.trim(),
    });
  }
  if (/^(#|rgba?\()/.test(value)) {
    return token(['color'], name, 'color', colorHex(value));
  }
  throw new Error(`don't know how to export --cc-${name}: ${value}`);
}

export function buildTokens(css, { legacy = false } = {}) {
  const out = {
    $description:
      'CareConnect design tokens, generated from packages/design-system/src/styles/tokens.css by scripts/export-figma-tokens.mjs. Do not edit by hand.',
  };
  for (const cssVar of parseCssVariables(css)) {
    const { group, key, token } = classify(cssVar, legacy);
    let node = out;
    for (const segment of group) node = node[segment] ??= {};
    node[key] = token;
  }
  return out;
}

export function renderTokens(options) {
  return JSON.stringify(buildTokens(fs.readFileSync(TOKENS_CSS, 'utf8'), options), null, 2) + '\n';
}

function main(argv) {
  const check = argv.includes('--check');
  const legacy = argv.includes('--legacy-dimensions');
  const next = renderTokens({ legacy });
  if (check) {
    const current = fs.existsSync(TOKENS_JSON) ? fs.readFileSync(TOKENS_JSON, 'utf8') : '';
    if (current !== next) {
      console.error(`${path.relative(pkgDir, TOKENS_JSON)} is stale — run \`npm run tokens:export\``);
      process.exit(1);
    }
    console.log(`${path.relative(pkgDir, TOKENS_JSON)} is up to date`);
    return;
  }
  fs.writeFileSync(TOKENS_JSON, next);
  const count = next.match(/"\$type"/g)?.length ?? 0;
  console.log(`wrote ${count} tokens to ${path.relative(pkgDir, TOKENS_JSON)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
