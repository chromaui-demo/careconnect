# @careconnect/portal-mobile

## 1.0.3

### Patch Changes

- Updated dependencies [482e198]
  - @careconnect/api-client@1.1.1

## 1.0.2

### Patch Changes

- 7d1d246: Update Storybook to 10.6.2 and the Visual Tests addon (`@chromatic-com/storybook`) to 5.5.1 for a security fix. Copies of Storybook pinned by `@chromatic-com/vitest` and `@chromatic-com/playwright` are now forced to the fixed version too.

## 1.0.1

### Patch Changes

- Updated dependencies [f48a6ce]
  - @careconnect/design-system-native@1.1.0

## 1.0.0

### Major Changes

- 3ead6b9: Promote to 1.0.0 so every frontend and design-system release unit is on a stable 1.x version, matching the EHR and Portal. No API or behavior changes.

### Patch Changes

- Updated dependencies [3ead6b9]
  - @careconnect/design-system-native@1.0.0

## 0.1.0

### Minor Changes

- 056e1a9: New React Native (Expo) patient portal for iOS and Android: patient sign-in with the session kept in the device keychain, home with the next visit, visits list and detail (paperwork status, check-in, cancel), secure messages (inbox, thread, reply), and the full booking flow from visit details through time, patient information and review to confirmation. Its Storybook (every screen state from fixed fixtures, plus the native design-system stories) is captured by Chromatic on iOS and Android.

### Patch Changes

- Updated dependencies [056e1a9]
- Updated dependencies [056e1a9]
  - @careconnect/api-client@1.1.0
  - @careconnect/design-system-native@0.1.0
