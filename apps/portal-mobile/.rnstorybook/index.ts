import AsyncStorage from '@react-native-async-storage/async-storage';
import { view } from './storybook.requires';

// Chromatic sets these when it builds and drives the app; locally they are
// unset and Storybook shows its on-device UI.
const env = process.env;

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
  onDeviceUI: env.EXPO_PUBLIC_STORYBOOK_DISABLE_UI !== 'true',
  enableWebsockets: env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_HOST !== undefined,
  host: env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_HOST,
  port: env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_PORT ? Number(env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_PORT) : undefined,
  secured: env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_SECURED === 'true',
});

export default StorybookUIRoot;
