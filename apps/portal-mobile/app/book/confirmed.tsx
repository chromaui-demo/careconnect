import { useLocalSearchParams, useRouter } from 'expo-router';
import { useBooking } from '../../src/booking/BookingContext';
import { ConfirmationScreen } from '../../src/screens/booking/ConfirmationScreen';

export default function ConfirmedRoute() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const { draft } = useBooking();

  return (
    <ConfirmationScreen
      scheduledTime={draft.slot?.startTime}
      provider={draft.slot?.provider}
      onViewVisit={() => {
        router.dismissAll();
        router.push(appointmentId ? `/visits/${appointmentId}` : '/visits');
      }}
      onDone={() => router.dismissAll()}
    />
  );
}
