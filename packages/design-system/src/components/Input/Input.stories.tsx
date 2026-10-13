import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Input, Select } from './Input';
import { PasswordInput } from './PasswordInput';
import { figmaDesign } from '../../figma/links';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  parameters: { design: figmaDesign('Components/Input') },
  component: Input,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { label: 'Patient Name', placeholder: 'Search patients...' },
};

export const WithError: Story = {
  args: { label: 'Phone Number', error: 'Invalid phone number format', defaultValue: '123' },
};

export const SelectField: Story = {
  render: () => (
    <Select
      label="Location"
      options={[
        { value: 'main', label: 'Main Clinic' },
        { value: 'west', label: 'Urgent Care West' },
      ]}
      fullWidth
    />
  ),
};

export const Focus: Story = {
  args: { label: 'Patient Name', placeholder: 'Search patients...' },
  parameters: { pseudo: { focusWithin: '.cc-input__container' } },
};

export const Disabled: Story = {
  args: { label: 'Patient Name', placeholder: 'Search patients...', disabled: true },
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
export const TypesIntoField: Story = {
  args: { label: 'Patient Name', placeholder: 'Search patients...', onChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByLabelText('Patient Name');
    await userEvent.type(input, 'Alice Smith');
    await expect(input).toHaveValue('Alice Smith');
    await expect(args.onChange).toHaveBeenCalledTimes('Alice Smith'.length);
  },
};

export const SelectChangesValue: Story = {
  render: () => (
    <Select
      label="Location"
      options={[
        { value: 'main', label: 'Main Clinic' },
        { value: 'west', label: 'Urgent Care West' },
      ]}
      fullWidth
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const select = canvas.getByLabelText('Location');
    await expect(select).toHaveValue('main');
    await userEvent.selectOptions(select, 'Urgent Care West');
    await expect(select).toHaveValue('west');
  },
};

export const PasswordRevealToggle: Story = {
  render: () => <PasswordInput label="Password" defaultValue="SampleDemoPass1!" />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText('Password');
    await expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(canvas.getByRole('button', { name: 'Show password' }));
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(canvas.getByRole('button', { name: 'Hide password' }));
    await expect(input).toHaveAttribute('type', 'password');
  },
};
