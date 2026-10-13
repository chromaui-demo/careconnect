import { test, expect } from '../../support/fixtures';
import { authFile } from '../../support/env';

// Billing is role-gated (apps/ehr/src/pages/billing/permissions.ts): Billing
// and Administrator can edit, Manager can only view, everyone else is
// redirected to the tracking board.

test.describe('billing user', () => {
  test.use({ storageState: authFile('billing') });

  test('can work claims', async ({ page }) => {
    await page.goto('/billing/claims');
    await expect(page.getByRole('heading', { name: 'Claims' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Claim' }).first()).toBeVisible();
  });
});

test.describe('manager', () => {
  test.use({ storageState: authFile('manager') });

  test('can view claims but not create them', async ({ page }) => {
    await page.goto('/billing/claims');
    await expect(page.getByRole('heading', { name: 'Claims' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Claim' })).toHaveCount(0);
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
