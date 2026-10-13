import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from '../Badge';
import { figmaDesign } from '../../figma/links';
import { allModes } from '../../../.storybook/modes';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  parameters: {
    design: figmaDesign('Components/Card'),
    chromatic: { modes: { light: allModes.light, dark: allModes.dark } },
  },
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card style={{ maxWidth: 400 }}>
      <CardHeader>
        <CardTitle>Vital Signs</CardTitle>
        <Badge variant="in-office" dot>In Office</Badge>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0 }}>Temperature: 98.6°F · BP: 120/80 · HR: 72 bpm</p>
      </CardContent>
    </Card>
  ),
};

export const Elevated: Story = {
  args: { elevated: true, padding: 'lg', children: 'Elevated card with shadow' },
};
