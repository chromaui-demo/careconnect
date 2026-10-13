import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Checkbox } from './Checkbox';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  parameters: { design: figmaDesign('Components/Checkbox') },
  component: Checkbox,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: { label: 'Send appointment reminder SMS', defaultChecked: true },
};

export const WithDescription: Story = {
  args: {
    label: 'Include in quality measure cohort',
    description: 'Patient meets HEDIS diabetes screening criteria',
  },
};

export const Focus: Story = {
  args: { label: 'Send appointment reminder SMS' },
  parameters: { pseudo: { focusVisible: '.cc-checkbox__input' } },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
      <Checkbox label="Consent on file" defaultChecked />
      <Checkbox label="Interpreter required" />
      <Checkbox label="High-risk fall protocol" description="Trigger nursing assessment on check-in" />
    </div>
  ),
};

// Interaction test: the whole label row is the hit target, not just the box.
export const TogglesFromLabel: Story = {
  args: { label: 'Interpreter required', onChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox', { name: 'Interpreter required' });
    await expect(checkbox).not.toBeChecked();
    await userEvent.click(canvas.getByText('Interpreter required'));
    await expect(checkbox).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
};
