import type { StorybookConfig } from '@storybook/react-native';

// Two sources: the native design system's component stories and this app's
// screen stories (presentational screens rendered with fixture data). Both are
// built into one Storybook app, which is what Chromatic installs on its iOS
// simulators and Android emulators.
//
// No on-device addons: Chromatic's React Native capture doesn't work with
// them on Storybook 10 yet.
const main: StorybookConfig = {
  stories: [
    { directory: '../../../packages/design-system-native/src', titlePrefix: 'Design System', files: '**/*.stories.?(ts|tsx)' },
    { directory: '../src/screens', titlePrefix: 'Screens', files: '**/*.stories.?(ts|tsx)' },
  ],
  deviceAddons: [],
};

export default main;
