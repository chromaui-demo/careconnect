import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScheduleCalendar, sampleScheduleEvents } from './ScheduleCalendar';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof ScheduleCalendar> = {
  title: 'Clinical/ScheduleCalendar',
  component: ScheduleCalendar,
  tags: ['autodocs'],
  parameters: { design: figmaDesign('Clinical/ScheduleCalendar'), layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ScheduleCalendar>;

// Pinned to the sample events' week so the stories never depend on today's date.
const initialDate = '2026-08-21';

export const WeekView: Story = {
  args: { events: sampleScheduleEvents, initialView: 'timeGridWeek', initialDate },
};

export const MonthView: Story = {
  args: { events: sampleScheduleEvents, initialView: 'dayGridMonth', initialDate, height: 480 },
};
