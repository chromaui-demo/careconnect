import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, PatientAvatar } from './Avatar';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  parameters: { design: figmaDesign('Components/Avatar') },
  component: Avatar,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = { args: { name: 'Alice Smith' } };
export const Large: Story = { args: { name: 'Bob Johnson', size: 'lg' } };
export const Patient: Story = {
  render: () => <PatientAvatar patient={{ firstName: 'Diana', lastName: 'Williams' }} size="lg" />,
};
