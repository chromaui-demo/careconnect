import type { StorybookConfig } from '@storybook/react-vite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this workspace when npm nests addons beside its package.json.
const getAbsolutePath = (packageName: string) =>
  dirname(fileURLToPath(import.meta.resolve(`${packageName}/package.json`)));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    '@storybook/addon-themes',
    '@storybook/addon-designs',
    '@storybook/addon-vitest',
    '@storybook/addon-mcp',
    'storybook-addon-pseudo-states',
    '@chromatic-com/storybook',
  ].map(getAbsolutePath),
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  staticDirs: ['../public'],
  // The components manifest feeds the Storybook MCP docs tools, locally at
  // localhost:6006/mcp and on every Chromatic build at <permalink>/mcp. Stated
  // explicitly so agent context never depends on a default; see docs/STORYBOOK-MCP.md.
  features: {
    componentsManifest: true,
  },
  // The root vite.config.ts is tuned for the library build (lib mode, React and
  // every runtime dependency externalized, .d.ts emission). Storybook merges
  // that config in, so strip the parts that only make sense when producing
  // dist/ — otherwise `storybook build` emits a library instead of a site,
  // fails to resolve the externalized deps at runtime, and scatters .d.ts
  // files through storybook-static/.
  viteFinal: async (viteConfig) => {
    delete viteConfig.build?.lib;
    delete viteConfig.build?.rollupOptions;
    viteConfig.plugins = (viteConfig.plugins ?? [])
      .flat(Infinity)
      .filter(
        (plugin) =>
          !(
            plugin &&
            typeof plugin === 'object' &&
            'name' in plugin &&
            typeof plugin.name === 'string' &&
            /^unplugin[-:]dts$/.test(plugin.name)
          ),
      );
    return viteConfig;
  },
};

export default config;
