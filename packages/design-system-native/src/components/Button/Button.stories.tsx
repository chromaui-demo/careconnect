import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Book appointment', onPress: () => {} },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Accent: Story = { args: { variant: 'accent', children: 'Confirm appointment' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Back' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Cancel visit' } };
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = { args: { disabled: true } };
export const FullWidth: Story = { args: { fullWidth: true, size: 'lg', children: 'Sign in' } };

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      {(['primary', 'secondary', 'accent', 'ghost', 'danger'] as const).map((v) => (
        <View key={v} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Button variant={v} size="sm">{v}</Button>
          <Button variant={v}>{v}</Button>
          <Button variant={v} size="lg">{v}</Button>
        </View>
      ))}
    </View>
  ),
};
