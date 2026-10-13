import type { Meta, StoryObj } from '@storybook/react-native';
import { appointments } from './fixtures';
import { HomeScreen } from './HomeScreen';

const meta = {
  title: 'Home',
  component: HomeScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    firstName: 'Alice',
    lastName: 'Smith',
    nextVisit: appointments[0],
    unreadMessages: 2,
    onNavigate: () => {},
    onOpenVisit: () => {},
    onSignOut: () => {},
  },
} satisfies Meta<typeof HomeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUpcomingVisit: Story = {};
export const VirtualNextVisit: Story = { args: { nextVisit: appointments[1] } };
export const NothingBooked: Story = { args: { nextVisit: null, unreadMessages: 0 } };
