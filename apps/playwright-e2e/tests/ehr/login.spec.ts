import { test, expect, signIn } from '../../support/fixtures';
import { DEPLOYED, PASSWORD, USERS } from '../../support/env';
import { deployedVersionLine } from '../../support/version';

// These start signed out: they exercise the login form and the route guard.
test.use({ storageState: { cookies: [], origins: [] } });

test('staff can sign in to the EHR', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/login');
  await signIn(page, USERS.admin, PASSWORD);
  await expect(page).toHaveURL(/\/visits$/);
  // A positive check that the signed-in chrome rendered: the URL alone would
  // also match a route that crashed to a blank page.
  await expect(page.getByRole('button', { name: 'Tracking Board' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tracking Board' })).toBeVisible();
});

test('a wrong password is rejected with an error', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, USERS.admin, `${PASSWORD}-wrong`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('signed-out visitors are sent to the login page', async ({ page }) => {
  await page.goto('/patients');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('the EHR build just deployed is the one serving', { tag: '@smoke' }, async ({ page }) => {
  test.skip(DEPLOYED.unit !== 'ehr', 'only checked when this run deployed the EHR');
  await page.goto('/login');
  await expect(page.getByText(deployedVersionLine())).toBeVisible();
});
