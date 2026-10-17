import { test, expect, takeSnapshot, signIn } from '../../support/fixtures';
import { PASSWORD, USERS, uniqueTag } from '../../support/env';
import { REQUIRES, skipUnlessServing } from '../../support/version';
import {
  ENCOUNTER_PATIENT, ENCOUNTER_REASON, bookVisitNow, closeVisit, encounterPatientId, staffApi,
} from '../../support/api';
import type { APIRequestContext } from '@playwright/test';

// A clinician's work completed end to end, saving real data. Not tagged
// @smoke, so production never runs these.
//
// The encounter test is deterministic: it charts the same patient every run
// (ENCOUNTER_PATIENT, created once per environment) on a visit booked through
// the API, so the charted encounter looks identical each time and is captured
// for Chromatic. Only the clinician's work goes through the UI. The
// registration test has to create a new patient, so it sends no snapshot.
test.use({ storageState: { cookies: [], origins: [] }, disableAutoSnapshot: true });

let api: APIRequestContext;
const openVisits: string[] = [];

test.beforeEach(async ({ browser }) => {
  // Chart saving and walk-in registration need api 1.1.1.
  await skipUnlessServing(browser, REQUIRES.workflowApi);
  api = await staffApi();
});

test.afterEach(async () => {
  // A run that failed part-way still leaves its visit closed, so the patient
  // never lingers on the tracking board's in-office queue.
  for (const visitId of openVisits.splice(0)) await closeVisit(api, visitId);
  await api?.dispose();
});

test('a clinician checks in a booked patient, charts the encounter and signs it', async ({ page }, testInfo) => {
  test.slow();
  const patient = `${ENCOUNTER_PATIENT.firstName} ${ENCOUNTER_PATIENT.lastName}`;
  const visit = await bookVisitNow(api, await encounterPatientId(api));
  openVisits.push(visit.id);
  // The board shows the visit's time in the browser's timezone; with the
  // patient's name it picks out this run's visit from any other run's.
  const time = await page.evaluate((iso) => new Date(iso).toLocaleTimeString('en-US',
    { hour: 'numeric', minute: '2-digit' }), visit.scheduledTime);
  const row = page.getByRole('row', { name: new RegExp(`^${patient} ${time} `) });

  await test.step('sign in as staff', async () => {
    await page.goto('/login');
    await signIn(page, USERS.admin, PASSWORD);
    await expect(page.getByRole('heading', { level: 1, name: 'Tracking Board' })).toBeVisible();
  });

  await test.step('check the patient in from the tracking board', async () => {
    await page.getByLabel('Search patients').fill(ENCOUNTER_PATIENT.lastName);
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByRole('tab', { name: /^Prebooked/ }).click();
    const checkedIn = page.waitForRequest((r) => r.url().includes(`/appointments/${visit.id}/status`));
    await row.getByRole('button', { name: 'Check In' }).click();
    await checkedIn; // the row clicked was this run's visit
    await expect(page.getByRole('status').filter({ hasText: 'Patient moved to in-office queue.' })).toBeVisible();
  });

  await test.step('start the encounter', async () => {
    await page.getByRole('tab', { name: /^In Office/ }).click();
    await row.getByRole('button', { name: 'Start Encounter' }).click();
    await expect(page).toHaveURL(new RegExp(`/encounter/${visit.id}$`));
    await expect(page.getByText(ENCOUNTER_REASON).first()).toBeVisible();
  });

  await test.step('chart allergies, medications, HPI, assessment and plan', async () => {
    const chart = [
      { tab: 'Allergies', field: 'Allergies (comma-separated)', value: 'Penicillin, Latex' },
      { tab: 'Medications', field: 'Medications (comma-separated)', value: 'Ibuprofen 400mg' },
      { tab: 'HPI', field: 'HPI', value: 'Three days of sore throat and low-grade fever.' },
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

  await test.step('capture the charted encounter', async () => {
    // Same patient, chart, orders and counts every run; wait out the toasts.
    await expect(page.getByRole('status').filter({ hasText: 'Chart updated.' })).toHaveCount(0);
    await takeSnapshot(page, 'charted encounter', testInfo);
  });

  await test.step('sign the encounter', async () => {
    await page.getByRole('button', { name: 'Review & Sign' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Documentation is complete.' })).toBeVisible();
    await expect(page).toHaveURL(/\/visits$/);
  });

  await test.step('the visit is completed and closed to further charting', async () => {
    await page.getByRole('tab', { name: /^Completed/ }).click();
    await expect(row).toBeVisible();
    await page.goto(`/visit/${visit.id}`);
    await expect(page.getByRole('heading', { name: patient })).toBeVisible();
    await expect(page.getByText('Completed', { exact: true })).toBeVisible();
    // The visit page offers the encounter only while the patient is in office.
    await expect(page.getByRole('button', { name: 'Open Encounter' })).toHaveCount(0);
  });

  await test.step('the chart lists the completed visit', async () => {
    await page.getByRole('button', { name: 'Patient Chart' }).click();
    await page.getByRole('button', { name: 'Chart Home' }).click();
    await expect(page.getByRole('heading', { level: 1, name: patient })).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(`${ENCOUNTER_REASON} Completed`) }).first()).toBeVisible();
  });
});

test('a clinician registers a walk-in, who is waiting in the office and searchable', async ({ page, browser }) => {
  // Finding the new patient relies on patient search that never shows stale results.
  await skipUnlessServing(browser, REQUIRES.ehrPatientSearch);
  const lastName = uniqueTag();
  const patient = `Qa ${lastName}`;

  await page.goto('/login');
  await signIn(page, USERS.admin, PASSWORD);
  await page.getByRole('button', { name: '⌘K' }).click();
  await page.getByRole('dialog', { name: 'Command palette' }).getByRole('button', { name: 'Add walk-in visit' }).click();
  await page.getByLabel('First name').fill('Qa');
  await page.getByLabel('Last name').fill(lastName);
  await page.getByLabel('Date of birth').fill('1990-06-15');
  await page.getByLabel('Reason for visit').fill('Twisted ankle');
  await page.getByRole('button', { name: 'Create walk-in visit' }).click();

  await expect(page).toHaveURL(/\/visit\/[^/]+$/);
  openVisits.push(new URL(page.url()).pathname.split('/').pop()!);
  await expect(page.getByRole('heading', { name: patient })).toBeVisible();
  await expect(page.getByText('In Office')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Encounter' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Main navigation' }).first()
    .getByRole('button', { name: 'Patients', exact: true }).click();
  await page.getByPlaceholder('Search...').fill(lastName);
  await expect(page.getByRole('row')).toHaveCount(2); // header + the one match
  await expect(page.getByRole('row', { name: new RegExp(patient) })).toBeVisible();
});
