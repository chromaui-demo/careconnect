/**
 * CareConnect design tokens for React Native.
 *
 * Mirrors packages/design-system/src/styles/tokens.css, which stays the single
 * source of truth: rem values are converted at 16px, and tokens.test.ts fails
 * when a value here drifts from the CSS. Shadows have no direct equivalent on
 * native and are expressed as shadow* / elevation props instead.
 */
export const colors = {
  primary: '#0D7377',
  primaryLight: '#128089',
  primaryDark: '#0A5C5F',
  primarySubtle: '#E6F4F4',

  accent: '#BC4424',
  accentLight: '#F4A261',
  accentSubtle: '#FDF0EC',

  success: '#20776C',
  warning: '#E9C46A',
  error: '#C23C1B',
  info: '#407191',

  primaryText: '#0D7377',
  successText: '#2A9D8F',
  warningText: '#C08A12',
  errorText: '#C23C1B',
  infoText: '#407191',

  successSubtle: '#E8F5F3',
  warningSubtle: '#FDF6E3',
  errorSubtle: '#FDECEA',
  infoSubtle: '#EEF4F8',

  bg: '#F8FAFB',
  bgElevated: '#FFFFFF',
  bgMuted: '#EEF2F5',
  border: '#D8E0E8',
  borderStrong: '#B8C4D0',

  text: '#1A2332',
  textSecondary: '#3F4A5C',
  textMuted: '#5A6577',
  textInverse: '#FFFFFF',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/** Approximations of --cc-shadow-sm / -md / -lg (rgba(26, 35, 50, …)). */
export const shadow = {
  sm: { shadowColor: '#1A2332', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: '#1A2332', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lg: { shadowColor: '#1A2332', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;

export const tokens = { colors, fontSize, space, radius, shadow } as const;
