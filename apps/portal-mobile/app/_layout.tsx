import '../src/lib/config';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingState, colors } from '@careconnect/design-system-native';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';

// Storybook builds (local `npm run storybook`, and the builds Chromatic installs
// on its simulators and emulators) render the story UI in place of the app.
// metro.config.js strips Storybook from every other bundle.
const StorybookUI: ComponentType | null =
  process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true' ? require('../.rnstorybook').default : null;

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  if (loading) return <LoadingState label="Checking session…" />;
  const onLogin = segments[0] === 'login';
  if (!user && !onLogin) return <Redirect href="/login" />;
  if (user && onLogin) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.bgElevated },
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="visits/[id]" options={{ title: 'Visit' }} />
      <Stack.Screen name="messages/[threadId]" options={{ title: 'Conversation' }} />
      <Stack.Screen name="book" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  if (StorybookUI) return <StorybookUI />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
