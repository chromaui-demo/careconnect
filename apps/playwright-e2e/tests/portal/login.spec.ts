import { test, expect, signIn } from '../../support/fixtures';
import { DEPLOYED, PASSWORD, USERS } from '../../support/env';
import { deployedVersionLine } from '../../support/version';

// These start signed out: they exercise the login form and the route guard.
test.use({ storageState: { cookies: [], origins: [] } });

test('a patient can sign in to the Portal', { tag: '@smoke' }, async ({ page, baseURL }) => {
  await page.goto('/login');
  await signIn(page, USERS.patient, PASSWORD);
  await expect(page).toHaveURL(new URL('/', baseURL).toString());
  // A positive check that the home page rendered: the URL alone would also
  // match a route that crashed to a blank page.
  await expect(page.getByRole('heading', { name: 'Welcome to CareConnect' })).toBeVisible();
});

test('a wrong password is rejected with an error', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, USERS.patient, `${PASSWORD}-wrong`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('signed-out visitors are sent to the login page', async ({ page }) => {
  await page.goto('/medications');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('the Portal build just deployed is the one serving', { tag: '@smoke' }, async ({ page }) => {
  test.skip(DEPLOYED.unit !== 'portal', 'only checked when this run deployed the Portal');
  await page.goto('/login');
  await expect(page.getByText(deployedVersionLine())).toBeVisible();
});
