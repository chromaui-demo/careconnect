import type { Preview } from '@storybook/react-native';
import { MotionProvider, colors } from '@careconnect/design-system-native';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Chromatic builds the Storybook app with its on-device UI turned off; that is
// the signal that a run is a capture rather than a person browsing stories.
// Motion is switched off for captures so animated components (Spinner) render
// one fixed frame — the same pixels on every run — instead of being excluded.
const capturing = process.env.EXPO_PUBLIC_STORYBOOK_DISABLE_UI === 'true';

const preview: Preview = {
  decorators: [
    (Story, { parameters }) => (
      <SafeAreaProvider>
        <MotionProvider animate={capturing ? false : undefined}>
          {parameters.layout === 'fullscreen' ? (
            // Screens shown under a navigation header in the app skip the top
            // inset; supply it here so no story renders under the status bar.
            // The native safe-area view measures real overlap, so screens that
            // pad themselves aren't inset twice.
            <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
              <Story />
            </SafeAreaView>
          ) : (
            // Padded canvas that also keeps component stories clear of the
            // status bar, which Chromatic's captures include.
            <View style={{ flex: 1, padding: 16, paddingTop: 64, backgroundColor: colors.bg }}>
              <Story />
            </View>
          )}
        </MotionProvider>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
