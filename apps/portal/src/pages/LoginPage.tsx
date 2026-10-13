import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoginScreen, PageLoading, DESIGN_SYSTEM_VERSION } from '@careconnect/design-system';
import { useAuth } from '../context/AuthContext';
import { version as portalVersion } from '../../package.json';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(import.meta.env.DEV ? 'alice.smith@se-tools.net' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'CareConnect1!' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      emailPlaceholder="patient@careconnect.demo"
      demoHint={import.meta.env.DEV ? 'alice.smith@se-tools.net / CareConnect1!' : undefined}
      footerNote="Demo environment — se-tools.net"
      appVersion={portalVersion}
      designSystemVersion={DESIGN_SYSTEM_VERSION}
    />
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
