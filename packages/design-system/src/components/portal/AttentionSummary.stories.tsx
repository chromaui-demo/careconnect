import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { AttentionSummary, type AttentionItem } from './AttentionSummary';
import { figmaDesign } from '../../figma/links';
import { allModes } from '../../../.storybook/modes';

const meta: Meta<typeof AttentionSummary> = {
  title: 'Portal/Attention Summary',
  parameters: {
    design: figmaDesign('Portal/Attention Summary'),
    layout: 'padded',
    chromatic: { modes: { light: allModes.light, dark: allModes.dark, mobile: allModes.mobile } },
  },
  component: AttentionSummary,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AttentionSummary>;

const everythingDue: AttentionItem[] = [
  { id: 'visit', label: 'Next visit', value: 'Tue, Oct 20', detail: '9:30 AM · Dr. Chen · Follow-up', actionLabel: 'View visit', onAction: fn() },
  { id: 'results', label: 'Results to review', value: 1, detail: 'Lipid panel · 199 mg/dL', actionLabel: 'View results', onAction: fn() },
  { id: 'messages', label: 'Unread messages', value: 2, detail: 'From your care team', actionLabel: 'Open messages', onAction: fn() },
  { id: 'balance', label: 'Balance due', value: '$45.00', detail: 'From your Sep 28 visit', actionLabel: 'Pay bill', onAction: fn() },
  { id: 'refills', label: 'Refills in progress', value: 1, detail: 'Lisinopril 10 mg', actionLabel: 'View medications', onAction: fn() },
];

export const EverythingDue: Story = {
  args: { items: everythingDue },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('heading', { name: 'Needs your attention' })).toBeVisible();
    for (const item of everythingDue) {
      await expect(canvas.getByText(item.label)).toBeVisible();
    }
    await userEvent.click(canvas.getByRole('button', { name: 'View results' }));
    await expect(args.items[1].onAction).toHaveBeenCalledOnce();
  },
};

export const NothingDue: Story = {
  args: { items: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You’re all caught up')).toBeVisible();
  },
};

export const OneSourceUnavailable: Story = {
  args: {
    items: everythingDue.filter((i) => i.id !== 'balance'),
    unavailable: ['billing'],
    onRetry: fn(),
  },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('We couldn’t load your billing right now.');
    await expect(canvas.getByText('Results to review')).toBeVisible();
    await expect(canvas.queryByText('Balance due')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const Loading: Story = {
  args: { items: [], loading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Needs your attention' })).toBeVisible();
    await expect(canvas.queryByText('You’re all caught up')).not.toBeInTheDocument();
  },
};
