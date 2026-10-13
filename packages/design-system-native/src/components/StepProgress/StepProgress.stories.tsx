import type { Meta, StoryObj } from '@storybook/react-native';
import { StepProgress } from './StepProgress';

const meta = {
  title: 'Components/StepProgress',
  component: StepProgress,
  args: { current: 1, total: 4, label: 'Visit details' },
} satisfies Meta<typeof StepProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {};
export const Midway: Story = { args: { current: 2, label: 'Choose a time' } };
export const LastStep: Story = { args: { current: 4, label: 'Review' } };
