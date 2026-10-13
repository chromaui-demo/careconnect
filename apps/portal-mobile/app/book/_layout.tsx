import { Stack } from 'expo-router';
import { colors } from '@careconnect/design-system-native';
import { BookingProvider } from '../../src/booking/BookingContext';

// The draft lives as long as the booking modal: dismissing it discards the
// choices, and a new booking starts clean.
export default function BookingLayout() {
  return (
    <BookingProvider>
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Book a visit' }} />
        <Stack.Screen name="time" options={{ title: 'Choose a time' }} />
        <Stack.Screen name="info" options={{ title: 'Your information' }} />
        <Stack.Screen name="review" options={{ title: 'Review' }} />
        <Stack.Screen name="confirmed" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </BookingProvider>
  );
}
