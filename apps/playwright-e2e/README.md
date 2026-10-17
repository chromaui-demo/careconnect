# End-to-end tests

Playwright tests for a deployed CareConnect stack: the EHR, the Portal, and the API behind them. They are the gate between staging and production. [`deploy-environment.yml`](../../.github/workflows/deploy-environment.yml) runs the whole suite against staging after every deploy, and production is deployed only if it passes. After the production deploy, only the tests tagged `@smoke` run. The tests come from the ref being deployed, so they always match the build. Tags cut before this suite existed have no copy of it, so redeploying one of them runs the suite from `main` instead. See [docs/RELEASE.md § Deploy pipeline](../../docs/RELEASE.md#deploy-pipeline-per-unit).

## Running

Point the suite at any running stack:

```bash
export EHR_URL=http://localhost:4000 PORTAL_URL=http://localhost:4001
npm run e2e:test                     # the whole suite (the staging gate)
npm run smoke:test                   # only @smoke (what production runs)
npx playwright test --ui             # from this directory: watch mode / debugger
npx playwright show-report           # the last HTML report
```

| Variable | Purpose |
|---|---|
| `EHR_URL`, `PORTAL_URL` | Required. The API is reached via `EHR_URL/api`. |
| `E2E_PASSWORD` | The seeded demo password, if the stack doesn't use the default. |
| `DEPLOY_UNIT`, `DEPLOY_VERSION` | Set by CI to the unit just deployed and its version. The "build just deployed is the one serving" tests use them and skip when they're unset. |
| `CHROMATIC_SNAPSHOTS=off` | Skip writing Chromatic archives (production does this). |

## Layout

| Path | What |
|---|---|
| `tests/auth.setup.ts` | Signs each role in through the real login form once and saves the session to `.auth/<role>.json`. |
| `tests/api/` | Request-only tests (no browser). |
| `tests/ehr/`, `tests/portal/` | Read-only browser tests, one Playwright project per app, each with its own `baseURL`. |
| `tests/*/workflows.spec.ts` | Workflows completed and saved, in their own `ehr-workflows` and `portal-workflows` projects that start after the read-only ones. EHR: a booked patient checked in → charted, signed encounter (captured for Chromatic), and a walk-in registration. Portal: booking → paperwork → cancellation (checked in the EHR as well), messaging, a refill, a payment. These write data (see below). |
| `support/env.ts` | URLs, seeded accounts, the account each login form arrives prefilled with (`PREFILLED_USER`), the patient the Portal workflows act as (`WORKFLOW_PATIENT`), `uniqueTag()` for data the workflows create, deploy metadata. |
| `support/fixtures.ts` | `test` / `expect` with Chromatic's snapshot fixture, plus `signIn()` and `signInWithPrefilledEmail()`. |

## Writing tests

- **Read-only, except the workflows.** Staging is shared, both with people and with the other units' deploys, which run this suite in parallel. Tests don't create, edit or delete data, with one deliberate exception: `tests/*/workflows.spec.ts` complete real workflows and save what they create.
  - **EHR:** each run books a visit through the API for one fixed patient, Jordan Rivera (`ENCOUNTER_PATIENT` in `support/api.ts`, created once per environment). The test then checks Jordan in on the tracking board, charts and signs the encounter, and captures the charted encounter for Chromatic. The same patient, chart and orders every run make that snapshot identical each time. Each run also registers a walk-in patient named `Qa E2E-…`. Both tests close their visit afterwards, even when they fail, so nobody lingers in the in-office queue.
  - **Arrange through the API, act through the UI.** When a screen worth capturing depends on data, set the data up with the helpers in `support/api.ts` and do only the work under test in the browser. That keeps the snapshot the same on every run.
  - **Portal:** each run signs in as Bob Johnson (`WORKFLOW_PATIENT`), typing his email over the prefilled one. It books a visit, checks the EHR shows it, completes its paperwork and cancels it. It also starts a message thread and replies, requests an Atorvastatin refill, and pays $1.00.
  - **Why not the prefilled patient (Alice Smith):** the read-only tests snapshot Alice's pages for Chromatic. If the workflows paid or booked as Alice, her balance, inbox and visits would change every run, and so would every snapshot of them.
  - **What stays behind:** staging is never reset and the API has no delete, so all of this accumulates with every staging deploy. Bob's balance falls by $1.00 a run, and the payment test skips itself once it reaches zero.
  - **Rules for any new test that writes:** put it in a `workflows.spec.ts` file so it runs after the read-only tests. Tag what it creates with `uniqueTag()` and find it by that tag, never by position or count, because concurrent runs share the data. Never tag it `@smoke`, so it never runs in production.
- **Pass while the other units are on their previous release.** Units deploy one at a time and every deploy runs the whole suite, so when the portal ships, staging's EHR and API are still on their last release. A test that needs another unit's new behaviour starts with `skipUnlessServing(browser, REQUIRES.…)` from `support/version.ts`, which skips it, naming both versions, until the environment serves that release. The unit being deployed always serves its new release, so its own tests always run. Add the minimum version to `REQUIRES` when you write such a test, and remove the entry once every environment is past it.
- **Import from `support/fixtures`** in browser tests, so each test's final page is captured for Chromatic. Call `takeSnapshot(page, 'name', testInfo)` for a mid-flow state worth reviewing. API tests and setup import from `@playwright/test`.
- **Send Chromatic only pages that stay the same from run to run.** The snapshots are for developers reviewing UI changes between deploys, so a snapshot that differs every run hides real changes. Turn the automatic snapshot off with `test.use({ disableAutoSnapshot: true })` in two cases: when a test ends on a page another test already captures (most often the login page), and when it ends on data the run itself created. Values that change with the data rather than the UI, such as the tracking board's tab counts, go in `ignoreSelectors` in `playwright.config.ts`.
- **Start signed in.** Use `test.use({ storageState: authFile('billing') })`, and log in through the UI only in the login specs and the workflows.
- **Locate elements the way users do**, with `getByRole`, `getByLabel` and visible text. Avoid CSS classes and fixed waits; web-first assertions retry on their own.
- **Tag `@smoke`** only for tests that are fast, read-only and safe to run against production.
- **Assert something positive.** "The URL changed" also passes on a crashed blank page, so check for a heading or a control as well.

## Failures and Chromatic

In CI, a test is retried once. A test that passes on retry is reported as flaky and does not fail the gate; a test that fails twice does. The report, traces, screenshots and videos are uploaded as the `e2e-report-<unit>-<environment>` artifact.

Staging runs upload their snapshots to the end-to-end Chromatic project (`CHROMATIC_PLAYWRIGHT_PROJECT_TOKEN`) on a branch named `staging`, auto-accepted, so each deploy is compared with the previous one. Visual changes never block a deploy. The snapshots are there to review what changed, and to see what a failing test's page looked like. Elements that change with every release, such as the version line on the login screens, are excluded with `ignoreSelectors` in `playwright.config.ts`.
