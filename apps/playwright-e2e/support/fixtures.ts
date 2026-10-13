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
import type { Page } from '@playwright/test';

export { test, expect, takeSnapshot } from '@chromatic-com/playwright';

/** Fills and submits the design system's LoginScreen, shared by both apps. */
export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}
