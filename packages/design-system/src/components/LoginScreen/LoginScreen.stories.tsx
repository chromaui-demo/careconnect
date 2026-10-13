import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { LoginScreen } from './LoginScreen';
import { DESIGN_SYSTEM_VERSION } from '../..';
import { figmaDesign } from '../../figma/links';
// The Portal and EHR stories show the same app versions the deployed apps do.
import { version as portalVersion } from '../../../../../apps/portal/package.json';
import { version as ehrVersion } from '../../../../../apps/ehr/package.json';
import { allModes } from '../../../.storybook/modes';

const meta: Meta<typeof LoginScreen> = {
  title: 'Components/LoginScreen',
  component: LoginScreen,
  tags: ['autodocs'],
  parameters: {
    design: figmaDesign('Components/LoginScreen'),
    layout: 'fullscreen',
    chromatic: { modes: { mobile: allModes.mobile, desktop: allModes.desktop } },
  },
};

export default meta;
type Story = StoryObj<typeof LoginScreen>;

// email, password, error and loading seed the demo's state rather than being
// passed through, so the fields stay editable in every story.
function LoginScreenDemo({
  email: initialEmail = 'demo.user@example.com',
  password: initialPassword = 'SampleDemoPass1!',
  error: initialError = '',
  loading: initialLoading = false,
  ...props
}: Partial<ComponentProps<typeof LoginScreen>>) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(initialLoading);

  return (
    <LoginScreen
      productName="CareConnect"
      productLabel="PATIENT PORTAL"
      headline="Your health."
      headlineHighlight="Your way."
      description="View test results, request appointments, message your care team, and manage your health all in one place."
      stats={[
        { value: '1,240+', label: 'Patients' },
        { value: '48', label: 'Providers' },
        { value: '10', label: 'Departments' },
      ]}
      complianceNote="HIPAA Compliant · SOC 2 Type II · HL7 FHIR R4"
      formTitle="CareConnect"
      formSubtitle="Patient Portal"
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      error={error}
      loading={loading}
      demoHint="demo.user@example.com / SampleDemoPass1!"
      footerNote="Demo environment — For demonstration purposes"
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        window.setTimeout(() => {
          setLoading(false);
          if (!email || !password) setError('Invalid username or password');
        }, 600);
      }}
      {...props}
    />
  );
}

export const Portal: Story = {
  render: () => (
    <LoginScreenDemo
      productLabel="PATIENT PORTAL"
      email="demo.user@example.com"
      formSubtitle="Patient Portal"
      demoHint="demo.user@example.com / SampleDemoPass1!"
      appVersion={portalVersion}
      designSystemVersion={DESIGN_SYSTEM_VERSION}
    />
  ),
};

export const EHR: Story = {
  render: () => (
    <LoginScreenDemo
      productLabel="CLINICAL EHR"
      headline="Better care."
      headlineHighlight="Every shift."
      description="Document encounters, manage orders, review labs, and coordinate care across your department."
      stats={[
        { value: '320+', label: 'Active visits' },
        { value: '48', label: 'Providers' },
        { value: '6', label: 'Locations' },
      ]}
      formSubtitle="Staff Sign In"
      email="demo.user@example.com"
      demoHint="demo.user@example.com / SampleDemoPass1!"
      appVersion={ehrVersion}
      designSystemVersion={DESIGN_SYSTEM_VERSION}
    />
  ),
};

export const Billing: Story = {
  render: () => (
    <LoginScreenDemo
      productLabel="REVENUE CYCLE"
      headline="Claims clarity."
      headlineHighlight="Faster cash."
      description="Work queues, ERA matching, claim edits, and AR — unified for your billing team."
      stats={[
        { value: '2.4k', label: 'Open claims' },
        { value: '98%', label: 'Clean rate' },
        { value: '12', label: 'Payers' },
      ]}
      formTitle="CareConnect"
      formSubtitle="Billing Sign In"
      email="demo.user@example.com"
      demoHint="demo.user@example.com / SampleDemoPass1!"
    />
  ),
};

export const WithError: Story = {
  render: () => <LoginScreenDemo error="Invalid username or password" />,
};

export const Loading: Story = {
  render: () => <LoginScreenDemo loading />,
};

// Interaction tests: run by `npm run test:stories` locally and by Chromatic on every build.
export const EmptySubmitShowsError: Story = {
  render: () => <LoginScreenDemo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.clear(canvas.getByLabelText('Email address'));
    await userEvent.clear(canvas.getByLabelText('Password'));
    await userEvent.click(canvas.getByRole('button', { name: /Sign In/ }));
    await expect(await canvas.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
      'Invalid username or password',
    );
  },
};

export const RevealsTypedPassword: Story = {
  render: () => <LoginScreenDemo />,
  play: async ({ canvas, userEvent }) => {
    const password = canvas.getByLabelText('Password');
    await userEvent.clear(password);
    await userEvent.type(password, 'NewDemoPass2!');
    await userEvent.click(canvas.getByRole('button', { name: 'Show password' }));
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue('NewDemoPass2!');
  },
};

export const PortalEmailIsEditable: Story = {
  ...Portal,
  play: async ({ canvas, userEvent }) => {
    const email = canvas.getByLabelText('Email address');
    await userEvent.clear(email);
    await userEvent.type(email, 'billing@example.com');
    await expect(email).toHaveValue('billing@example.com');
  },
};
