# @careconnect/design-system-native

## 1.1.0

### Minor Changes

- f48a6ce: Colors match the web design system's WCAG AA palette: darker `textMuted`, `primaryLight`, `accent`, `success`, `error` and `info`, plus new `*Text` and `*Subtle` status colors. `Alert` and `Badge` use them, which fixes the low-contrast warning badge text.

## 1.0.0

### Major Changes

- 3ead6b9: Promote to 1.0.0 so every frontend and design-system release unit is on a stable 1.x version, matching the EHR and Portal. No API or behavior changes.

## 0.1.0

### Minor Changes

- 056e1a9: New React Native component library on the same design tokens as `@careconnect/design-system` (a unit test fails if they drift): Text, Button, Badge, Card, TextField, ChipGroup, OptionCard, ListRow, StatCard, Avatar, Alert, EmptyState, Spinner, LoadingState, StepProgress, SlotPicker, MessageBubble and Screen. `MotionProvider` / `useMotion` let animated components render a fixed frame for visual tests and for users with Reduce Motion on.
