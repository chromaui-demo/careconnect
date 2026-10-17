import { test, expect } from '../../support/fixtures';
import { authFile } from '../../support/env';
import type { Page } from '@playwright/test';

/**
 * Waits until the Claims page's three charts are drawn, so the snapshot shows
 * them finished. The chart library loads on its own after the page, and the
 * charts size themselves once laid out. With reduced motion on (see
 * playwright.config.ts) the data is drawn in the same pass as these labels.
 */
async function expectClaimsChartsDrawn(page: Page) {
  // Payer mix: one legend entry per payer, besides the revenue chart's two.
  await expect.poll(() => page.getByRole('img', { name: /legend icon$/ }).count()).toBeGreaterThan(2);
  // Charges by payer and Revenue trend: their y-axes start at $0 and $0k.
  // (Within main: Recharts keeps a hidden copy of the last label it measured.)
  const main = page.getByRole('main');
  await expect(main.getByText('$0', { exact: true })).toBeVisible();
  await expect(main.getByText('$0k', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Charges legend icon' })).toBeVisible();
}

// What each staff role can reach. Billing is role-gated
// (apps/ehr/src/pages/billing/permissions.ts): Billing and Administrator can
// edit, Manager can only view, everyone else is redirected to the tracking
// board.

test.describe('billing user', () => {
  test.use({ storageState: authFile('billing') });

  test('can work claims', async ({ page }) => {
    await page.goto('/billing/claims');
    await expect(page.getByRole('heading', { name: 'Claims' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Claim' }).first()).toBeVisible();
    await expectClaimsChartsDrawn(page);
  });
});

test.describe('manager', () => {
  test.use({ storageState: authFile('manager') });

  test('can view claims but not create them', async ({ page }) => {
    await page.goto('/billing/claims');
    await expect(page.getByRole('heading', { name: 'Claims' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Claim' })).toHaveCount(0);
    await expectClaimsChartsDrawn(page);
  });

  test('is turned away from the new-claim form', async ({ page }) => {
    await page.goto('/billing/claims/new');
    await expect(page).toHaveURL(/\/visits$/);
  });
});

test.describe('clinical staff', () => {
  test.use({ storageState: authFile('staff') });

  test('have no billing section', async ({ page }) => {
    await page.goto('/visits');
    await expect(page.getByRole('button', { name: 'Tracking Board' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Billing', exact: true })).toHaveCount(0);
    await page.goto('/billing/claims');
    await expect(page).toHaveURL(/\/visits$/);
  });
});
