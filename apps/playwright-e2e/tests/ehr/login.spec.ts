import { test, expect, signIn, signInWithPrefilledEmail } from '../../support/fixtures';
import { DEPLOYED, PASSWORD, PREFILLED_USER, USERS, authFile } from '../../support/env';
import { REQUIRES, deployedVersionLine, skipUnlessServing } from '../../support/version';

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

test.describe('prefilled account', () => {
  // Ends signed in on the tracking board, which the test above captures.
  test.use({ disableAutoSnapshot: true });

  test('the form arrives prefilled, so staff type only the password', { tag: '@smoke' }, async ({ page, browser }) => {
    await skipUnlessServing(browser, REQUIRES.prefilledEhrLogin);
    await page.goto('/login');
    await expect(page.getByLabel('Email address')).toHaveAttribute('placeholder', PREFILLED_USER.ehr);
    await expect(page.getByText(`Demo: ${PREFILLED_USER.ehr}`)).toBeVisible();
    await signInWithPrefilledEmail(page, PREFILLED_USER.ehr, PASSWORD);
    await expect(page.getByRole('heading', { name: 'Tracking Board' })).toBeVisible();
  });
});

test('a wrong password is rejected with an error', async ({ page }) => {
  await page.goto('/login');
  await signIn(page, USERS.admin, `${PASSWORD}-wrong`);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

// These end on the plain login page, which the test above already captures
// with its error state, so they send no snapshot to Chromatic.
test.describe('ending on the login page', () => {
  test.use({ disableAutoSnapshot: true });

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

  test.describe('signed in', () => {
    test.use({ storageState: authFile('admin') });

    test('signing out ends the session', async ({ page }) => {
      await page.goto('/visits');
      await page.getByRole('button', { name: 'Logout' }).click();
      await expect(page).toHaveURL(/\/login$/);
      await page.goto('/visits');
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});
