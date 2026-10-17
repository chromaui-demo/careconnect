import { test, expect, signInWithPrefilledEmail } from '../../support/fixtures';
import { PASSWORD, PREFILLED_USER, uniqueTag } from '../../support/env';

// A clinician's workflow completed end to end, saving real data.
//
// This writes to the environment it runs against: each run registers a new
// walk-in patient and signs an encounter for them. The data is named after the
// run (see uniqueTag) so concurrent runs never collide, and it is left in
// place: staging is not reset and the API has no delete. Not tagged @smoke,
// so production never runs it.
//
// No Chromatic snapshot: every page here shows a new patient and today's
// time, so it would differ on every run without telling a reviewer anything.
test.use({ storageState: { cookies: [], origins: [] }, disableAutoSnapshot: true });

test('a clinician registers a walk-in, charts the encounter and signs it', async ({ page }) => {
  test.slow();
  const lastName = uniqueTag();
  const patient = `Qa ${lastName}`;
  const reason = `Sore throat (${lastName})`;
  let visitUrl = '';

  await test.step('sign in with the prefilled staff account', async () => {
    await page.goto('/login');
    await signInWithPrefilledEmail(page, PREFILLED_USER.ehr, PASSWORD);
    await expect(page.getByRole('heading', { level: 1, name: 'Tracking Board' })).toBeVisible();
  });

  await test.step('register the walk-in from the command palette', async () => {
    await page.getByRole('button', { name: '⌘K' }).click();
    await page.getByRole('dialog', { name: 'Command palette' })
      .getByRole('button', { name: 'Add walk-in visit' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Add Patient / Visit' })).toBeVisible();
    await page.getByLabel('First name').fill('Qa');
    await page.getByLabel('Last name').fill(lastName);
    await page.getByLabel('Date of birth').fill('1985-03-14');
    await page.getByLabel('Reason for visit').fill(reason);
    await page.getByLabel('Service mode').selectOption('In person');
    await page.getByRole('button', { name: 'Create walk-in visit' }).click();

    await expect(page).toHaveURL(/\/visit\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Visit Details' })).toBeVisible();
    await expect(page.getByRole('heading', { name: patient })).toBeVisible();
    await expect(page.getByText(reason)).toBeVisible();
    await expect(page.getByText('In Office')).toBeVisible();
    visitUrl = page.url();
  });

  await test.step('the new patient is waiting on the tracking board', async () => {
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/visits$/);
    await page.getByLabel('Search patients').fill(lastName);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await expect(page.getByRole('row', { name: new RegExp(patient) })).toBeVisible();
    await page.getByRole('row', { name: new RegExp(patient) })
      .getByRole('button', { name: 'Start Encounter' }).click();
    await expect(page).toHaveURL(/\/encounter\/[^/]+$/);
  });

  await test.step('chart allergies, medications, HPI, assessment and plan', async () => {
    const chart = [
      { tab: 'Allergies', field: 'Allergies (comma-separated)', value: 'Penicillin, Latex' },
      { tab: 'Medications', field: 'Medications (comma-separated)', value: 'Ibuprofen 400mg' },
      { tab: 'HPI', field: 'HPI', value: `Three days of sore throat and low-grade fever. ${lastName}` },
      { tab: 'Assessment', field: 'Assessment', value: 'Acute pharyngitis' },
      { tab: 'Plan', field: 'Plan', value: 'Rapid strep test; fluids and rest; return if worse' },
    ];
    for (const entry of chart) {
      await page.getByRole('tab', { name: entry.tab, exact: true }).click();
      const field = page.getByLabel(entry.field);
      await field.fill(entry.value);
      // The chart saves on blur and confirms with a toast.
      const saved = page.waitForResponse((r) => r.url().includes('/chart-data') && r.ok());
      await field.blur();
      await saved;
      await expect(page.getByRole('status').filter({ hasText: 'Chart updated.' }).first()).toBeVisible();
    }
    // The allergy alert in the patient banner reflects the saved chart.
    await expect(page.getByText('Allergies: Penicillin, Latex')).toBeVisible();
  });

  await test.step('order a lab and send an eRx', async () => {
    await page.getByRole('tab', { name: 'Labs', exact: true }).click();
    await page.getByPlaceholder('Test name (e.g. CBC)').fill('Rapid strep');
    await page.getByRole('button', { name: 'Order Lab' }).click();
    await expect(page.getByRole('row', { name: /Rapid strep/ })).toBeVisible();

    await page.getByRole('tab', { name: 'eRx', exact: true }).click();
    await page.getByPlaceholder('Medication').fill('Amoxicillin');
    await page.getByPlaceholder('Dosage').fill('500mg twice daily for 10 days');
    await page.getByRole('button', { name: 'Send eRx' }).click();
    await expect(page.getByRole('row', { name: /Amoxicillin/ })).toBeVisible();
  });

  await test.step('sign the encounter', async () => {
    await page.getByRole('button', { name: 'Review & Sign' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Documentation is complete.' })).toBeVisible();
    await expect(page).toHaveURL(/\/visits$/);
  });

  await test.step('the visit moves to Completed on the tracking board', async () => {
    await page.getByLabel('Search patients').fill(lastName);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByRole('tab', { name: /^Completed/ }).click();
    await expect(page.getByRole('row', { name: new RegExp(patient) })).toBeVisible();
  });

  await test.step('the chart shows the patient and the completed visit', async () => {
    await page.getByRole('navigation', { name: 'Main navigation' }).first()
      .getByRole('button', { name: 'Patients', exact: true }).click();
    await page.getByPlaceholder('Search...').fill(lastName);
    await expect(page.getByRole('row')).toHaveCount(2); // header + the one match
    await page.getByRole('row', { name: new RegExp(patient) }).click();
    await expect(page.getByRole('heading', { level: 1, name: patient })).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(`${reason.replace(/[()]/g, '\\$&')}.*Completed`) })).toBeVisible();
  });

  await test.step('the signed visit is closed to further charting', async () => {
    await page.goto(visitUrl);
    await expect(page.getByRole('heading', { name: patient })).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    // The visit page offers the encounter only while the patient is in office.
    await expect(page.getByRole('button', { name: 'Open Encounter' })).toHaveCount(0);
  });
});
