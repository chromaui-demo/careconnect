# @careconnect/design-system-native

CareConnect's React Native components: the native counterpart of [`@careconnect/design-system`](../design-system). Owned by the Design system team; release unit `design-system-native`.

It is consumed as TypeScript source by [`apps/portal-mobile`](../../apps/portal-mobile), at HEAD, like the web library is by the web apps. A breaking change fails that app's typecheck or bundle on the same pull request. The stories here are built into the mobile app's Storybook and captured by Chromatic on Android; there is no separate Storybook host.

## Tokens

[`src/tokens/tokens.ts`](src/tokens/tokens.ts) mirrors the web `src/styles/tokens.css`, which stays the source of truth. Colors are copied as-is, rem values are converted at 16px, and the CSS shadows become `shadow*`/`elevation` props. `tokens.test.ts` parses `tokens.css` and fails if any value or key differs, so a token change has to land in both places.

## Components

`Text`, `Button`, `Badge` (with `appointmentStatusBadge` / `formatStatusLabel`), `Card`, `TextField`, `ChipGroup`, `OptionCard`, `ListRow`, `StatCard`, `Avatar`, `Alert`, `EmptyState`, `Spinner`, `LoadingState`, `StepProgress`, `SlotPicker`, `MessageBubble`, `Screen`. [`src/index.ts`](src/index.ts) is the authoritative list.

They are shaped for touch and small screens, not ported one-to-one from the web library. For example, `SlotPicker` (a day strip plus a time grid) stands in for the web `ScheduleCalendar`, and `ListRow` stands in for tables.

## Motion

Animated components read `useMotion()`. It returns `false` under `<MotionProvider animate={false}>` or when the OS **Reduce Motion** setting is on, and the component then renders a fixed frame. Storybook sets this for Chromatic captures, so animated states are snapshotted deterministically rather than excluded. Follow the same pattern for any new animation.

## Conventions

- One folder per component with its `*.stories.tsx` next to it. Story titles get the `Design System/` prefix from the app's Storybook config.
- Pure logic (no `react-native` import) goes in its own module with a `*.test.ts` (`npm test` runs these under Node). Components are exercised through stories.
- Accessibility: set `accessibilityRole`/`accessibilityState` on interactive elements and keep touch targets at 44pt or more.
