import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { RadioGroup } from './RadioGroup';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof RadioGroup> = { title: 'Components/RadioGroup', parameters: { design: figmaDesign('Components/RadioGroup') }, component: RadioGroup, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const VisitType: Story = {
  args: {
    name: 'visit-type',
    label: 'Visit type',
    defaultValue: 'in-person',
    options: [
      { value: 'in-person', label: 'In-person', description: 'Clinic exam room' },
      { value: 'telemed', label: 'Telemedicine', description: 'Video visit' },
      { value: 'phone', label: 'Phone', description: 'Audio only' },
    ],
  },
};

// Interaction test: picking an option deselects the default.
export const SelectsOption: Story = {
  args: { ...VisitType.args, onChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const inPerson = canvas.getByRole('radio', { name: /In-person/ });
    const telemed = canvas.getByRole('radio', { name: /Telemedicine/ });
    await expect(inPerson).toBeChecked();
    await userEvent.click(canvas.getByText('Telemedicine'));
    await expect(telemed).toBeChecked();
    await expect(inPerson).not.toBeChecked();
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
};
