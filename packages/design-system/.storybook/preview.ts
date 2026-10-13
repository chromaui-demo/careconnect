import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

// Design tokens + reset. global.css @imports tokens.css, so this single import
// gives every story the same baseline consumers get from the `/styles` export.
import '../src/styles/global.css';

const preview: Preview = {
  // theme-dark.css keys off data-theme on <html>; the toolbar switch and the
  // Chromatic `theme` mode both set it through this decorator.
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    // Named viewports, referenced by the Chromatic `viewport` modes in modes.ts.
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' }, type: 'mobile' },
        tablet: { name: 'Tablet', styles: { width: '834px', height: '1112px' }, type: 'tablet' },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Any axe violation fails the story test, locally and in CI, so the
      // library stays at zero instead of drifting back. Chromatic audits the
      // dark-theme modes as well.
      test: 'error',
    },
  },
};

export default preview;
