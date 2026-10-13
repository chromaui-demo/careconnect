import type { Meta, StoryObj } from '@storybook/react-native';
import { threads } from './fixtures';
import { MessagesScreen } from './MessagesScreen';

const meta = {
  title: 'Messages/Inbox',
  component: MessagesScreen,
  parameters: { layout: 'fullscreen' },
  args: { threads, onOpenThread: () => {} },
} satisfies Meta<typeof MessagesScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inbox: Story = {};
export const AllRead: Story = { args: { threads: threads.map((t) => ({ ...t, unreadCount: 0 })) } };
export const Empty: Story = { args: { threads: [] } };
export const Loading: Story = { args: { loading: true } };
export const LoadFailed: Story = { args: { threads: [], error: 'Failed to load messages' } };
