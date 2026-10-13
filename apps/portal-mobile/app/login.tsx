import { useState } from 'react';
import { DESIGN_SYSTEM_NATIVE_VERSION } from '@careconnect/design-system-native';
import { version as appVersion } from '../package.json';
import { useAuth } from '../src/auth/AuthContext';
import { LoginScreen } from '../src/screens/LoginScreen';

export default function LoginRoute() {
  const { login } = useAuth();
  const [email, setEmail] = useState(__DEV__ ? 'alice.smith@se-tools.net' : '');
  const [password, setPassword] = useState(__DEV__ ? 'CareConnect1!' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginScreen
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={submit}
      error={error}
      loading={loading}
      demoHint={__DEV__ ? 'alice.smith@se-tools.net / CareConnect1!' : undefined}
      appVersion={appVersion}
      designSystemVersion={DESIGN_SYSTEM_NATIVE_VERSION}
    />
  );
}
