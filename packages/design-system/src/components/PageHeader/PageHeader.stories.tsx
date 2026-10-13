import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHeader } from './PageHeader';
import { Button } from '../Button';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof PageHeader> = { title: 'Layout/PageHeader', parameters: { design: figmaDesign('Layout/PageHeader') }, component: PageHeader, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof PageHeader>;

export const QueuePage: Story = {
  args: {
    title: 'Patient queue',
    subtitle: 'Main clinic · Friday, Aug 21',
    breadcrumbs: [{ label: 'EHR', href: '#' }, { label: 'Queue' }],
    actions: (
      <>
        <Button variant="secondary">Export</Button>
        <Button>Check in walk-in</Button>
      </>
    ),
  },
};
