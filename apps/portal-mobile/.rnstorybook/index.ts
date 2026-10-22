import AsyncStorage from '@react-native-async-storage/async-storage';
import { view } from './storybook.requires';

// Chromatic sets the WEBSOCKET_* and DISABLE_UI variables when it builds and
// drives the app; locally they are unset and Storybook shows its on-device UI.
// Selection isn't persisted, so every launch opens on the story Chromatic asks
// for rather than the last one viewed.
//
// Write each variable out as `process.env.EXPO_PUBLIC_…`: Expo inlines only
// that exact form into a release bundle. Read through an alias, they are
// undefined in the APK Chromatic installs, and the app never connects.
const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
  onDeviceUI: process.env.EXPO_PUBLIC_STORYBOOK_DISABLE_UI !== 'true',
  shouldPersistSelection: false,
  enableWebsockets: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  host: process.env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_HOST || 'localhost',
  port: parseInt(process.env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_PORT || '7007', 10),
  secured: process.env.EXPO_PUBLIC_STORYBOOK_WEBSOCKET_SECURED === 'true',
});

export default StorybookUIRoot;
