import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { FollowUpQueue, type FollowUpItem, type FollowUpQueueProps } from './FollowUpQueue';

const tasks: FollowUpItem[] = [
  { id: 'followup-1', title: 'Confirm the follow-up appointment', patientId: 'patient-alice', patientName: 'Alice Smith', status: 'open', priority: 'high', dueDate: '2026-11-03', assigneeId: 'nurse-patel', assigneeName: 'Priya Patel' },
  { id: 'followup-2', title: 'Arrange transport for the next visit', patientId: 'patient-bob', patientName: 'Bob Johnson', status: 'open', priority: 'normal', dueDate: '2026-11-04' },
  { id: 'followup-3', title: 'Check that the referral was received', patientId: 'patient-charlie', patientName: 'Charlie Williams', status: 'open', priority: 'normal', dueDate: '2026-11-06', assigneeId: 'coordinator-lee', assigneeName: 'Morgan Lee' },
  { id: 'followup-4', title: 'Completed reminder', patientName: 'Diana Lee', status: 'completed', priority: 'normal', dueDate: '2026-11-02' },
];
const meta: Meta<typeof FollowUpQueue> = {
  title: 'Clinical/Follow-up Queue',
  component: FollowUpQueue,
  tags: ['autodocs'],
  parameters: { layout: 'padded', chromatic: { modes: { light: { theme: 'light' }, dark: { theme: 'dark' }, mobile: { viewport: 'mobile' } } } },
  args: { items: tasks, today: '2026-11-05', currentUserId: 'nurse-patel' },
};
export default meta;
type Story = StoryObj<typeof FollowUpQueue>;

function QueueDemo(props: FollowUpQueueProps & { rejectCompletion?: boolean; rejectFirstCompletion?: boolean }) {
  const [items, setItems] = useState(props.items);
  const [patient, setPatient] = useState('');
  const attempts = useRef(0);
  return <><FollowUpQueue {...props} items={items} onComplete={async id => {
    if (props.rejectCompletion || (props.rejectFirstCompletion && attempts.current++ === 0)) throw new Error('Prepared connection failure');
    setItems(items => items.map(item => item.id === id ? { ...item, status: 'completed' } : item));
  }} onOpenPatient={setPatient} />{patient && <p role="status">Opened patient context: {patient}</p>}</>;
}

export const TeamHandoff: Story = {
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Team handoff' })).toBeVisible();
    await expect(canvas.getByText('2 overdue · 1 unassigned')).toBeVisible();
    await expect(canvas.queryByText('Completed reminder')).not.toBeInTheDocument();
  },
};
export const ClinicianOwnWork: Story = {
  args: { initialView: 'mine' },
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'My follow-ups' })).toBeVisible();
    await expect(canvas.getByText('Alice Smith')).toBeVisible();
    await expect(canvas.queryByText('Bob Johnson')).not.toBeInTheDocument();
    await expect(canvas.getByText('1 overdue · 0 unassigned')).toBeVisible();
  },
};
export const OverdueFilter: Story = {
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Overdue' }));
    await expect(canvas.getByText('Alice Smith')).toBeVisible();
    await expect(canvas.getByText('Bob Johnson')).toBeVisible();
    await expect(canvas.queryByText('Charlie Williams')).not.toBeInTheDocument();
  },
};
export const CompleteAndOpenPatient: Story = {
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas, userEvent }) => {
    const row = within(canvas.getByText('Alice Smith').closest('tr')!);
    await userEvent.click(row.getByRole('button', { name: 'Open patient' }));
    await expect(canvas.getByText('Opened patient context: patient-alice')).toBeVisible();
    await userEvent.click(row.getByRole('button', { name: 'Complete follow-up' }));
    await expect(canvas.queryByText('Alice Smith')).not.toBeInTheDocument();
    await expect(canvas.getByText('Bob Johnson')).toBeVisible();
  },
};
export const CompletionFailed: Story = {
  render: args => <QueueDemo {...args} rejectCompletion />,
  play: async ({ canvas, userEvent }) => {
    const row = within(canvas.getByText('Alice Smith').closest('tr')!);
    await userEvent.click(row.getByRole('button', { name: 'Complete follow-up' }));
    await expect(canvas.getByText('Follow-up was not completed')).toBeVisible();
    await expect(canvas.getByText('Alice Smith')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Retry completion' })).toBeEnabled();
  },
};
export const RefreshFailed: Story = {
  args: { loadError: 'The connection was interrupted.', onRetry: fn() },
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByText('Alice Smith')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry loading' }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
export const NothingOutstanding: Story = {
  args: { items: [] },
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No open follow-ups in this view.')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Complete follow-up' })).not.toBeInTheDocument();
  },
};
export const Loading: Story = {
  args: { items: [], loading: true },
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas }) => { await expect(canvas.getByRole('status')).toHaveTextContent('Loading follow-ups'); },
};

export const RetryAfterConnectionRecovers: Story = {
  render: args => <QueueDemo {...args} rejectFirstCompletion />,
  play: async ({ canvas, userEvent }) => {
    const row = within(canvas.getByText('Alice Smith').closest('tr')!);
    await userEvent.click(row.getByRole('button', { name: 'Complete follow-up' }));
    await expect(canvas.getByText('Follow-up was not completed')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry completion' }));
    await expect(canvas.queryByText('Alice Smith')).not.toBeInTheDocument();
    await expect(canvas.getByText('Bob Johnson')).toBeVisible();
  },
};

export const CountsFollowStaffView: Story = {
  render: args => <QueueDemo {...args} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('2 overdue · 1 unassigned')).toBeVisible();
    await userEvent.click(canvas.getByRole('radio', { name: 'Mine' }));
    await expect(canvas.getByText('1 overdue · 0 unassigned')).toBeVisible();
    const row = within(canvas.getByText('Alice Smith').closest('tr')!);
    await userEvent.click(row.getByRole('button', { name: 'Complete follow-up' }));
    await expect(canvas.getByText('0 overdue · 0 unassigned')).toBeVisible();
    await expect(canvas.getByText('No open follow-ups assigned to you.')).toBeVisible();
    await userEvent.click(canvas.getByRole('radio', { name: 'Team' }));
    await expect(canvas.getByText('1 overdue · 1 unassigned')).toBeVisible();
    await expect(canvas.getByText('Bob Johnson')).toBeVisible();
  },
};
