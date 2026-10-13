import { test, expect } from '../../support/fixtures';
import { authFile } from '../../support/env';

// Read-only on purpose: staging is shared with people and with other units'
// deploys running this suite in parallel, so nothing here books, messages or pays.
test.use({ storageState: authFile('patient') });

const SECTIONS = [
  { link: 'Visits', path: '/visits', heading: 'My Visits' },
  { link: 'Medications', path: '/medications', heading: 'My Medications' },
  { link: 'Results', path: '/results', heading: 'Test Results' },
  { link: 'Messages', path: '/messages', heading: 'Messages' },
  { link: 'Bills', path: '/bills', heading: 'Bills & Payments' },
];

for (const section of SECTIONS) {
  test(`a patient can open ${section.link}`, async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Patient portal' })
      .getByRole('link', { name: new RegExp(`^${section.link}`) })
      .click();
    await expect(page).toHaveURL(new RegExp(`${section.path}$`));
    await expect(page.getByRole('heading', { level: 1, name: section.heading })).toBeVisible();
  });
}

test('signing out ends the session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/visits');
  await expect(page).toHaveURL(/\/login$/);
});
