import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { LoginScreen } from './LoginScreen';

const meta = {
  title: 'Login',
  component: LoginScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    email: '',
    password: '',
    onEmailChange: () => {},
    onPasswordChange: () => {},
    onSubmit: () => {},
    appVersion: '0.1.0',
    designSystemVersion: '0.1.0',
  },
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
// Snapshots are shared beyond the team, so stories never carry the real
// seeded demo password; the field is masked anyway.
export const Filled: Story = { args: { email: 'alice.smith@se-tools.net', password: 'not-the-password' } };
export const SigningIn: Story = { args: { ...Filled.args, loading: true } };
export const WrongRole: Story = {
  args: { email: 'admin@se-tools.net', password: 'not-the-password', error: 'Please sign in with a patient account' },
};
export const WithDemoHint: Story = { args: { demoHint: 'alice.smith@se-tools.net / (seeded password)' } };

export const Interactive: Story = {
  render: (args) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return <LoginScreen {...args} email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} />;
  },
};
