import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoginScreen, PageLoading, DESIGN_SYSTEM_VERSION } from '@careconnect/design-system';
import { useAuth } from '../context/AuthContext';
import { version as ehrVersion } from '../../package.json';

// Seeded demo account, prefilled in every build so the team only needs the password.
// The password stays dev-only: deployed environments set their own SEEDED_PASSWORD.
const DEMO_EMAIL = 'admin@se-tools.net';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(import.meta.env.DEV ? 'CareConnect1!' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/visits" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/visits');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginScreen
      productName="CareConnect"
      productLabel="CLINICAL EHR"
      headline="Better care."
      headlineHighlight="Every shift."
      description="Document encounters, manage orders, review labs, and coordinate care across your department."
      stats={[
        { value: '320+', label: 'Active visits' },
        { value: '48', label: 'Providers' },
        { value: '6', label: 'Locations' },
      ]}
      complianceNote="HIPAA Compliant · SOC 2 Type II · HL7 FHIR R4"
      formTitle="CareConnect"
      formSubtitle="Staff Sign In"
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      error={error}
      loading={loading}
      emailPlaceholder={DEMO_EMAIL}
      demoHint={import.meta.env.DEV ? `${DEMO_EMAIL} / CareConnect1!` : DEMO_EMAIL}
      footerNote="Demo environment — se-tools.net"
      appVersion={ehrVersion}
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
