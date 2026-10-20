import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { CareGaps } from './CareGaps';
import { figmaDesign } from '../../figma/links';
import { allModes } from '../../../.storybook/modes';

const meta = {
  title: 'Clinical/Care Gaps',
  component: CareGaps,
  tags: ['autodocs'],
  parameters: {
    design: figmaDesign('Clinical/Care Gaps'),
    chromatic: { modes: { light: allModes.light, dark: allModes.dark, mobile: allModes.mobile } },
  },
  args: { onAddress: fn(), onDismiss: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 560 }}><Story /></div>],
} satisfies Meta<typeof CareGaps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverdueAndDueSoon: Story = {
  args: {
    gaps: [
      { id: 'crc', title: 'Colorectal cancer screening', detail: 'Last done Mar 2016 · due every 10 years', status: 'overdue' },
      { id: 'flu', title: 'Influenza vaccine', detail: 'Last given Oct 2025', status: 'overdue' },
      { id: 'a1c', title: 'Hemoglobin A1c', detail: 'Due Nov 2026', status: 'due-soon' },
    ],
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('3 open')).toBeVisible();
    await expect(canvas.getAllByText('Overdue')).toHaveLength(2);
    await expect(canvas.getByText('Due soon')).toBeVisible();

    await userEvent.click(canvas.getAllByRole('button', { name: 'Mark addressed' })[0]);
    await expect(args.onAddress).toHaveBeenCalledWith('crc');

    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss Influenza vaccine' }));
    await expect(args.onDismiss).toHaveBeenCalledWith('flu');
  },
};

export const NoOpenGaps: Story = {
  args: { gaps: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No open care gaps.')).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
