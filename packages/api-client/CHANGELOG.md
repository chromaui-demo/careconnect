# @careconnect/api-client

## 1.1.0

### Minor Changes

- 056e1a9: Add `configureApiBase(url)` so clients where `/api` doesn't resolve (the React Native app) can target an absolute API origin. The Vite `import.meta.env` read is now optional, so the client also loads under React Native.

## 1.0.2

### Patch Changes

- @careconnect/types@1.0.2

## 1.0.1

### Patch Changes

- @careconnect/types@1.0.1

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

## 0.9.5

## 0.9.4

## 0.9.3

## 0.9.2

## 0.9.1

## 0.9.0

## 0.8.0

## 0.7.1

## 0.7.0

## 0.6.1

## 0.6.0

## 0.5.0

## 0.4.0

## 0.3.1

## 0.3.0
