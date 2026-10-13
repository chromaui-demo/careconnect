import type { Meta, StoryObj } from '@storybook/react-native';
import { TextField } from './TextField';

const meta = {
  title: 'Components/TextField',
  component: TextField,
  args: { label: 'Email', placeholder: 'patient@careconnect.demo' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { value: 'alice.smith@se-tools.net' } };
export const Password: Story = { args: { label: 'Password', secureTextEntry: true, value: 'not-the-password' } };
export const WithHint: Story = { args: { label: 'Phone', hint: 'We text you a reminder the day before.' } };
export const WithError: Story = { args: { value: 'alice@', error: 'Enter a valid email address' } };
export const ReadOnly: Story = { args: { label: 'Reason for visit', value: 'Annual physical', editable: false } };
export const Multiline: Story = { args: { label: 'Reply', multiline: true, placeholder: 'Write a message to your care team' } };
