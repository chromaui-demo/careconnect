import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { AppointmentsFilterBarDemo } from './AppointmentsFilterBar';
import { figmaDesign } from '../../figma/links';

const meta: Meta = { title: 'Clinical/AppointmentsFilterBar', parameters: { design: figmaDesign('Clinical/AppointmentsFilterBar') }, tags: ['autodocs'] };
export default meta;
type Story = StoryObj;

export const TrackingBoardFilters: Story = { render: () => <AppointmentsFilterBarDemo /> };

// Interaction test: every filter control is wired to the demo's state.
export const AppliesEachFilter: Story = {
  render: () => <AppointmentsFilterBarDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('tab', { name: /Completed/ }));
    await expect(canvas.getByRole('tab', { name: /Completed/ })).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'false');

    await userEvent.selectOptions(canvas.getByLabelText('Location'), 'Telemed Hub');
    await expect(canvas.getByLabelText('Location')).toHaveValue('telemed');

    await userEvent.type(canvas.getByLabelText('Search patients'), 'MRN-1042');
    await expect(canvas.getByLabelText('Search patients')).toHaveValue('MRN-1042');
  },
};
