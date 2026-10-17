# Testing

This guide describes every automated test suite in CareConnect: what each one covers, how to run it, when CI runs it, and how it reports to Chromatic. It ends with the gaps in coverage, so you know what a green build does not prove.

---

## Table of Contents

1. [Overview](#overview)
2. [Running the tests](#running-the-tests)
3. [Unit tests](#unit-tests)
4. [Story tests (Storybook + Vitest)](#story-tests-storybook--vitest)
5. [Vitest visual tests](#vitest-visual-tests)
6. [End-to-end tests (Playwright)](#end-to-end-tests-playwright)
7. [Mobile (React Native Storybook)](#mobile-react-native-storybook)
8. [Chromatic integrations](#chromatic-integrations)
9. [When each suite runs](#when-each-suite-runs)
10. [Coverage gaps](#coverage-gaps)

---

## Overview

| Suite | Tool | Where | Checks | Chromatic project |
|---|---|---|---|---|
| API unit tests | `node:test` | [`apps/api/src/db/*.test.ts`](../apps/api/src/db) | Migrations and database backups | — |
| Design-system unit tests | Vitest (jsdom) | `packages/design-system/src/**/*.test.tsx` | Component markup, Figma token export | — |
| Native design-system unit tests | Vitest (Node) | `packages/design-system-native/src/**/*.test.ts` | Token parity with the web, pure helpers | — |
| Story tests | Storybook Vitest addon, Playwright chromium | every `packages/design-system/src/**/*.stories.tsx` | Every story renders; `play` functions pass; accessibility checks | **Storybook** |
| Vitest visual tests | Vitest browser mode, Chromatic Vitest plugin | `packages/design-system/src/**/*.visual.test.tsx` | Multi-step flows and compositions | **Vitest** |
| End-to-end tests | Playwright | [`apps/playwright-e2e`](../apps/playwright-e2e) | A deployed stack: sign-in, navigation, role access, build version | **Playwright** |
| Mobile Storybook | Storybook for React Native | `apps/portal-mobile` + `packages/design-system-native` stories | Screens and native components render | **React Native** |

Chromatic adds visual regression review on top of four of these suites. Each framework has its own Chromatic project, token, and baseline; see [Chromatic integrations](#chromatic-integrations).

---

## Running the tests

Use the Node version in [`.nvmrc`](../.nvmrc) (`nvm use`). The design-system browser suites need Node 22.22 or later.

```bash
npm test              # unit tests: API, design system, native design system
npm run test:stories  # every design-system story as a browser test
npm run test:visual   # design-system *.visual.test.tsx flows in a browser
npm run typecheck     # tsc --noEmit in every TypeScript workspace

# Against a running stack (local or deployed)
export EHR_URL=http://localhost:4000 PORTAL_URL=http://localhost:4001
npm run e2e:test      # the full Playwright suite (the staging gate)
npm run smoke:test    # only the @smoke tests (what production runs)
```

The three Playwright-backed suites (`test:stories`, `test:visual`, and the end-to-end suite) drive a real chromium. `npm install` downloads it through a `postinstall` hook ([`scripts/install-playwright-browsers.mjs`](../scripts/install-playwright-browsers.mjs)), so there is no separate setup step. The hook is a no-op once the browser is cached and never fails the install: a blocked download prints a warning. It is skipped when `CI` is set (the workflows install a browser only in the jobs that need one) and when `CARECONNECT_SKIP_PLAYWRIGHT_BROWSERS=1`, which VM builds set. To install the browser by hand, run `npx playwright install chromium`.

`npm test` excludes the end-to-end suite because it needs a running stack.

---

## Unit tests

### API (`@careconnect/api`)

Run with Node's built-in test runner (`node --import tsx --test`). They cover the database layer that every deploy depends on:

- **Migrator** (`migrator.test.ts`): the `schema_migrations` table is created once; pending migrations apply in order and are recorded; a second run skips them; a failed migration is not marked applied.
- **Migration set** (`migrations.test.ts`): the full migration list applies once and is a no-op on a second run against the same database.
- **Migration CLI** (`run-migrations.test.ts`): the command that `deploy-artifact.sh` runs before restarting the API exits 0 and creates the table.
- **Backups** (`backup.test.ts`): `backupDatabase` copies the live file, and returns an empty string without throwing when no database exists yet.

Each test points `CARECONNECT_DB_PATH` at a throwaway file, so nothing touches a real database.

### Design system (`@careconnect/design-system`)

The `unit` project in [`vite.config.ts`](../packages/design-system/vite.config.ts) runs in jsdom and excludes the visual tests.

- **Component snapshots**: `PatientBanner` and `StatCard`, with required props only and with every optional part, compared with committed `__snapshots__`.
- **Figma tokens** ([`src/figma/tokens.test.ts`](../packages/design-system/src/figma/tokens.test.ts)): `src/figma/tokens.json` must match `tokens.css`, so the test fails until you run `npm run tokens:export` after a token change. It also rejects a token the exporter cannot classify, and checks that `links.json` holds only Figma URLs. See [FIGMA.md](FIGMA.md).

Results are written to `packages/design-system/test-results/junit.xml`.

### Native design system (`@careconnect/design-system-native`)

Run in Node: React Native cannot load outside Metro, so only pure modules are unit-tested.

- **Token drift** ([`src/tokens/tokens.test.ts`](../packages/design-system-native/src/tokens/tokens.test.ts)): every color in the web `tokens.css` exists in the native tokens with the same value. Turborepo lists `tokens.css` as an input of this test, so a web-only token change still re-runs it.
- **Helpers**: appointment status to badge variant mapping, and grouping booking slots by local day.

---

## Story tests (Storybook + Vitest)

Every story in the web design system is also a test. The `storybook` project in [`vite.config.ts`](../packages/design-system/vite.config.ts) uses the [Storybook Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) to run each story in headless chromium:

- **Render**: a story that throws fails the run.
- **Interactions**: stories with a `play` function (clicking, typing, keyboard navigation, selecting options, uploading files) run it and fail on any failed assertion.
- **Accessibility**: `@storybook/addon-a11y` checks each story with axe, and any violation fails the story (`a11y.test: 'error'` in [`.storybook/preview.ts`](../packages/design-system/.storybook/preview.ts)). The story tests run in the light theme; Chromatic's accessibility tests also audit the stories' dark-theme modes.

Run them with `npm run test:stories`, or from the Storybook UI (`npm run storybook`) with the testing widget. Results are written to `test-results/junit-stories.xml`.

The same stories are what Chromatic snapshots for the **Storybook** project. Story files opt into extra Chromatic captures with `parameters.chromatic.modes` (light and dark theme, mobile and desktop viewports, defined in [`.storybook/modes.ts`](../packages/design-system/.storybook/modes.ts)); each mode is a separate snapshot, so they are added only where a theme or viewport matters.

---

## Vitest visual tests

A story captures one state of one component. `*.visual.test.tsx` files are plain Vitest tests, run in a real browser, for what a story cannot hold: flows that click through several states, compositions of several components, and the same flow under different display conditions. [Chromatic's Vitest plugin](https://www.chromatic.com/docs/vitest/) archives the DOM at the end of every test and at every `takeSnapshot()` call, and Chromatic renders and diffs those archives.

| Test | What it covers |
|---|---|
| [`DataGrid.visual.test.tsx`](../packages/design-system/src/components/DataGrid/DataGrid.visual.test.tsx) | A claims worklist: sorting, searching, and the empty state |
| [`CommandPalette.visual.test.tsx`](../packages/design-system/src/components/CommandPalette/CommandPalette.visual.test.tsx) | Keyboard navigation through filtered results; the active result under Windows high contrast (`forcedColors: 'active'`) |
| [`flows/DischargePatient.visual.test.tsx`](../packages/design-system/src/flows/DischargePatient.visual.test.tsx) | Patient banner, confirm dialog, and toast composed the way the EHR uses them |

The assertions are real: `npm run test:visual` fails on a broken assertion, and CI runs it in the `design-system` job. Component flows sit next to their component; flows that span components go in `src/flows/`. How to write one is in [packages/design-system/CONTRIBUTING.md § Vitest visual tests](../packages/design-system/CONTRIBUTING.md#vitest-visual-tests).

---

## End-to-end tests (Playwright)

[`apps/playwright-e2e`](../apps/playwright-e2e/README.md) tests a deployed stack (the EHR, the Portal, and the API behind them) through a real browser. It is the gate between staging and production: the full suite runs against staging after every deploy, and production deploys only if it passes. After a production deploy, only the tests tagged `@smoke` run.

| Area | Tests | `@smoke` |
|---|---|---|
| API (request only, no browser) | Health endpoint reports healthy; the deployed build is the one serving; unauthenticated requests are rejected | first two |
| EHR sign-in | Staff sign in with the prefilled account by typing only the password (the field, placeholder and demo hint show the seeded account); a wrong password is rejected; signed-out visitors are sent to the login page; signing out ends the session; the deployed build is the one serving | sign-in, build |
| EHR navigation | What each staff role can reach: billing users can work claims; managers can view but not create claims; clinical staff have no billing section | — |
| EHR workflows (write data) | A fixed patient's visit, booked through the API, is checked in from the tracking board; the clinician charts allergies, medications, HPI, assessment and plan, orders a lab and sends an eRx (the charted encounter is captured for Chromatic), and signs; the visit shows Completed on the board and in the chart, and can no longer be charted. Separately, a walk-in registered from the command palette is in office and found by patient search | — |
| Portal sign-in | A patient signs in with the prefilled account by typing only the password; a wrong password is rejected; signed-out visitors are redirected; signing out ends the session; the deployed build is the one serving | sign-in, build |
| Portal navigation | A patient can open each section | — |
| Portal workflows (write data) | As a second patient: book a visit from the home page, check the EHR shows it as prebooked, complete all four intake forms, cancel it, and check the EHR shows it cancelled; send a message and reply in the thread; request a refill; pay $1.00 toward the balance | — |

The suite is **read-only except for the workflows** (`workflows.spec.ts`), because staging is shared with people and with other units' deploys running in parallel. The workflows deliberately complete and save real work: a walk-in encounter in the EHR; and in the Portal, a booking, a message, a refill and a $1.00 payment. The Portal workflows act as a second seeded patient, Bob Johnson, so the prefilled demo patient's pages stay the same for Chromatic. They run in their own Playwright projects, after the read-only tests. Staging is never reset, so their data accumulates with every staging deploy. They tag what they create with a per-run ID so concurrent runs don't collide, and are never tagged `@smoke`, so production doesn't run them. See [the suite's README](../apps/playwright-e2e/README.md#writing-tests). A setup project signs each role in once through the real login form and saves the session, so the other tests start signed in. In CI, each test is retried once; a test that passes on retry is reported as flaky, and one that fails twice fails the gate. The HTML report, traces, screenshots, and videos are uploaded as the `e2e-report-<unit>-<environment>` artifact.

Browser tests import `test` from `support/fixtures`, which captures each test's final page for Chromatic; `takeSnapshot(page, 'name', testInfo)` adds a mid-flow capture. Staging runs upload them to the **Playwright** Chromatic project. Production runs set `CHROMATIC_SNAPSHOTS=off`. These snapshots are for developers reviewing UI changes between deploys, so only pages that look the same from run to run are sent. Tests that end on a page another test already captures, or on data the run itself created, turn the automatic snapshot off. Each staging deploy sends 15 snapshots. The EHR encounter workflow stays capturable because it sets its data up through the API, charting the same patient every run, and does only the clinician's work through the UI.

How a failing suite rolls back a deploy is in [deploy/DEPLOYMENT.md § Automated Deploys](../deploy/DEPLOYMENT.md#automated-deploys-staging--production).

---

## Mobile (React Native Storybook)

The patient portal app has no on-device test runner. It is checked three ways:

1. **Bundle build**: the `portal-mobile` CI job runs `expo export` for iOS and Android, which proves both JavaScript bundles resolve.
2. **Native unit tests**: the pure modules in `@careconnect/design-system-native` (see [Unit tests](#native-design-system-careconnectdesign-system-native)).
3. **Visual review**: the app's Storybook (its screen stories plus every `@careconnect/design-system-native` story) is built for Android and captured by Chromatic on hosted Android emulators.

Snapshots must be deterministic. Fixtures use fixed local times rather than "now", and animated components such as `Spinner` render a fixed frame under `<MotionProvider animate={false}>` during capture instead of being excluded from it. Chromatic modes are not supported for React Native, so each variant needs its own story. Details are in [apps/portal-mobile/README.md § Chromatic](../apps/portal-mobile/README.md#chromatic).

---

## Chromatic integrations

Chromatic keeps each test framework's builds in a separate project, so the repository uses four, each with its own token and baseline. A visual change is reviewed in Chromatic; it does not mean the build is broken.

| Project | Token | Workflow | Source | Runs on | Baseline |
|---|---|---|---|---|---|
| **Storybook** | `CHROMATIC_PROJECT_TOKEN` | [`chromatic.yml`](../.github/workflows/chromatic.yml) (`visual-review`) | Web design-system Storybook | Every PR, push to `main`, merge queue | Auto-accepted on `main` |
| **Vitest** | `CHROMATIC_VITEST_PROJECT_TOKEN` | [`chromatic.yml`](../.github/workflows/chromatic.yml) (`vitest-visual`) | `*.visual.test.tsx` DOM archives | Every PR, push to `main`, merge queue | Auto-accepted on `main` |
| **React Native** | `CHROMATIC_NATIVE_PROJECT_TOKEN` | [`chromatic-native.yml`](../.github/workflows/chromatic-native.yml) | `portal-mobile` Storybook, Android build | Every PR, push to `main`, merge queue; build skipped unless the mobile app is affected | Auto-accepted on `main` |
| **Playwright** | `CHROMATIC_PLAYWRIGHT_PROJECT_TOKEN` | [`deploy-environment.yml`](../.github/workflows/deploy-environment.yml) | End-to-end test pages from staging | Every staging deploy | On a `staging` branch, never auto-accepted; production deploys only once its changes are accepted |

**Cost control.** The Storybook and Vitest jobs use TurboSnap (`onlyChanged: true`), so a PR snapshots only the stories and tests its changes reach; a change to global styles or the visual-test setup file forces a full run. Chromatic has no TurboSnap for React Native, so `chromatic-native.yml` instead asks `turbo ls --affected` whether the mobile app or anything it depends on changed, and skips the build when not. A PR that changes only Markdown or files under `docs/` builds nothing: [`scripts/docs-only-change.sh`](../scripts/docs-only-change.sh) detects it, both jobs skip their build, and Chromatic marks the commit as passing without snapshots. iOS is not captured, because it needs a macOS runner billed at about ten times the Linux rate.

**Required checks.** None of these workflows has a `paths:` filter. A filtered workflow never starts on a PR it does not match, and a required check that never starts leaves the PR pending forever; a job skipped by `if:` still reports. They also listen on `merge_group` and do not cancel runs on queued refs, so they work with GitHub's merge queue.

**Reviewing a diff.** A failing **UI Tests** check means Chromatic detected a visual change. Open the build and decide whether it is a bug to fix or an intended change for a reviewer to accept in Chromatic. Re-running an unchanged commit produces the same diff, so re-run only after an infrastructure failure, and at most once. Pull-request changes are never auto-accepted; the post-merge run on `main` sets the new baseline.

**Figma.** The Storybook project's `main` permalink is also what the Figma plugins read; see [FIGMA.md](FIGMA.md).

Each job skips until its token is set. Setup for the tokens is in [docs/RELEASE.md § Chromatic](RELEASE.md#chromatic).

---

## When each suite runs

| Trigger | What runs |
|---|---|
| Pull request | `ci.yml`: one job per release unit runs `typecheck`, `test`, `test:stories`, `test:visual` and `build`, limited by `turbo --affected` to what the PR touches; a documentation-only PR skips them all. `chromatic.yml` (Storybook and Vitest projects) and `chromatic-native.yml` (React Native project, when affected). |
| Merge queue | The same as a pull request. |
| Push to `main` | `ci.yml` runs every unit in full. The Chromatic workflows run and auto-accept, setting the baseline for later PRs. |
| Deploy to staging | The full Playwright suite against staging, uploaded to the Playwright Chromatic project. A failure rolls staging back and stops the release. If it passes, production waits until the build's visual changes are accepted in Chromatic. |
| Deploy to production | The `@smoke` Playwright tests against production. A failure rolls production back. |

The branch-protection gate is the aggregate **All units passed** check from `ci.yml`. The `design-system` job uploads its JUnit results (`junit.xml`, `junit-stories.xml`, `junit-visual.xml`) as the `junit-design-system` artifact.

---

## Coverage gaps

A green build does not cover the following. Close a gap by adding to the suite named.

- **EHR and Portal application code** has no unit or component tests. It is covered only by the end-to-end suite. Its workflows cover booking, paperwork, messaging, refills, payments and charting a walk-in encounter; claim submission, fax and lab matching, and check-in are not tested automatically. Add component behavior as design-system stories or visual tests; add flows to the end-to-end suite only with isolated, self-cleaning data.
- **API route handlers** have no unit tests. Only the database layer is unit-tested; the end-to-end suite checks health, authentication, and role-gated billing access through the UI.
- **Accessibility** is checked automatically only on design-system stories, and locally only in the light theme. EHR and Portal pages are not audited, and axe does not replace keyboard and screen-reader review.
- **Mobile** has no interaction tests, and iOS is not captured visually.
- **Line coverage** is not measured or enforced by any suite.
