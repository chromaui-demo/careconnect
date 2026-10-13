import { configure, takeSnapshot } from '@chromatic-com/vitest';
import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { CommandPalette, sampleCommandItems } from './CommandPalette';

beforeEach(async () => {
  await page.viewport(1280, 800);
});

test('keyboard navigation through filtered results', async () => {
  const screen = await render(<CommandPalette open onClose={() => {}} items={sampleCommandItems} />);
  await takeSnapshot('all commands');

  await screen.getByRole('textbox').fill('go to');
  await userEvent.keyboard('{ArrowDown}');
  await expect
    .element(screen.getByRole('button', { name: 'Go to schedule' }))
    .toHaveClass('cc-command-palette__item--active');
  await takeSnapshot('second result highlighted');

  await screen.getByRole('textbox').fill('discharge summary');
  await expect.element(screen.getByText('No matches')).toBeVisible();
});

// forced-colors is a media feature Chromatic emulates at capture time;
// configure() inside a describe applies to every test in it.
describe('Windows high contrast', () => {
  configure({ forcedColors: 'active' });

  test('active result stays distinguishable', async () => {
    const screen = await render(<CommandPalette open onClose={() => {}} items={sampleCommandItems} />);
    await userEvent.keyboard('{ArrowDown}');
    await expect
      .element(screen.getByRole('button', { name: 'Search patient by MRN' }))
      .toHaveClass('cc-command-palette__item--active');
  });
});
