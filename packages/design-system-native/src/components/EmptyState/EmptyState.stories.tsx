import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from '../Button/Button';
import { EmptyState } from './EmptyState';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: {
    title: 'No messages yet',
    description: 'Send a secure message to your provider about care questions, refills, or follow-up.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = { args: { action: <Button>New message</Button> } };
export const CustomIcon: Story = { args: { icon: '📅', title: 'No upcoming visits', description: undefined } };
