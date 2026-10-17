/**
 * Waits for pages whose final look depends on data loaded after the heading
 * appears, so a test that ends on them sends Chromatic a finished page.
 */
import type { Page } from '@playwright/test';
import { expect } from '@chromatic-com/playwright';

/**
 * The EHR tracking board fills its Provider, Service and Location filters from
 * the API after it renders. A native select is as wide as its widest option,
 * so a snapshot taken before they load shows narrower filters. Which requests
 * succeed depends on the role (clinical staff are refused the provider and
 * location lists), so wait for them to finish rather than for their options.
 * The board does not poll, so the network goes quiet once they have.
 */
export async function expectTrackingBoardReady(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Tracking Board' })).toBeVisible();
  await page.waitForLoadState('networkidle');
}
