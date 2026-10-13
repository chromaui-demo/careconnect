import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Text } from '../Text/Text';
import { Screen } from './Screen';

const meta = {
  title: 'Layout/Screen',
  component: Screen,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'My Visits',
    subtitle: 'Upcoming and past appointments',
    children: (
      <Card>
        <Text>Screen content scrolls under a fixed header.</Text>
      </Card>
    ),
  },
} satisfies Meta<typeof Screen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithHeaderAction: Story = { args: { headerAction: <Button size="sm">Book</Button> } };
export const WithFooter: Story = {
  args: {
    title: 'Review your appointment',
    subtitle: undefined,
    footer: (
      <>
        <Button variant="ghost">Back</Button>
        <Button variant="accent" style={{ flex: 1 }}>Confirm appointment</Button>
      </>
    ),
  },
};
