import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Button } from './Button';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  parameters: { design: figmaDesign('Components/Button') },
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'accent'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Check In Patient', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Cancel', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'View Details', variant: 'ghost' },
};

export const Accent: Story = {
  args: { children: 'Start Encounter', variant: 'accent' },
};

export const Danger: Story = {
  args: { children: 'Cancel Appointment', variant: 'danger' },
};

export const Loading: Story = {
  args: { children: 'Saving...', loading: true },
};

export const Hover: Story = {
  args: { children: 'Check In Patient', variant: 'primary' },
  parameters: { pseudo: { hover: true } },
};

export const Disabled: Story = {
  args: { children: 'Check In Patient', disabled: true },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
export const FiresOnClick: Story = {
  args: { children: 'Check In Patient', onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Check In Patient' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const LoadingIgnoresClicks: Story = {
  args: { children: 'Saving...', loading: true, onClick: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Saving...' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
