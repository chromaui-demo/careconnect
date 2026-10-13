import type { Meta, StoryObj } from '@storybook/react-native';
import { appointments, paperworkComplete, paperworkIncomplete } from './fixtures';
import { VisitDetailScreen } from './VisitDetailScreen';

const meta = {
  title: 'Visits/Detail',
  component: VisitDetailScreen,
  parameters: { layout: 'fullscreen' },
  args: { appointment: appointments[0], paperwork: paperworkIncomplete, onAction: () => {} },
} satisfies Meta<typeof VisitDetailScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PaperworkDue: Story = {};
export const ReadyToCheckIn: Story = { args: { paperwork: paperworkComplete } };
export const CheckingIn: Story = { args: { paperwork: paperworkComplete, pending: 'check-in' } };
export const VirtualVisit: Story = { args: { appointment: appointments[1], paperwork: paperworkComplete } };
export const Completed: Story = { args: { appointment: appointments[2], paperwork: null } };
export const Cancelled: Story = { args: { appointment: appointments[3], paperwork: null } };
export const Loading: Story = { args: { appointment: null } };
