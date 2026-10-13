// Expo's default config already handles the npm-workspaces monorepo (watch
// folders and node_modules lookup from the repo root). withStorybook adds the
// require.context transform the story globs need, regenerates
// .rnstorybook/storybook.requires.ts on start, and strips Storybook out of the
// bundle entirely unless EXPO_PUBLIC_STORYBOOK_ENABLED is set.
const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const config = getDefaultConfig(__dirname);

// The shared workspace packages (@careconnect/types, api-client) are consumed
// as TypeScript source and use ESM-style `./file.js` specifiers for `file.ts`,
// which the Node API needs. TypeScript resolves those; Metro doesn't, so retry
// a failed relative `.js` import without its extension.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest;
  try {
    return resolve(context, moduleName, platform);
  } catch (error) {
    if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
      return resolve(context, moduleName.slice(0, -3), platform);
    }
    throw error;
  }
};

module.exports = withStorybook(config, {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  configPath: './.rnstorybook',
});
