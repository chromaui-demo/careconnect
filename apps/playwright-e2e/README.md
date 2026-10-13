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
| `tests/ehr/`, `tests/portal/` | Browser tests, one Playwright project per app, each with its own `baseURL`. |
| `support/env.ts` | URLs, seeded accounts, deploy metadata. |
| `support/fixtures.ts` | `test` / `expect` with Chromatic's snapshot fixture, plus `signIn()`. |

## Writing tests

- **Read-only.** Staging is shared, both with people and with the other units' deploys, which run this suite in parallel. Don't create, edit or delete data. A flow that has to write needs its own isolated, uniquely named data and its own cleanup, and should be discussed first.
- **Import from `support/fixtures`** in browser tests, so each test's final page is captured for Chromatic. Call `takeSnapshot(page, 'name', testInfo)` for a mid-flow state worth reviewing. API tests and setup import from `@playwright/test`.
- **Start signed in.** Use `test.use({ storageState: authFile('billing') })`, and log in through the UI only in the login specs.
- **Locate elements the way users do**, with `getByRole`, `getByLabel` and visible text. Avoid CSS classes and fixed waits; web-first assertions retry on their own.
- **Tag `@smoke`** only for tests that are fast, read-only and safe to run against production.
- **Assert something positive.** "The URL changed" also passes on a crashed blank page, so check for a heading or a control as well.

## Failures and Chromatic

In CI, a test is retried once. A test that passes on retry is reported as flaky and does not fail the gate; a test that fails twice does. The report, traces, screenshots and videos are uploaded as the `e2e-report-<unit>-<environment>` artifact.

Staging runs upload their snapshots to the end-to-end Chromatic project (`CHROMATIC_PLAYWRIGHT_PROJECT_TOKEN`) on a branch named `staging`, auto-accepted, so each deploy is compared with the previous one. Visual changes never block a deploy. The snapshots are there to review what changed, and to see what a failing test's page looked like. Elements that change with every release, such as the version line on the login screens, are excluded with `ignoreSelectors` in `playwright.config.ts`.
