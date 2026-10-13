import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { threadDetail } from './fixtures';
import { ThreadScreen } from './ThreadScreen';

const meta = {
  title: 'Messages/Thread',
  component: ThreadScreen,
  parameters: { layout: 'fullscreen' },
  args: { thread: threadDetail, reply: '', onReplyChange: () => {}, onSend: () => {} },
} satisfies Meta<typeof ThreadScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Conversation: Story = {};
export const Drafting: Story = { args: { reply: 'Thanks! See you on the 14th.' } };
export const Sending: Story = { args: { reply: 'Thanks! See you on the 14th.', sending: true } };
export const Sent: Story = { args: { notice: { tone: 'success', text: 'Reply sent' } } };
export const SendFailed: Story = { args: { reply: 'Thanks! See you on the 14th.', notice: { tone: 'error', text: 'Failed to send' } } };
export const Loading: Story = { args: { thread: null } };

export const Interactive: Story = {
  render: (args) => {
    const [reply, setReply] = useState('');
    return <ThreadScreen {...args} reply={reply} onReplyChange={setReply} onSend={() => setReply('')} />;
  },
};
