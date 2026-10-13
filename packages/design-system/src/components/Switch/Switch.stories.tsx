import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Switch } from './Switch';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Switch> = { title: 'Components/Switch', parameters: { design: figmaDesign('Components/Switch') }, component: Switch, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = { args: { label: 'Telemed visit' } };
export const Checked: Story = { args: { label: 'Auto-check eligibility', defaultChecked: true } };

export const Focus: Story = {
  args: { label: 'Telemed visit' },
  parameters: { pseudo: { focusVisible: '.cc-switch__input' } },
};

export const Disabled: Story = {
  args: { label: 'Telemed visit', disabled: true },
};

// Interaction test: the whole row is the hit target, not just the track.
// Chromatic runs this play function on every build alongside the snapshot.
export const TogglesFromLabel: Story = {
  args: { label: 'Telemed visit' },
  play: async ({ canvas, userEvent }) => {
    const toggle = canvas.getByRole('switch', { name: 'Telemed visit' });
    await expect(toggle).not.toBeChecked();
    await userEvent.click(canvas.getByText('Telemed visit'));
    await expect(toggle).toBeChecked();
  },
};
