import { test, expect } from '../../support/fixtures';
import { authFile } from '../../support/env';

// Read-only on purpose: these capture the prefilled demo patient's pages for
// Chromatic, so they must look the same from run to run. The workflow tests
// that book, message and pay do so as a different patient.
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
