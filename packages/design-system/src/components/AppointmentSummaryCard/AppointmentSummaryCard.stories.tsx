import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { AppointmentSummaryCard } from './AppointmentSummaryCard';
import { figmaDesign } from '../../figma/links';
import { allModes } from '../../../.storybook/modes';

const meta = {
  title: 'Components/AppointmentSummaryCard',
  component: AppointmentSummaryCard,
  tags: ['autodocs'],
  parameters: {
    design: figmaDesign('Components/AppointmentSummaryCard'),
    chromatic: { modes: { mobile: allModes.mobile, desktop: allModes.desktop } },
    docs: { description: { component: 'Patient-facing visit summary with a single primary action. Date and time labels are supplied by the caller. A Figma component can be linked through the design registry once its URL is available.' } },
  },
  decorators: [(Story) => <div style={{ maxWidth: '40rem', margin: '0 auto' }}><Story /></div>],
  args: {
    appointment: {
      id: 'visit-wellness',
      reason: 'Annual wellness visit',
      dateLabel: 'Tuesday, October 20, 2026',
      timeLabel: '9:30 AM CDT',
      dateTime: '2026-10-20T09:30:00-05:00',
      provider: 'Dr. Maya Chen',
      location: 'Northside Clinic · Suite 200',
      serviceMode: 'in-person',
    },
    onViewVisit: fn(),
  },
} satisfies Meta<typeof AppointmentSummaryCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InPerson: Story = {};

export const Virtual: Story = {
  args: { appointment: { ...meta.args.appointment, location: 'Video visit', serviceMode: 'virtual' } },
};

export const LongDetails: Story = {
  args: {
    appointment: {
      ...meta.args.appointment,
      reason: 'Follow-up for your annual wellness visit and care plan',
      provider: 'Dr. Alexandra Montgomery-Williams',
      location: 'Northside Family Medicine and Preventive Care · Suite 200',
    },
  },
};

export const OpensVisitWithKeyboard: Story = {
  play: async ({ args, canvas, userEvent, step }) => {
    await step('Identify the appointment and primary action', async () => {
      await expect(canvas.getByRole('heading', { name: args.appointment.reason })).toBeVisible();
      await expect(canvas.getByText(args.appointment.provider)).toBeVisible();
    });
    await step('Open this visit using the keyboard', async () => {
      const button = canvas.getByRole('button', { name: 'View visit' });
      await userEvent.tab();
      await expect(button).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(args.onViewVisit).toHaveBeenCalledOnce();
      await expect(args.onViewVisit).toHaveBeenCalledWith(args.appointment.id);
    });
  },
};
