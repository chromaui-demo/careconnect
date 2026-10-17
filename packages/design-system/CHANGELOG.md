# @careconnect/design-system

## 1.1.2

### Patch Changes

- 7839330: Charts draw straight to their final state when the user prefers reduced motion. Recharts and ECharts animated in JavaScript regardless of the OS setting, which the global reduced-motion CSS rule could not stop.

## 1.1.1

### Patch Changes

- 7d1d246: Update Storybook to 10.6.2 and the Visual Tests addon (`@chromatic-com/storybook`) to 5.5.1 for a security fix. Copies of Storybook pinned by `@chromatic-com/vitest` and `@chromatic-com/playwright` are now forced to the fixed version too.

## 1.1.0

### Minor Changes

- f48a6ce: Every story now passes its accessibility checks in light and dark themes, and story tests fail on any new violation.
  
  - Text and fill colors meet WCAG AA contrast: `--cc-text-muted`, `--cc-primary-light`, `--cc-accent`, `--cc-success`, `--cc-error` and `--cc-info` are darker shades of the same hues.
  - New `--cc-{primary,success,warning,error,info}-text` tokens for colored text, and `--cc-{success,warning,error,info}-subtle` tokens for tinted backgrounds. The dark theme overrides both, so badges, alerts, tabs and navigation stay readable in dark mode.
  - `DataGrid` columns accept `hideHeader` to keep a header for screen readers without showing it.
  - `Progress` names its progress bar from `label`, or from `aria-label` when there is no label.
  - `ScheduleCalendar` accepts `initialDate` and hides its decorative toolbar icons from assistive technology.
  - `AppointmentQueueCard` no longer renders a `<header>` landmark.

## 1.0.0

### Major Changes

- 3ead6b9: Promote to 1.0.0 so every frontend and design-system release unit is on a stable 1.x version, matching the EHR and Portal. No API or behavior changes.

## 0.5.0

### Minor Changes

- dac6ac2: Upgrade the web apps and the design system to React 19 (19.2.3, the version Expo SDK 57 bundles, so web and a future React Native app share one copy). The design system's `react` / `react-dom` peer range is now `^19.0.0`; consumers on React 18 must upgrade. No component API changes. `useId()` values now render as `_r_N_` instead of `:rN:`.

## 0.4.0

### Minor Changes

- bc67606: Add an opt-in dark theme: set `data-theme="dark"` on `<html>` (or any ancestor) to switch the neutral tokens. Nothing changes for apps that don't set it. Storybook gains a light/dark toolbar switch and named mobile/tablet/desktop viewports, and Chromatic now captures the Card stories in both themes and the LoginScreen stories at mobile and desktop widths.

## 0.3.3

### Patch Changes

- a25de7e: Figma ↔ Storybook bridge: every story shows its Figma frame in a new Design tab (links kept in `src/figma/links.json`), design tokens are exported to `src/figma/tokens.json` (W3C DTCG, `npm run tokens:export`) for Figma variable import, and new `Foundations/Tokens` sheets document colors, type, spacing, radius and elevation. Workflow in docs/FIGMA.md.
- f714324: Fix two design tokens that broke their scales: `--cc-text-sm` is now 0.875rem (was 1.375rem, larger than `--cc-text-base`) and `--cc-space-4` is 1rem (was 6rem). Small text and every component that uses the 16px spacing step tighten up accordingly.

## 0.3.2

### Patch Changes

- 01a3cdb: Release and deploy each unit independently. The API, EHR, Portal and design system now have their own versions, changelogs, `@careconnect/<name>@<version>` tags and GitHub Releases, and the three deployable units ship as separate artifacts (`careconnect-<unit>-<version>-<sha>.tar.gz`) through a per-unit staging → production pipeline. Frontends are published as atomic symlinked release directories with instant rollback; API deploys touch only the API's own paths. Deploying one unit no longer restarts or rebuilds the others.

## 0.3.1

### Patch Changes

- 4ccb63e: Update `--cc-text-sm` typography token (0.875rem → 1.375rem), affecting small text sizing across components that consume it.

## 0.3.0

### Minor Changes

- 3705c81: Add `appVersion` and `designSystemVersion` props to `LoginScreen`, rendered as a small footer line when provided. Also export a `DESIGN_SYSTEM_VERSION` constant from the package root so consumers don't need to hardcode the design system's own version.

## 0.2.2

### Patch Changes

- 3e6c304: Add `tslib` as an explicit dependency. `echarts-for-react` (used internally by the chart components) imports it via a compiled helper but never declared it as a dependency itself, so consumers whose own dependency tree didn't happen to hoist a `tslib` from elsewhere would fail to resolve it at build time.

## 0.2.1

### Patch Changes

- 7edf6c2: Fix missing design tokens/reset in published CSS; externalize runtime dependencies from the build to reduce bundle size and avoid duplicate copies in consumers.

## 0.2.0

### Minor Changes

- 3733419: Initial extraction of the CareConnect design system as a standalone, independently-versioned package.
