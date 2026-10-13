import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Badge } from './Badge';
import { formatStatusLabel } from './status';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'New' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDot: Story = { args: { variant: 'info', dot: true, children: '3 new' } };

export const AppointmentStatuses: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      {(['prebooked', 'in-office', 'completed', 'cancelled'] as const).map((s) => (
        <Badge key={s} variant={s} dot>{formatStatusLabel(s)}</Badge>
      ))}
    </View>
  ),
};

export const Semantic: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {(['default', 'success', 'warning', 'error', 'info'] as const).map((v) => (
        <Badge key={v} variant={v}>{v}</Badge>
      ))}
    </View>
  ),
};
