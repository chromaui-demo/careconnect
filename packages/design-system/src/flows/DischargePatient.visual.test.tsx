import { takeSnapshot } from '@chromatic-com/vitest';
import { useState } from 'react';
import { beforeEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button, Modal, PatientBanner, ToastProvider, useToast, type PatientBannerProps } from '../index';

// A flow that spans components — banner, confirm dialog, toast — the way the
// EHR composes them. No single story renders this; a Vitest test can.
function DischargeScreen() {
  const [status, setStatus] = useState<PatientBannerProps['status']>('in-office');
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  return (
    <>
      <PatientBanner
        name="Alice Smith"
        mrn="MRN-10482"
        dob="03/14/1985"
        age={41}
        sex="Female"
        status={status}
        alerts={['Penicillin allergy', 'Fall risk']}
        actions={
          status === 'in-office' && (
            <Button size="sm" onClick={() => setConfirming(true)}>
              Discharge
            </Button>
          )
        }
      />
      <Modal
        open={confirming}
        title="Discharge Alice Smith?"
        confirmLabel="Discharge"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          setStatus('completed');
          toast.push('Alice Smith discharged', 'success');
        }}
      >
        The encounter closes and the patient leaves the tracking board.
      </Modal>
    </>
  );
}

// The same flow across theme × viewport: four tests, each with three snapshots,
// from one test body.
const variants = [
  { theme: 'light', viewport: 'desktop', width: 1280, height: 800 },
  { theme: 'dark', viewport: 'desktop', width: 1280, height: 800 },
  { theme: 'light', viewport: 'mobile', width: 375, height: 812 },
  { theme: 'dark', viewport: 'mobile', width: 375, height: 812 },
] as const;

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

test.for(variants)('discharge a patient ($theme, $viewport)', async ({ theme, width, height }) => {
  await page.viewport(width, height);
  document.documentElement.dataset.theme = theme;

  const screen = await render(<DischargeScreen />, { wrapper: ToastProvider });
  await takeSnapshot('in office');

  await screen.getByRole('button', { name: 'Discharge' }).click();
  const dialog = screen.getByRole('dialog', { name: 'Discharge Alice Smith?' });
  await expect.element(dialog).toBeVisible();
  await takeSnapshot('confirm dialog');

  await dialog.getByRole('button', { name: 'Discharge' }).click();
  await expect.element(screen.getByRole('status')).toHaveTextContent('Alice Smith discharged');
  await expect.element(screen.getByText('completed')).toBeVisible();
});
