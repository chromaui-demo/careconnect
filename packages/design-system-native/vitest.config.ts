import { defineConfig } from 'vitest/config';

// Unit tests cover the pure modules (tokens, status and slot helpers) under
// Node. Components and stories are exercised by Storybook on device and by
// Chromatic, since react-native itself can't load outside Metro.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
