# @careconnect/ehr

## 1.0.11

### Patch Changes

- 5f1d3c7: Deployed environments no longer use the public demo password. The API reads the seeded accounts' password from `SEEDED_PASSWORD`, which the installer generates on first install, and refuses to seed accounts with the documented default under `NODE_ENV=production`. Creating an employee now requires a password of at least 12 characters, and the EHR's Add Employee dialog asks for one.

## 1.0.10

### Patch Changes

- Updated dependencies [7d1d246]
  - @careconnect/design-system@1.1.1

## 1.0.9

### Patch Changes

- f48a6ce: The claims list's link column has a header for screen readers.
- Updated dependencies [f48a6ce]
  - @careconnect/design-system@1.1.0

## 1.0.8

### Patch Changes

- Updated dependencies [3ead6b9]
  - @careconnect/design-system@1.0.0

## 1.0.7

### Patch Changes

- Updated dependencies [056e1a9]
  - @careconnect/api-client@1.1.0

## 1.0.6

### Patch Changes

- dac6ac2: Upgrade the web apps and the design system to React 19 (19.2.3, the version Expo SDK 57 bundles, so web and a future React Native app share one copy). The design system's `react` / `react-dom` peer range is now `^19.0.0`; consumers on React 18 must upgrade. No component API changes. `useId()` values now render as `_r_N_` instead of `:rN:`.
- Updated dependencies [dac6ac2]
  - @careconnect/design-system@0.5.0

## 1.0.5

### Patch Changes

- Updated dependencies [bc67606]
  - @careconnect/design-system@0.4.0

## 1.0.4

### Patch Changes

- Updated dependencies [a25de7e]
- Updated dependencies [f714324]
  - @careconnect/design-system@0.3.3

## 1.0.3

### Patch Changes

- 01a3cdb: Release and deploy each unit independently. The API, EHR, Portal and design system now have their own versions, changelogs, `@careconnect/<name>@<version>` tags and GitHub Releases, and the three deployable units ship as separate artifacts (`careconnect-<unit>-<version>-<sha>.tar.gz`) through a per-unit staging → production pipeline. Frontends are published as atomic symlinked release directories with instant rollback; API deploys touch only the API's own paths. Deploying one unit no longer restarts or rebuilds the others.
- Updated dependencies [01a3cdb]
  - @careconnect/design-system@0.3.2

## 1.0.2

### Patch Changes

- 86d41ae: Bump `@careconnect/design-system` to 0.3.1, picking up the `--cc-text-sm` typography token update (0.875rem → 1.375rem).
  - @careconnect/types@1.0.2
  - @careconnect/api-client@1.0.2

## 1.0.1

### Patch Changes

- b8b8a38: Bump `@careconnect/design-system` to 0.3.0. See the [release notes](https://github.com/mkowalew-dev/careconnect-design-system/releases/tag/v0.3.0).
  - @careconnect/types@1.0.1
  - @careconnect/api-client@1.0.1

## 1.0.0

### Major Changes

- 218f442: Consolidated the standalone Billing app into the EHR app as a role-gated `/billing` section, and added role-based access control to billing.

  - Added a new `Billing` role. Billing access is now enforced both on the API (`Administrator`/`Billing` get full view/edit/delete, `Manager` gets view-only, all other roles get no access) and in the EHR UI (nav item, routes, and write controls are hidden for users without access).
  - Previously, every billing API route only required being logged in — any authenticated user of any role could view or modify billing data. That gap is now closed.
  - The standalone `apps/billing` app, its dev port (4002), and its separate deployment (nginx server blocks, build step) have been removed. Billing now lives at `/billing` inside the EHR app.
  - Added demo accounts `billing@se-tools.net` (Billing role) and `manager@se-tools.net` (Manager role) to exercise the new access tiers.

### Patch Changes

- Updated dependencies [218f442]
  - @careconnect/types@1.0.0
  - @careconnect/api-client@1.0.0
  - @careconnect/ui@1.0.0

## 0.9.5

### Patch Changes

- dc5df2b: Stop pre-filling and displaying demo credentials on the login screen in production builds. The email/password fields and "Demo: ..." hint are now only populated during local development (`npm run dev`); production builds ship with empty login fields and no credential hint.
- Updated dependencies [6da25ec]
  - @careconnect/ui@0.9.5
  - @careconnect/types@0.9.5
  - @careconnect/api-client@0.9.5

## 0.9.4

### Patch Changes

- @careconnect/ui@0.9.4
- @careconnect/types@0.9.4
- @careconnect/api-client@0.9.4

## 0.9.3

### Patch Changes

- @careconnect/ui@0.9.3
- @careconnect/types@0.9.3
- @careconnect/api-client@0.9.3

## 0.9.2

### Patch Changes

- @careconnect/ui@0.9.2
- @careconnect/types@0.9.2
- @careconnect/api-client@0.9.2

## 0.9.1

### Patch Changes

- @careconnect/ui@0.9.1
- @careconnect/types@0.9.1
- @careconnect/api-client@0.9.1

## 0.9.0

### Patch Changes

- @careconnect/ui@0.9.0
- @careconnect/types@0.9.0
- @careconnect/api-client@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [72b214d]
  - @careconnect/ui@0.8.0
  - @careconnect/types@0.8.0
  - @careconnect/api-client@0.8.0

## 0.7.1

### Patch Changes

- @careconnect/ui@0.7.1
- @careconnect/types@0.7.1
- @careconnect/api-client@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies [30ae721]
  - @careconnect/ui@0.7.0
  - @careconnect/types@0.7.0
  - @careconnect/api-client@0.7.0

## 0.6.1

### Patch Changes

- Updated dependencies [c741a6b]
  - @careconnect/ui@0.6.1
  - @careconnect/types@0.6.1
  - @careconnect/api-client@0.6.1

## 0.6.0

### Patch Changes

- Updated dependencies [9ca5d1f]
  - @careconnect/ui@0.6.0
  - @careconnect/types@0.6.0
  - @careconnect/api-client@0.6.0

## 0.5.0

### Patch Changes

- @careconnect/ui@0.5.0
- @careconnect/types@0.5.0
- @careconnect/api-client@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [b44fb5f]
- Updated dependencies [b44fb5f]
  - @careconnect/ui@0.4.0
  - @careconnect/types@0.4.0
  - @careconnect/api-client@0.4.0

## 0.3.1

### Patch Changes

- @careconnect/ui@0.3.1
- @careconnect/types@0.3.1
- @careconnect/api-client@0.3.1

## 0.3.0

### Patch Changes

- @careconnect/ui@0.3.0
- @careconnect/types@0.3.0
- @careconnect/api-client@0.3.0
