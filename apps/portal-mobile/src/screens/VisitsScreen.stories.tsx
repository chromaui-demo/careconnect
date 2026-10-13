import type { Meta, StoryObj } from '@storybook/react-native';
import { appointments } from './fixtures';
import { VisitsScreen } from './VisitsScreen';

const meta = {
  title: 'Visits/List',
  component: VisitsScreen,
  parameters: { layout: 'fullscreen' },
  args: { appointments, onOpenVisit: () => {}, onBook: () => {} },
} satisfies Meta<typeof VisitsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OnlyPast: Story = { args: { appointments: appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled') } };
export const NoVisits: Story = { args: { appointments: [] } };
export const Loading: Story = { args: { loading: true } };
export const LoadFailed: Story = { args: { appointments: [], error: 'Could not reach CareConnect. Pull to retry.' } };
