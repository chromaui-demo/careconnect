import { test as setup, expect } from '@playwright/test';
import { EHR_URL, PASSWORD, PORTAL_URL, USERS, authFile, type Role } from '../support/env';
import { signIn } from '../support/fixtures';

// Sign in through the real login form once per role and save the session
// (the apps keep their token in localStorage), so the browser tests start
// already signed in. The login form itself is covered by the login specs.

const staffRoles: Exclude<Role, 'patient'>[] = ['admin', 'staff', 'billing', 'manager'];

for (const role of staffRoles) {
  setup(`sign in to the EHR as ${role}`, async ({ page }) => {
    await page.goto(`${EHR_URL}/login`);
    await signIn(page, USERS[role], PASSWORD);
    await expect(page).toHaveURL(/\/visits$/);
    await page.context().storageState({ path: authFile(role) });
  });
}

setup('sign in to the Portal as a patient', async ({ page }) => {
  await page.goto(`${PORTAL_URL}/login`);
  await signIn(page, USERS.patient, PASSWORD);
  await expect(page.getByRole('heading', { name: 'Welcome to CareConnect' })).toBeVisible();
  await page.context().storageState({ path: authFile('patient') });
});
