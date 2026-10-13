# CareConnect

[![CI](https://github.com/chromaui-demo/careconnect/actions/workflows/ci.yml/badge.svg)](https://github.com/chromaui-demo/careconnect/actions/workflows/ci.yml)
[![Chromatic](https://github.com/chromaui-demo/careconnect/actions/workflows/chromatic.yml/badge.svg)](https://github.com/chromaui-demo/careconnect/actions/workflows/chromatic.yml)
[![Deploy](https://github.com/chromaui-demo/careconnect/actions/workflows/deploy.yml/badge.svg)](https://github.com/chromaui-demo/careconnect/actions/workflows/deploy.yml)
[![Staging](https://github.com/chromaui-demo/careconnect/actions/workflows/staging-status.yml/badge.svg)](https://github.com/chromaui-demo/careconnect/actions/workflows/staging-status.yml)
[![Production](https://github.com/chromaui-demo/careconnect/actions/workflows/production-status.yml/badge.svg)](https://github.com/chromaui-demo/careconnect/actions/workflows/production-status.yml)

What the deploy badges report is explained in the [Deployment Guide](deploy/DEPLOYMENT.md#automated-deploys-staging--production).

CareConnect is a demo electronic medical record system for outpatient clinics. It is modeled on [Ottehr](https://github.com/masslight/ottehr) but built on its own component library rather than Material UI. The reference deployment runs on **se-tools.net**; you can also run it on a laptop or a single Ubuntu VM.

The repository contains a REST **API**, a staff-facing **EHR**, a **Patient Portal** for the web and a **React Native** version of it for iOS and Android, and the two **design systems** they are built from (web and native, sharing one set of tokens). They share one monorepo so that a component change and the application code that uses it land in the same commit. Each piece is nonetheless owned by its own team and is versioned, tagged, released, and deployed independently; see [Versioning & Releases](#versioning--releases).

To find the current version of any piece, check [GitHub Releases](https://github.com/chromaui-demo/careconnect/releases) (tags follow the pattern `@careconnect/<unit>@<version>`) or the `CHANGELOG.md` in that piece's directory. The release process is documented in [docs/RELEASE.md](docs/RELEASE.md).

---

## Table of Contents

- [Architecture](#architecture)
- [Applications & Ports](#applications--ports)
- [Demo Accounts & Data](#demo-accounts--data)
- [Feature Modules](#feature-modules)
- [Quick Start (Development)](#quick-start-development)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Mobile app](#mobile-app)
- [Testing](#testing)
- [Deployment](#deployment)
- [Versioning & Releases](#versioning--releases)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Architecture

CareConnect is an npm workspaces monorepo. A single Express REST API serves every frontend and persists to SQLite. The staff EHR (which includes a role-gated Billing section) and the Patient Portal both authenticate with JWTs.

```
┌───────────────────────────────────────────────┐
│              Browser clients                    │
├──────────────┬──────────────┬───────────────────┤
│   Portal     │     EHR      │    (Telemed)      │
│  :4001       │   :4000      │    WebRTC         │
│              │ (+ Billing)  │                   │
└──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │                │
       └──────────────┴──────┬─────────┘
                             │  /api/* (proxied in prod)
                      ┌──────▼──────┐
                      │  Express API │
                      │   :5000      │
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │   SQLite    │
                      │ node:sqlite │
                      └─────────────┘
```

In production, nginx serves the frontend builds and proxies `/api/` to the API, which runs as a systemd service. The VM layout is in the [Deployment Guide](deploy/DEPLOYMENT.md#production-layout-ubuntu-vm).

### Shared packages

| Package | Role |
|---|---|
| `@careconnect/types` | Shared TypeScript types and intake questionnaire schemas |
| `@careconnect/api-client` | Fetch wrapper and WebRTC helper used by the frontends |
| `@careconnect/mock-data` | Legacy static data; the API has replaced it in most flows |
| `@careconnect/design-system` | UI components, design tokens, and Storybook (see [Design System](#design-system)) |
| `@careconnect/design-system-native` | React Native components on the same tokens (see [Mobile app](#mobile-app)) |

---

## Applications & Ports

| Application | Workspace | Dev port | Description |
|---|---|---|---|
| API | `@careconnect/api` | **5000** | Authentication, clinical, admin, billing, fax, and telemed signaling |
| Staff EHR | `@careconnect/ehr` | **4000** | Tracking board, encounters, fax, labs inbox, AI scribe, admin, and role-gated billing (claims, ERAs, patient AR) |
| Patient Portal | `@careconnect/portal` | **4001** | Booking, walk-in registration, paperwork, telemed, and visit history |

In production the frontends are served on ports 80, 443, or 8080 depending on the install mode; see the [Deployment Guide](deploy/DEPLOYMENT.md).

---

## Demo Accounts & Data

### Staff accounts (EHR)

| Email | Password | Name | Role |
|---|---|---|---|
| `admin@se-tools.net` | `CareConnect1!` | Admin User | Administrator |
| `dr.chen@se-tools.net` | `CareConnect1!` | Sarah Chen | Provider |
| `dr.torres@se-tools.net` | `CareConnect1!` | Michael Torres | Provider |
| `staff@se-tools.net` | `CareConnect1!` | Lisa Wong | Staff |
| `billing@se-tools.net` | `CareConnect1!` | Rita Alvarez | Billing |
| `manager@se-tools.net` | `CareConnect1!` | James Patel | Manager |

`CareConnect1!` is the local development password ([`apps/api/src/db/seeded-password.ts`](apps/api/src/db/seeded-password.ts)). Deployed environments use their own: the installer generates `SEEDED_PASSWORD` in `/etc/careconnect/careconnect-api.env`, and the API refuses to seed accounts with the public default under `NODE_ENV=production`. To change an existing environment, run `npm run db:rotate-password --workspace=@careconnect/api` with `NEW_SEEDED_PASSWORD`, then set the same value as `SEEDED_PASSWORD` on the VM and as the environment's `E2E_PASSWORD` secret.

Billing (claims, ERAs, patient AR, and master data) lives inside the EHR at `/billing` and is gated by role. Administrators and Billing users have full view, edit, and delete access; Managers have read-only access; other roles do not see the section.

### Patient accounts (Portal)

| Email | Password | Name | Role |
|---|---|---|---|
| `alice.smith@se-tools.net` | `CareConnect1!` | Alice Smith | Patient |
| `bob.johnson@se-tools.net` | `CareConnect1!` | Bob Johnson | Patient |

Patients see only their own visits, paperwork, and telemed sessions. The same accounts sign in to the web Portal and the mobile app.

### Seeded clinical data

- **Locations:** Main Clinic, Urgent Care West
- **Services:** Urgent Care, Virtual Visit, Follow-up, Annual Physical
- **Appointments:** roughly a dozen patients across the prebooked, in-office, completed, and cancelled statuses
- **Questionnaires:** contact information, medical history, insurance, consent
- **Insurance payers:** Blue Cross Blue Shield, Aetna
- **Billing, fax, and lab inbox samples:** added by migrations when the API starts

### Database location

| Environment | Path |
|---|---|
| Local development | `./data/careconnect.db` (when installed with `deploy/install.sh --local`) |
| Production VM | `/var/lib/careconnect/careconnect.db` |

The database is created and seeded the first time the API starts.

---

## Feature Modules

| Module | Where | Notes |
|---|---|---|
| Appointment booking | Portal | Four-step wizard; virtual and in-person visits |
| Walk-in registration | Portal | Creates the patient record and an in-office visit |
| Intake paperwork | Portal + EHR | Multi-form wizard; responses are harvested into the chart |
| Check-in, cancel, reschedule | Portal | |
| Tracking board | EHR | Filter by status, location, and provider |
| Encounter charting | EHR | Vitals, allergies, medications, HPI, assessment, plan |
| Labs and eRx | EHR encounter | Demo orders only; no external lab or pharmacy integration |
| Unsolicited lab inbox | EHR | Match inbound results to patients |
| AI ambient scribe | EHR encounter | Transcript to draft note to chart |
| Fax in/out | EHR | Simulated PostGrid integration |
| Telemed | Portal + EHR | WebRTC with signaling through the API (STUN only; add TURN for production) |
| RCM billing | EHR (`/billing`, role-gated) | Claims, submission, ERAs, patient AR |
| Admin | EHR | Employees, locations, schedules, questionnaires |
| Reports | EHR | KPIs, incomplete encounters, payments |
| Tasks | EHR | Open task queue |

---

## Quick Start (Development)

### Prerequisites

- **Node.js 24**, the version pinned in [`.nvmrc`](.nvmrc) and used by CI (`nvm use`). The root `engines` field accepts Node 20 or later for running the built API, but the design-system test toolchain requires 22.22 or later, so develop on the `.nvmrc` version.
- **npm 10** or later

### Option A: one-command setup (macOS and Linux)

```bash
git clone https://github.com/chromaui-demo/careconnect.git
cd careconnect
deploy/install.sh --local      # npm ci, builds types + design system + API, writes the API env file
./deploy/start-local.sh        # API :5000, EHR :4000, Portal :4001
```

### Option B: manual dev servers

```bash
npm install
npm run build --workspace=@careconnect/types   # required by the API
npm run ds:build                                # required by EHR and Portal, which import the library's dist/

# Terminal 1: the API needs a JWT secret and database path in its environment
set -a && source deploy/runtime/careconnect-api.env && set +a
npm run api:dev

# Additional terminals
npm run ehr:dev       # http://localhost:4000
npm run portal:dev    # http://localhost:4001
```

The `deploy/runtime/careconnect-api.env` file is written by `deploy/install.sh --local`. If you skipped the installer, run it once, or create the file yourself with `NODE_ENV`, `PORT`, `CARECONNECT_DATA_DIR`, and `JWT_SECRET`.

The per-app `*:dev` scripts call each workspace directly and bypass Turborepo, so they do not rebuild `@careconnect/types` or the design system for you. After changing a component, run `npm run ds:build` (or keep `npm run storybook` open and iterate there); after changing shared types, run `npm run build --workspace=@careconnect/types`.

### Other root scripts

```bash
npm run build         # Turborepo builds every workspace in dependency order
npm run typecheck     # tsc --noEmit in every TypeScript workspace
npm test              # unit tests (API, design system, native design system)
```

The test commands are listed under [Testing](#testing).

### Demo walkthrough

**EHR (`localhost:4000`).** Sign in as `admin@se-tools.net`. From the Tracking Board, start an encounter, then explore Fax, Lab Inbox, Admin, Reports, and the AI Scribe tab on the encounter. Sign in as `billing@se-tools.net` (or `manager@se-tools.net` for read-only access) to see the Billing section and work with claims and ERAs.

**Portal (`localhost:4001`).** Book a visit, complete the paperwork, then try a walk-in or a virtual telemed visit.

---

## Project Structure

```
careconnect/
├── apps/
│   ├── api/              # Express REST API + SQLite
│   ├── ehr/              # Staff EHR (React + Vite; includes role-gated billing)
│   ├── portal/           # Patient portal (React + Vite)
│   ├── portal-mobile/    # Patient portal for iOS + Android (Expo / React Native) + on-device Storybook
│   └── playwright-e2e/   # Playwright end-to-end tests against a running stack
├── packages/
│   ├── design-system/    # UI component library + Storybook
│   ├── design-system-native/ # React Native components on the same tokens
│   ├── types/            # Shared types + questionnaire schemas
│   ├── api-client/       # API client + WebRTC helper
│   └── mock-data/        # Legacy static demo data
├── deploy/               # Install and per-unit deploy scripts, nginx, systemd
│   ├── install.sh        # Ubuntu production installer (all units, from source)
│   ├── install-local.sh  # Local dev setup (no sudo)
│   ├── remote-install.sh # Fresh install, or redeploy CI artifacts, over SSH
│   ├── package-artifact.sh / deploy-artifact.sh / rollback.sh   # one unit at a time
│   ├── update.sh         # Rebuild every unit from source on the VM
│   └── DEPLOYMENT.md     # Full deployment guide
├── docs/                 # RELEASE.md, TESTING.md, FIGMA.md, STORYBOOK-MCP.md
├── scripts/
│   ├── release-units.mjs # The release units and their owning teams
│   └── github-releases.mjs
├── .changeset/           # Pending changesets + config (independent versioning)
├── .github/
│   ├── CODEOWNERS        # Per-unit review ownership
│   └── workflows/        # ci (per unit), release, deploy, chromatic, chromatic-native
├── package.json
└── turbo.json
```

---

## Design System

The design system lives at [`packages/design-system`](packages/design-system) as the private workspace package `@careconnect/design-system`. It ships roughly forty components, spanning form controls, layout, navigation, data display (Table, DataGrid, charts), and clinical widgets such as PatientBanner, VitalSigns, and ScheduleCalendar. The export barrel in [`packages/design-system/src/index.ts`](packages/design-system/src/index.ts) is the authoritative list; Storybook documents each one with healthcare-specific examples.

| Token | Value |
|---|---|
| Primary | Teal `#0D7377` |
| Accent | Coral `#E07A5F` |
| Typeface | Instrument Sans |

```bash
npm run storybook        # browse the components at http://localhost:6006
npm run ds:build         # build the library (the apps depend on its dist/)
npm run test:stories     # run every story as a browser test
npm run test:visual      # run the multi-step visual tests (Chromatic snapshots each step)
```

The apps import it like any other workspace package:

```ts
import { Button, ToastProvider } from '@careconnect/design-system';
import '@careconnect/design-system/styles';
```

Because npm links the workspace locally, `npm run build` builds the library before the apps that consume it. The apps therefore always build against the design system at HEAD: a component change is picked up without a publish or version bump, and a change that breaks the EHR or Portal build fails on the design-system pull request. The design system still carries its own version, changelog, git tag, and GitHub Release, cut by the same release flow as the apps. Component conventions are in [packages/design-system/CONTRIBUTING.md](packages/design-system/CONTRIBUTING.md).

---

## Mobile app

[`apps/portal-mobile`](apps/portal-mobile) is the patient portal as an [Expo](https://expo.dev) (React Native) app for iOS and Android. It talks to the same API through `@careconnect/api-client` and is built from [`@careconnect/design-system-native`](packages/design-system-native), whose tokens mirror the web design system's `tokens.css` (a unit test fails if they drift). The first version covers sign-in, home, visits (list, detail, check-in, cancel), secure messages (inbox, thread, reply), and the full booking flow from visit details to confirmation.

```bash
npm run api:dev                                            # API on :5000
npm run dev --workspace=@careconnect/portal-mobile         # Expo dev server; press i / a for a simulator
npm run storybook --workspace=@careconnect/portal-mobile   # same app, showing Storybook instead
```

Running on a simulator needs Xcode (iOS) or Android Studio (Android); the bundle itself builds anywhere (`npm run build --workspace=@careconnect/portal-mobile`). Set `EXPO_PUBLIC_API_URL` to point a device at a deployed API. Details, including how the Storybook build is captured by Chromatic, are in [apps/portal-mobile/README.md](apps/portal-mobile/README.md).

---

## Testing

```bash
npm test              # unit tests (API, design system, native design system)
npm run test:stories  # every design-system story as a browser test
npm run test:visual   # design-system *.visual.test.tsx flows in a browser
npm run e2e:test      # Playwright end-to-end suite against a running stack
npm run smoke:test    # just its @smoke subset
```

The browser suites use a chromium that `npm install` downloads for you; if it is missing, run `npx playwright install chromium`.

Chromatic reviews visual changes in four separate projects: the design-system Storybook, the Vitest visual tests, the mobile app's React Native Storybook, and the Playwright end-to-end tests run against staging. The [Testing Guide](docs/TESTING.md) covers what each suite tests, when CI runs it, how each Chromatic integration works, and what the tests do not cover yet.

---

## Deployment

The API, EHR, and Portal deploy independently to Ubuntu VMs. A release goes to staging, passes the Playwright end-to-end suite there, and is then promoted to production automatically. You can also run CareConnect on a laptop or install it on a VM by hand.

The [Deployment Guide](deploy/DEPLOYMENT.md) covers the automated pipeline, local and remote installs, install modes, configuration, updates, rollbacks, SSL, and troubleshooting.

---

## Versioning & Releases

CareConnect follows [Semantic Versioning](https://semver.org/) and manages versions with [Changesets](https://github.com/changesets/changesets). There are six release units, each owned by one team, and each is versioned, tagged, released, and (where deployable) deployed independently:

| Unit | Team | Changelog | Tag / GitHub Release | Deployed as |
|---|---|---|---|---|
| `@careconnect/api` | Backend | [apps/api/CHANGELOG.md](apps/api/CHANGELOG.md) | `@careconnect/api@X.Y.Z` | systemd service plus database migrations |
| `@careconnect/ehr` | EHR frontend | [apps/ehr/CHANGELOG.md](apps/ehr/CHANGELOG.md) | `@careconnect/ehr@X.Y.Z` | Static bundle behind nginx |
| `@careconnect/portal` | Portal frontend | [apps/portal/CHANGELOG.md](apps/portal/CHANGELOG.md) | `@careconnect/portal@X.Y.Z` | Static bundle behind nginx |
| `@careconnect/portal-mobile` | Portal frontend | [apps/portal-mobile/CHANGELOG.md](apps/portal-mobile/CHANGELOG.md) | `@careconnect/portal-mobile@X.Y.Z` | Not deployed to a VM; its Storybook app is captured by Chromatic on iOS and Android. App-store distribution is not set up yet |
| `@careconnect/design-system` | Design system | [packages/design-system/CHANGELOG.md](packages/design-system/CHANGELOG.md) | `@careconnect/design-system@X.Y.Z` | Not deployed; the apps consume it at HEAD, Storybook is published through Chromatic, and the Figma library is generated from it ([docs/FIGMA.md](docs/FIGMA.md)) |
| `@careconnect/design-system-native` | Design system | [packages/design-system-native/CHANGELOG.md](packages/design-system-native/CHANGELOG.md) | `@careconnect/design-system-native@X.Y.Z` | Not deployed; `portal-mobile` consumes it at HEAD and its stories ship in that app's Storybook |

The shared packages (`types`, `api-client`, `mock-data`) are versioned independently as well, but they ship inside the units that use them, and bumping one automatically patch-bumps its dependents. The root [CHANGELOG.md](CHANGELOG.md) indexes the per-unit changelogs and preserves the pre-monorepo history.

**Contributing a change.** After making a user-facing change, run `npm run changeset`, select only the workspaces you touched, and commit the generated file with your pull request. Review ownership for each unit is defined in [.github/CODEOWNERS](.github/CODEOWNERS).

**Pipeline.** `ci.yml` runs one job per unit on every pull request; only the units the PR touches do real work. `chromatic.yml` and `chromatic-native.yml` add visual review; see the [Testing Guide](docs/TESTING.md#when-each-suite-runs). On merge to `main`, `release.yml` opens or refreshes a **Version Packages** pull request. When that PR merges, the workflow tags each bumped package, creates a GitHub Release for each release unit, and dispatches `deploy.yml` for each deployable unit (staging, then the end-to-end gate, then production). Details, the one-time GitHub setup, and manual fallbacks are in [docs/RELEASE.md](docs/RELEASE.md).

AI coding agents working in this repository should follow [AGENTS.md](AGENTS.md).

---

## License

MIT. See [LICENSE](LICENSE).

Copyright (c) 2026 Martin Kowalewski

## Acknowledgments

CareConnect is inspired by [Ottehr](https://github.com/masslight/ottehr) by MassLight. It is an independent demo with a different UI stack and a self-hosted backend.
