import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { MessageBubble } from './MessageBubble';

const meta = {
  title: 'Components/MessageBubble',
  component: MessageBubble,
  args: {
    sender: 'Dr. Raj Patel',
    timestamp: 'Oct 8, 2:14 PM',
    body: 'Your A1C came back at 5.6%, which is in the normal range. No changes needed to your plan.',
  },
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Incoming: Story = {};
export const Outgoing: Story = { args: { outgoing: true, sender: 'You', body: 'Great news, thank you!' } };

export const Conversation: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <MessageBubble outgoing sender="You" timestamp="Oct 7, 9:02 AM" body="Hi Dr. Patel — have my lab results come back yet?" />
      <MessageBubble sender="Dr. Raj Patel" timestamp="Oct 8, 2:14 PM" body="Your A1C came back at 5.6%, which is in the normal range. No changes needed to your plan." />
      <MessageBubble outgoing sender="You" timestamp="Oct 8, 2:20 PM" body="Great news, thank you!" />
    </View>
  ),
};
