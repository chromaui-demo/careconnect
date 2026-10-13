/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';
import pkg from './package.json' with { type: 'json' };
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { chromaticPlugin } from '@chromatic-com/vitest/plugin';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const externalDeps = Object.keys(pkg.dependencies ?? {});

export default defineConfig({
  // Library build: there are no static assets to copy, and leaving publicDir on
  // ships public/.gitkeep into dist/ (and therefore into the tarball).
  // Storybook serves ../public itself via staticDirs.
  publicDir: false,
  define: {
    __DESIGN_SYSTEM_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    dts({ include: ['src'], exclude: ['src/**/*.stories.tsx', 'src/**/*.test.{ts,tsx}', 'src/figma/**'], rollupTypes: false }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      // Pinned: Vite otherwise derives the stylesheet name from the package
      // name, so renaming the package would silently move the `./styles`
      // export target out from under every consumer.
      cssFileName: 'careconnect-design-system',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        ...externalDeps.map((dep) => new RegExp(`^${dep}($|/)`)),
      ],
    },
  },
  test: {
    reporters: ['default', 'junit'],
    outputFile: './test-results/junit.xml',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'src/**/*.visual.test.tsx'],
        },
      },
      // Storybook Vitest integration — runs stories as tests.
      // See: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      // Visual tests — plain Vitest tests in a real browser. Chromatic's plugin
      // archives the DOM at the end of each test (and at every takeSnapshot()),
      // and `chromatic --vitest` uploads those archives as a separate Chromatic
      // project. See: https://www.chromatic.com/docs/vitest/
      {
        extends: true,
        plugins: [chromaticPlugin({ turboSnap: true })],
        // The plugin's browser runtime uses top-level await, which Vite 6's
        // dependency pre-bundler (ES2020 target) rejects; serve it as-is.
        optimizeDeps: { exclude: ['@chromatic-com/vitest'] },
        test: {
          name: 'visual',
          include: ['src/**/*.visual.test.tsx'],
          setupFiles: ['./vitest.visual.setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
