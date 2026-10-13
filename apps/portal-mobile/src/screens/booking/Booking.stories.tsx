import type { Meta, StoryObj } from '@storybook/react-native';
import { emptyDraft, type BookingDraft } from '../../booking/BookingContext';
import { slots } from '../fixtures';
import { BookVisitScreen } from './BookVisitScreen';
import { ConfirmationScreen } from './ConfirmationScreen';
import { PatientInfoScreen } from './PatientInfoScreen';
import { ReviewScreen } from './ReviewScreen';
import { SelectTimeScreen } from './SelectTimeScreen';

// One story per step and state of the booking flow — the critical path from
// "I need to be seen" to a confirmed appointment.
const noop = () => {};

const filled: BookingDraft = {
  ...emptyDraft,
  reason: 'Annual physical',
  slot: slots[2],
  firstName: 'Alice',
  lastName: 'Smith',
  dateOfBirth: '1988-04-12',
  phone: '(555) 010-2231',
  email: 'alice.smith@se-tools.net',
};

const meta = {
  title: 'Booking',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Step1Empty: Story = {
  name: '1 · Visit details — empty',
  render: () => <BookVisitScreen draft={emptyDraft} onChange={noop} onContinue={noop} onCancel={noop} />,
};
export const Step1InPerson: Story = {
  name: '1 · Visit details — in person',
  render: () => <BookVisitScreen draft={{ ...filled, location: 'Urgent Care West', visitType: 'new' }} onChange={noop} onContinue={noop} onCancel={noop} />,
};
export const Step1Virtual: Story = {
  name: '1 · Visit details — virtual',
  render: () => <BookVisitScreen draft={{ ...filled, mode: 'virtual', reason: 'Skin rash' }} onChange={noop} onContinue={noop} onCancel={noop} />,
};

export const Step2NoSelection: Story = {
  name: '2 · Time — nothing picked',
  render: () => <SelectTimeScreen slots={slots} selected={null} onSelect={noop} onContinue={noop} onBack={noop} />,
};
export const Step2Selected: Story = {
  name: '2 · Time — slot picked',
  render: () => <SelectTimeScreen slots={slots} selected={slots[2]} onSelect={noop} onContinue={noop} onBack={noop} />,
};
export const Step2Loading: Story = {
  name: '2 · Time — loading',
  render: () => <SelectTimeScreen slots={[]} loading selected={null} onSelect={noop} onContinue={noop} onBack={noop} />,
};
export const Step2NoSlots: Story = {
  name: '2 · Time — fully booked',
  render: () => <SelectTimeScreen slots={[]} selected={null} onSelect={noop} onContinue={noop} onBack={noop} />,
};

export const Step3Prefilled: Story = {
  name: '3 · Your information — prefilled',
  render: () => <PatientInfoScreen draft={filled} onChange={noop} onContinue={noop} onBack={noop} />,
};
export const Step3InvalidDob: Story = {
  name: '3 · Your information — invalid date of birth',
  render: () => <PatientInfoScreen draft={{ ...filled, dateOfBirth: '04/12/1988' }} onChange={noop} onContinue={noop} onBack={noop} />,
};

export const Step4Review: Story = {
  name: '4 · Review',
  render: () => <ReviewScreen draft={filled} onConfirm={noop} onBack={noop} />,
};
export const Step4ReviewVirtual: Story = {
  name: '4 · Review — virtual',
  render: () => <ReviewScreen draft={{ ...filled, mode: 'virtual' }} onConfirm={noop} onBack={noop} />,
};
export const Step4Submitting: Story = {
  name: '4 · Review — booking',
  render: () => <ReviewScreen draft={filled} submitting onConfirm={noop} onBack={noop} />,
};
export const Step4Failed: Story = {
  name: '4 · Review — slot taken',
  render: () => <ReviewScreen draft={filled} error="That time was just booked by someone else. Pick another time." onConfirm={noop} onBack={noop} />,
};

export const Confirmed: Story = {
  name: '5 · Confirmed',
  render: () => <ConfirmationScreen scheduledTime={slots[2].startTime} provider={slots[2].provider} onViewVisit={noop} onDone={noop} />,
};
