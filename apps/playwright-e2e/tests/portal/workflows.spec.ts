import { test, expect, takeSnapshot, signIn } from '../../support/fixtures';
import { EHR_URL, PASSWORD, WORKFLOW_PATIENT, authFile, uniqueTag } from '../../support/env';
import { REQUIRES, skipUnlessServing } from '../../support/version';
import type { Page } from '@playwright/test';

// A patient's workflows completed end to end, saving real data.
//
// These write to the environment they run against, as WORKFLOW_PATIENT rather
// than the prefilled demo patient, whose pages the read-only tests snapshot.
// Each run books a visit (completes its paperwork, then cancels it), starts a
// message thread and replies to it, requests a refill, and pays $1.00 toward
// the balance. The records are left in place: staging is not reset and the API
// has no delete, so this patient's history grows with every run and the
// balance falls by $1.00 each time. Text the workflows enter carries a per-run
// tag (see uniqueTag) so concurrent runs find their own records. Not tagged
// @smoke, so production never runs them.
//
// No automatic Chromatic snapshot: the final pages show per-run data. The one
// explicit snapshot is the booking confirmation, which looks the same each run.
test.use({ storageState: { cookies: [], origins: [] }, disableAutoSnapshot: true });

// Booking from the home page needs the service catalog readable by patients.
test.beforeEach(async ({ browser }) => {
  await skipUnlessServing(browser, REQUIRES.workflowApi);
});

/** Signs in as the workflow patient, typing over whatever the email field holds. */
async function signInAsWorkflowPatient(page: Page) {
  await page.goto('/login');
  await signIn(page, WORKFLOW_PATIENT.email, PASSWORD);
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome to CareConnect' })).toBeVisible();
  await expect(page.getByRole('banner')).toContainText(`${WORKFLOW_PATIENT.firstName} ${WORKFLOW_PATIENT.lastName}`);
}

function goTo(page: Page, section: string) {
  return page.getByRole('navigation', { name: 'Patient portal' })
    .getByRole('link', { name: new RegExp(`^${section}`) })
    .click();
}

function toast(page: Page, text: string | RegExp) {
  return page.getByRole('status').filter({ hasText: text });
}

/** Today as the page formats dates, in the browser's own timezone. */
function browserToday(page: Page) {
  return page.evaluate(() => new Date().toLocaleDateString('en-US'));
}

/** Answers for each intake questionnaire, keyed by its title. */
const PAPERWORK: Record<string, (page: Page, tag: string) => Promise<void>> = {
  'Consent Forms': async (page) => {
    await page.getByLabel('I agree to the HIPAA Notice of Privacy Practices').check();
    await page.getByLabel('I agree to financial responsibility terms').check();
  },
  'Contact Information': async (page) => {
    await page.getByLabel('Mobile Phone').fill(WORKFLOW_PATIENT.phone);
    await page.getByLabel('Email').fill(WORKFLOW_PATIENT.email);
    await page.getByLabel('Street Address').fill('48 Oak Avenue');
    await page.getByLabel('City').fill('Springfield');
    await page.getByLabel('State').fill('IL');
    await page.getByLabel('ZIP Code').fill('62704');
  },
  Insurance: async (page, tag) => {
    await page.getByLabel('Insurance Company').fill('Aetna');
    await page.getByLabel('Member ID').fill(tag);
    await page.getByLabel('Group Number').fill('GRP-200');
    await page.getByLabel('Subscriber Name').fill(`${WORKFLOW_PATIENT.firstName} ${WORKFLOW_PATIENT.lastName}`);
  },
  'Medical History': async (page) => {
    await page.getByLabel('Allergies (list each, or "None")').fill('None');
    await page.getByLabel('Current Medications').fill('Atorvastatin 20mg nightly');
    await page.getByLabel('Medical Conditions').fill('High cholesterol');
    await page.getByLabel('Past Surgeries').fill('None');
  },
};

test('a patient books a visit the EHR can see, completes its paperwork, then cancels it', async ({ page, browser }, testInfo) => {
  test.slow();
  const tag = uniqueTag();
  let visitId = '';

  // The clinic's side of the same visit, in the EHR, signed in as staff.
  const ehrContext = await browser.newContext({ baseURL: EHR_URL, storageState: authFile('admin') });
  const ehr = await ehrContext.newPage();
  async function expectVisitInEhr(status: string) {
    await ehr.goto(`/visit/${visitId}`);
    await expect(ehr.getByRole('heading', { level: 1, name: 'Visit Details' })).toBeVisible();
    await expect(ehr.getByRole('heading', { name: `${WORKFLOW_PATIENT.firstName} ${WORKFLOW_PATIENT.lastName}` })).toBeVisible();
    await expect(ehr.getByText('Annual physical')).toBeVisible();
    await expect(ehr.getByText(status, { exact: true })).toBeVisible();
  }

  try {
    await test.step('sign in', async () => {
      await signInAsWorkflowPatient(page);
    });

    await test.step('book an in-person visit from the home page', async () => {
      await page.getByRole('button', { name: /Book Appointment/ }).click();
      await expect(page.getByRole('heading', { level: 1, name: "Choose how you'd like to be seen" })).toBeVisible();
      await page.getByRole('radio', { name: /In person/ }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Select service' })).toBeVisible();
      await page.getByRole('button', { name: /Annual Physical/ }).click();

      await expect(page.getByRole('heading', { level: 1, name: 'Book an In-Person Visit' })).toBeVisible();
      const next = page.getByRole('button', { name: 'Continue' });
      await page.getByLabel('Reason for Visit').selectOption('Annual physical');
      await page.getByLabel('Preferred Location').selectOption('Main Clinic');
      await page.getByLabel('Visit Type').selectOption('Follow-up');
      const slotsLoaded = page.waitForResponse((r) => r.url().includes('/slots/available') && r.ok());
      await next.click();

      await expect(page.getByRole('heading', { level: 1, name: 'Select a Time' })).toBeVisible();
      // The calendar opens on this week; move on a week if the first open slot
      // falls in the next one. Its date is worked out in the browser's
      // timezone, as the calendar does, not the test runner's.
      const slots: Array<{ startTime: string; available: boolean }> = await (await slotsLoaded).json();
      const firstOpen = slots.find((s) => s.available)!;
      const day = await page.evaluate((iso) => new Date(iso).toLocaleDateString('en-US',
        { month: 'long', day: 'numeric', year: 'numeric' }), firstOpen.startTime);
      if (await page.getByRole('columnheader', { name: day }).count() === 0) {
        await page.getByRole('button', { name: 'Next week' }).click();
        await expect(page.getByRole('columnheader', { name: day })).toBeVisible();
      }
      await page.getByText(/^Dr\. .+ · \d{1,2}:\d{2} [AP]M$/).first().click();
      await expect(page.getByText(/^Selected: /)).toBeVisible();
      await next.click();

      await expect(page.getByRole('heading', { level: 1, name: 'Your Information' })).toBeVisible();
      await page.getByLabel('First Name').fill(WORKFLOW_PATIENT.firstName);
      await page.getByLabel('Last Name').fill(WORKFLOW_PATIENT.lastName);
      await page.getByLabel('Date of Birth').fill(WORKFLOW_PATIENT.dateOfBirth);
      await page.getByLabel('Phone').fill(WORKFLOW_PATIENT.phone);
      await page.getByLabel('Email').fill(WORKFLOW_PATIENT.email);
      await next.click();

      await expect(page.getByRole('heading', { level: 1, name: 'Review Your Appointment' })).toBeVisible();
      await expect(page.getByText('Annual physical')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm Appointment' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Appointment Confirmed' })).toBeVisible();
      await takeSnapshot(page, 'appointment confirmed', testInfo);
    });

    await test.step('the new visit is upcoming and needs paperwork', async () => {
      await page.getByRole('button', { name: 'View Visit Details' }).click();
      await expect(page).toHaveURL(/\/visits\/[^/]+$/);
      visitId = new URL(page.url()).pathname.split('/').pop()!;
      await expect(page.getByRole('heading', { level: 1, name: 'Annual physical' })).toBeVisible();
      await expect(page.getByText('Prebooked')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Paperwork Steps' })).toBeVisible();
    });

    await test.step('the clinic sees the booking in the EHR', async () => {
      await expectVisitInEhr('Prebooked');
    });

    await test.step('complete every intake form', async () => {
      await page.getByRole('button', { name: 'Complete Paperwork' }).click();
      for (let i = 0; i < Object.keys(PAPERWORK).length; i++) {
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toHaveText(new RegExp(`^(${Object.keys(PAPERWORK).join('|')})$`));
        const title = (await heading.textContent())!.trim();
        await PAPERWORK[title](page, tag);
        await page.getByRole('button', { name: /^(Save & Continue|Submit & Finish)$/ }).click();
        await expect(heading).not.toHaveText(title);
      }
      await expect(page).toHaveURL(new RegExp(`/visits/${visitId}$`));
      await expect(page.getByText('✓ All intake paperwork complete')).toBeVisible();
    });

    await test.step('cancel the visit', async () => {
      await page.getByRole('button', { name: 'Cancel Visit' }).click();
      await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel Visit' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Check In' })).toHaveCount(0);
    });

    await test.step('the clinic sees the cancellation in the EHR', async () => {
      await expectVisitInEhr('Cancelled');
    });
  } finally {
    await ehrContext.close();
  }
});

test('a patient messages the care team and replies in the thread', async ({ page }) => {
  const tag = uniqueTag();
  const subject = `Question about my cholesterol results (${tag})`;

  await signInAsWorkflowPatient(page);
  await goTo(page, 'Messages');
  await page.getByRole('button', { name: 'New message' }).click();
  await page.getByLabel('Subject').fill(subject);
  await page.getByLabel('Message').fill('Should I change my statin dose after the latest lipid panel?');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(toast(page, 'Message sent')).toBeVisible();
  await expect(page).toHaveURL(/\/messages\/[^/]+$/);
  await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible();
  await expect(page.getByText('Should I change my statin dose after the latest lipid panel?')).toBeVisible();

  await page.getByLabel('Reply').fill('Also, do I need to fast before the next draw?');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(toast(page, 'Reply sent')).toBeVisible();
  await expect(page.getByText('Also, do I need to fast before the next draw?')).toBeVisible();

  await page.getByRole('button', { name: 'Back to inbox' }).click();
  await expect(page.getByRole('row', { name: new RegExp(tag) })).toBeVisible();
});

test('a patient requests a medication refill', async ({ page }) => {
  await signInAsWorkflowPatient(page);
  await goTo(page, 'Medications');
  await page.getByRole('button', { name: 'Request Refill' }).click();
  await page.getByLabel('Medication').selectOption({ label: 'Atorvastatin' });
  await expect(page.getByLabel('Dosage')).toHaveValue('20mg nightly');
  await page.getByLabel('Notes (optional)').fill(`Running low — ${uniqueTag()}`);
  await page.getByRole('button', { name: 'Submit request' }).click();

  await expect(toast(page, 'Refill request submitted')).toBeVisible();
  await expect(page).toHaveURL(/\/medications$/);
  const today = await browserToday(page);
  await expect(page.getByRole('row', { name: `Atorvastatin ${today} pending` }).first()).toBeVisible();
});

test('a patient pays toward their balance', async ({ page }) => {
  await signInAsWorkflowPatient(page);
  await goTo(page, 'Bills');
  await expect(page.getByRole('heading', { level: 1, name: 'Bills & Payments' })).toBeVisible();
  const balanceText = page.getByText(/^\$[\d,]+\.\d{2}$/).first();
  const before = Number((await balanceText.textContent())!.replace(/[$,]/g, ''));
  test.skip(before < 1, 'no balance left to pay on this environment');

  await page.getByRole('button', { name: 'Pay balance' }).click();
  await expect(page.getByLabel('Amount')).toHaveValue(String(before));
  await page.getByLabel('Amount').fill('1');
  await page.getByRole('button', { name: 'Submit payment' }).click();

  await expect(toast(page, 'Payment of $1.00 recorded')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit payment' })).toBeHidden();
  const today = (await browserToday(page)).replace(/\//g, '\\/');
  await expect(page.getByRole('row', { name: new RegExp(`^${today} \\$1\\.00`) }).first()).toBeVisible();
  // Other runs may pay at the same time, so only check that it went down.
  await expect.poll(async () => Number((await balanceText.textContent())!.replace(/[$,]/g, ''))).toBeLessThan(before);
});
