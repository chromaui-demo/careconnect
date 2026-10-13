import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { ChipGroup } from './ChipGroup';

const options = ['Cough and/or congestion', 'Fever', 'Throat pain', 'Ear pain', 'Annual physical', 'Other'];

const meta = {
  title: 'Components/ChipGroup',
  component: ChipGroup,
  args: { label: 'Reason for visit', options, value: null, onChange: () => {} },
} satisfies Meta<typeof ChipGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoneSelected: Story = {};
export const Selected: Story = { args: { value: 'Fever' } };

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>(null);
    return <ChipGroup {...args} value={value} onChange={setValue} />;
  },
};
