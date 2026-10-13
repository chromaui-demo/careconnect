import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { StatCard } from './StatCard';

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
  args: { label: 'Upcoming', value: 2 },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const Row: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <StatCard label="Upcoming" value={2} />
      <StatCard label="Completed" value={7} />
      <StatCard label="Cancelled" value={1} />
    </View>
  ),
};
