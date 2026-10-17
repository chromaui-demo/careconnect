import { defineConfig, devices } from '@playwright/test';
import type { ChromaticConfig } from '@chromatic-com/playwright';
import { EHR_URL, PORTAL_URL } from './support/env';

/**
 * End-to-end suite for a deployed CareConnect stack (EHR, Portal and the API
 * behind them). deploy-environment.yml runs all of it against staging as the
 * gate to production, and only the @smoke-tagged tests against production
 * after the production deploy. See README.md.
 */
export default defineConfig<ChromaticConfig>({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a transient blip on a shared environment (another unit
  // restarting mid-run); the report marks such tests "flaky" rather than
  // hiding them. A test that fails twice fails the gate.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Chromatic: ignore what changes with every deploy rather than with the UI.
    // The login screens print the app and design-system versions, and the
    // tracking board's tab counts grow as the workflow tests add visits.
    ignoreSelectors: ['.cc-login-screen__version', '.cc-tabs__count'],
    disableAutoSnapshot: process.env.CHROMATIC_SNAPSHOTS === 'off',
  },
  projects: [
    // Signs each role in once and saves its session for the browser projects.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'api', testDir: './tests/api', use: { baseURL: EHR_URL } },
    { name: 'ehr', testDir: './tests/ehr', testIgnore: /workflows\.spec\.ts/, dependencies: ['setup'], use: { baseURL: EHR_URL } },
    { name: 'portal', testDir: './tests/portal', testIgnore: /workflows\.spec\.ts/, dependencies: ['setup'], use: { baseURL: PORTAL_URL } },
    // The workflows save data, so they start only after every read-only test
    // has finished and captured its page. Otherwise a visit or payment made
    // mid-run could show up in another test's snapshot. If a read-only test
    // fails, Playwright skips these; the gate has failed by then anyway.
    { name: 'ehr-workflows', testDir: './tests/ehr', testMatch: /workflows\.spec\.ts/, dependencies: ['ehr', 'portal'], use: { baseURL: EHR_URL } },
    { name: 'portal-workflows', testDir: './tests/portal', testMatch: /workflows\.spec\.ts/, dependencies: ['ehr', 'portal'], use: { baseURL: PORTAL_URL } },
  ],
});
