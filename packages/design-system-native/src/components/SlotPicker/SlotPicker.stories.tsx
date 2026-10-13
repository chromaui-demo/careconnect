import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { SlotPicker, type Slot } from './SlotPicker';

// Built from local wall-clock times so the rendered days and times are the
// same whatever time zone the simulator runs in.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const slots: Slot[] = [
  { id: '1', startTime: at(14, 9), detail: 'Dr. Patel' },
  { id: '2', startTime: at(14, 9, 30), detail: 'Dr. Patel' },
  { id: '3', startTime: at(14, 11), detail: 'Dr. Okafor' },
  { id: '4', startTime: at(14, 14, 30), detail: 'Dr. Patel' },
  { id: '5', startTime: at(14, 16), detail: 'Dr. Okafor' },
  { id: '6', startTime: at(15, 8, 30), detail: 'Dr. Nguyen' },
  { id: '7', startTime: at(15, 10), detail: 'Dr. Nguyen' },
  { id: '8', startTime: at(16, 13), detail: 'Dr. Patel' },
  { id: '9', startTime: at(17, 9), detail: 'Dr. Okafor' },
  { id: '10', startTime: at(20, 15), detail: 'Dr. Nguyen' },
];

const meta = {
  title: 'Components/SlotPicker',
  component: SlotPicker,
  args: { slots, onSelect: () => {} },
} satisfies Meta<typeof SlotPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};
export const Selected: Story = { args: { selectedId: '3' } };
export const SecondDaySelected: Story = { args: { selectedId: '7' } };
export const Empty: Story = { args: { slots: [] } };

export const Interactive: Story = {
  render: (args) => {
    const [id, setId] = useState<string | null>(null);
    return <SlotPicker {...args} selectedId={id} onSelect={(s) => setId(s.id)} />;
  },
};
