import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  args: {
    children: (
      <View style={{ gap: 4 }}>
        <Text variant="heading">Annual physical</Text>
        <Text tone="secondary">Tue, Oct 14 · 9:30 AM · Dr. Patel</Text>
      </View>
    ),
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Elevated: Story = { args: { elevated: true, padding: 'lg' } };
export const Pressable: Story = { args: { onPress: () => {}, accessibilityLabel: 'Open visit' } };

export const WarningCallout: Story = {
  args: {
    tone: 'warning',
    elevated: true,
    padding: 'lg',
    children: (
      <View style={{ gap: 12 }}>
        <Text weight="700">Intake paperwork incomplete (40%)</Text>
        <Text tone="secondary">Complete all forms before your visit for faster check-in.</Text>
        <Button variant="accent">Complete paperwork</Button>
      </View>
    ),
  },
};
