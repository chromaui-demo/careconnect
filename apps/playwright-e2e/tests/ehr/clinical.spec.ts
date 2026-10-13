import { test, expect, takeSnapshot } from '../../support/fixtures';
import { authFile } from '../../support/env';

// Read-only on purpose: staging is shared with people and with other units'
// deploys running this suite in parallel, so nothing here creates or edits data.
test.use({ storageState: authFile('admin') });

test('the tracking board loads for a signed-in clinician', async ({ page }) => {
  await page.goto('/visits');
  await expect(page.getByRole('heading', { name: 'Tracking Board' })).toBeVisible();
});

test('staff can find a patient and open their chart', async ({ page }, testInfo) => {
  await test.step('search the patient list', async () => {
    await page.goto('/patients');
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();
    await page.getByPlaceholder('Search...').fill('Smith');
    await expect(page.getByRole('row', { name: /Alice Smith/ }).first()).toBeVisible();
    await takeSnapshot(page, 'patient search results', testInfo);
  });

  await test.step('open the chart', async () => {
    await page.getByRole('row', { name: /Alice Smith/ }).first().click();
    await expect(page).toHaveURL(/\/patient\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Alice Smith' })).toBeVisible();
    await expect(page.getByText('Patient chart overview')).toBeVisible();
  });
});

test('signing out ends the session', async ({ page }) => {
  await page.goto('/visits');
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/visits');
  await expect(page).toHaveURL(/\/login$/);
});
