import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { OptionCard } from './OptionCard';

const meta = {
  title: 'Components/OptionCard',
  component: OptionCard,
  args: { icon: '🏥', title: 'Book appointment', description: 'Choose in-person or virtual care', onPress: () => {} },
} satisfies Meta<typeof OptionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tile: Story = {};

export const RadioGroup: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <OptionCard role="radio" selected title="In person" description="Visit a clinic location" onPress={() => {}} />
      <OptionCard role="radio" title="Virtual" description="Video visit from home" onPress={() => {}} />
    </View>
  ),
};
