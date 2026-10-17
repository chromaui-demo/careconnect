/**
 * Browser tests import `test` and `expect` from here rather than from
 * @playwright/test. Chromatic's fixture records a DOM + resource archive of
 * every test's final page (and at each explicit takeSnapshot), which
 * `chromatic --playwright` uploads for visual review. The archive is captured
 * whether the test passes or fails, so a failed deploy gate comes with a
 * renderable snapshot of what the page looked like.
 *
 * API-only tests and the auth setup import from @playwright/test directly:
 * the Chromatic fixture always opens a page, which they don't need.
 */
import type { Page, TestInfo } from '@playwright/test';
import { test as chromaticTest, expect, takeSnapshot as chromaticTakeSnapshot } from '@chromatic-com/playwright';

export { expect };

/**
 * Waits until the page has no requests in flight. Both apps fill parts of a
 * page after it first renders — the portal's unread-message badge, the
 * tracking board's filters — and a snapshot taken before that lands differs
 * from one taken after, which production's visual review would then flag
 * with no UI change behind it. Neither app polls, so the network does go
 * quiet; if it doesn't in time, the test notes it and the snapshot is taken
 * anyway rather than failing the test.
 */
async function settle(page: Page, testInfo: TestInfo) {
  if (page.isClosed()) return;
  try {
    await page.waitForLoadState('networkidle', { timeout: 10_000 });
  } catch {
    testInfo.annotations.push({ type: 'warning', description: 'Network still busy when the Chromatic snapshot was taken.' });
  }
}

export const test = chromaticTest.extend<{ settleBeforeSnapshot: void }>({
  // Depends on Chromatic's automatic snapshot fixture, so it is set up after
  // it and torn down before it: the wait runs once the test body is done and
  // before the end-of-test snapshot is captured.
  settleBeforeSnapshot: [async ({ page, chromaticSnapshot }, use, testInfo) => {
    void chromaticSnapshot;
    await use();
    await settle(page, testInfo);
  }, { auto: true }],
});

/** Chromatic's takeSnapshot for a mid-test capture, after the page settles. */
export async function takeSnapshot(page: Page, name: string, testInfo: TestInfo) {
  await settle(page, testInfo);
  await chromaticTakeSnapshot(page, name, testInfo);
}

/** Fills and submits the design system's LoginScreen, shared by both apps. */
export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

/**
 * Signs in the way the team does: checks the email field already holds the
 * seeded account, types only the password, and submits.
 */
export async function signInWithPrefilledEmail(page: Page, expectedEmail: string, password: string) {
  await expect(page.getByLabel('Email address')).toHaveValue(expectedEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}
