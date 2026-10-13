import type { Meta, StoryObj } from '@storybook/react-native';
import { Alert } from './Alert';

const meta = {
  title: 'Components/Alert',
  component: Alert,
  args: { children: 'Please complete your intake paperwork before your visit.' },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = { args: { tone: 'success', title: 'Reply sent', children: 'Your care team usually replies within one business day.' } };
export const Warning: Story = { args: { tone: 'warning', title: 'Paperwork incomplete' } };
export const ErrorMessage: Story = { args: { tone: 'error', children: 'Please sign in with a patient account' } };
