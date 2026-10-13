import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Spinner> = { title: 'Components/Spinner', parameters: { design: figmaDesign('Components/Spinner') }, component: Spinner, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Spinner>;

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Spinner size="sm" /><Spinner size="md" /><Spinner size="lg" />
    </div>
  ),
};
