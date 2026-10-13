import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Button, Text, TextField, colors, radius, space } from '@careconnect/design-system-native';

export interface LoginScreenProps {
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  error?: string;
  loading?: boolean;
  /** Shown under the form in development builds. */
  demoHint?: string;
  appVersion: string;
  designSystemVersion: string;
}

export function LoginScreen({
  email, password, onEmailChange, onPasswordChange, onSubmit, error, loading, demoHint, appVersion, designSystemVersion,
}: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logo}><Text variant="title" tone="inverse">C</Text></View>
            <Text variant="label" tone="primary">Patient portal</Text>
            <Text variant="display">
              Your health.{'\n'}<Text variant="display" tone="primary">Your way.</Text>
            </Text>
            <Text tone="secondary">
              View test results, request appointments, message your care team, and manage your health all in one place.
            </Text>
          </View>

          <View style={styles.form}>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <TextField
              label="Email"
              value={email}
              onChangeText={onEmailChange}
              placeholder="patient@careconnect.demo"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={onPasswordChange}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            <Button size="lg" fullWidth loading={loading} disabled={!email || !password} onPress={onSubmit}>
              Sign in
            </Button>
            {demoHint ? <Text variant="caption" tone="muted" align="center">Demo: {demoHint}</Text> : null}
          </View>

          <View style={styles.footer}>
            <Text variant="caption" tone="muted" align="center">HIPAA Compliant · SOC 2 Type II · HL7 FHIR R4</Text>
            <Text variant="caption" tone="muted" align="center">
              Portal app v{appVersion} · Design system native v{designSystemVersion}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: space[6], gap: space[8], justifyContent: 'center' },
  hero: { gap: space[3] },
  logo: {
    width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: space[2],
  },
  form: { gap: space[4] },
  footer: { gap: space[1] },
});
