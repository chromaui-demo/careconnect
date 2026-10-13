// Chromatic modes: each mode listed in a story's `chromatic.modes` is captured
// as its own snapshot (and multiplied by every browser enabled in the Chromatic
// project). Modes are opted into per story file, not set globally, so snapshot
// cost only grows where a theme or viewport actually matters.
export const allModes = {
  light: { theme: 'light' },
  dark: { theme: 'dark' },
  mobile: { viewport: 'mobile' },
  desktop: { viewport: 'desktop' },
} as const;
