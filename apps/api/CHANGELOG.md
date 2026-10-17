# @careconnect/api

## 1.1.1

### Patch Changes

- 26e6434: Requests that leave optional fields out no longer fail with a server error. Registering a walk-in from the EHR (which sends no phone or email) and saving any section of an encounter chart both failed before.
- 26e6434: Patients and clinical staff can read the list of services again. Booking from the portal home page showed no services to choose from, and the EHR tracking board's service filter was empty for Staff and Provider users.
- 26e6434: Patients registered after the initial seed no longer gain invented demo visits, claims, labs and messages when the API restarts. Demo history is now limited to the seeded demo patients.

## 1.1.0

### Minor Changes

- 5f1d3c7: Deployed environments no longer use the public demo password. The API reads the seeded accounts' password from `SEEDED_PASSWORD`, which the installer generates on first install, and refuses to seed accounts with the documented default under `NODE_ENV=production`. Creating an employee now requires a password of at least 12 characters, and the EHR's Add Employee dialog asks for one.

## 1.0.4

### Patch Changes

- 056e1a9: The API deploy artifact now installs only the API's own production dependencies (`npm ci --workspace=@careconnect/api`) instead of every workspace's, which keeps the frontends' and the mobile app's packages out of the server artifact.

## 1.0.3

### Patch Changes

- 01a3cdb: Release and deploy each unit independently. The API, EHR, Portal and design system now have their own versions, changelogs, `@careconnect/<name>@<version>` tags and GitHub Releases, and the three deployable units ship as separate artifacts (`careconnect-<unit>-<version>-<sha>.tar.gz`) through a per-unit staging → production pipeline. Frontends are published as atomic symlinked release directories with instant rollback; API deploys touch only the API's own paths. Deploying one unit no longer restarts or rebuilds the others.

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

### Patch Changes

- @careconnect/types@0.9.5

## 0.9.4

### Patch Changes

- 568a958: Remove outdated Ottehr feature-comparison table from README.
  - @careconnect/types@0.9.4

## 0.9.3

### Patch Changes

- 9c123f4: Fix LICENSE mismatch (now MIT to match README) and remove stale internal-only references (Cursor rules file, deleted Ottehr parity doc) from project docs.
  - @careconnect/types@0.9.3

## 0.9.2

### Patch Changes

- fb60957: Expand demo seed data to 90 days of history for all patients and staff across EHR, portal, and billing workflows.
  - @careconnect/types@0.9.2

## 0.9.1

### Patch Changes

- 79fd103: Enrich Alice and Bob demo patients with complete portal, EHR, and billing workflow data on seed and migration.
  - @careconnect/types@0.9.1

## 0.9.0

### Patch Changes

- @careconnect/types@0.9.0

## 0.8.0

### Patch Changes

- @careconnect/types@0.8.0

## 0.7.1

### Patch Changes

- @careconnect/types@0.7.1

## 0.7.0

### Patch Changes

- @careconnect/types@0.7.0

## 0.6.1

### Patch Changes

- @careconnect/types@0.6.1

## 0.6.0

### Patch Changes

- @careconnect/types@0.6.0

## 0.5.0

### Minor Changes

- 2d074b1: Add Ottehr full-surface workflow parity across EHR, Portal, and Billing apps with expanded API routes, parity matrix documentation, and simulated vendor integrations for billing and clinical modules.

### Patch Changes

- @careconnect/types@0.5.0

## 0.4.0

### Patch Changes

- @careconnect/types@0.4.0

## 0.3.1

### Patch Changes

- 29d3e81: Fix release tagging for private monorepo and clean legacy install directories during deploy sync.
  - @careconnect/types@0.3.1

## 0.3.0

### Minor Changes

- 471ec77: CareConnect EMR demo: Express/SQLite API, EHR, authenticated patient Portal, Billing, Storybook UI, Ubuntu deployment (nginx/systemd, remote install, Cloudflare Tunnel docs), Changesets CI/release, agent guidance, portal patient login with API scoping, staff login UX, and installer CONFIG_DIR fix.

### Patch Changes

- @careconnect/types@0.3.0
