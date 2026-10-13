import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Text } from './Text';

const meta = {
  title: 'Foundations/Text',
  component: Text,
  args: { children: 'Your health. Your way.' },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};

export const Scale: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <Text variant="display">Display</Text>
      <Text variant="title">Title</Text>
      <Text variant="heading">Heading</Text>
      <Text variant="body">Body — view test results and message your care team.</Text>
      <Text variant="caption" tone="secondary">Caption — secondary tone</Text>
      <Text variant="label" tone="muted">Label</Text>
    </View>
  ),
};

export const Tones: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text tone="default">Default</Text>
      <Text tone="secondary">Secondary</Text>
      <Text tone="muted">Muted</Text>
      <Text tone="primary">Primary</Text>
      <Text tone="error">Error</Text>
    </View>
  ),
};
