import type { Meta, StoryObj } from '@storybook/react-native';
import { LoadingState } from './LoadingState';

const meta = {
  title: 'Components/LoadingState',
  component: LoadingState,
  args: { label: 'Loading your visits…', fill: false },
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {};
export const FullScreen: Story = { args: { fill: true, label: 'Checking session…' } };
