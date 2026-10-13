import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/auth/AuthContext';
import { useBooking } from '../../src/booking/BookingContext';
import { BookVisitScreen } from '../../src/screens/booking/BookVisitScreen';

export default function BookVisitRoute() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { user } = useAuth();
  const { draft, update, reset } = useBooking();

  useEffect(() => {
    reset({
      mode: mode === 'virtual' ? 'virtual' : 'in-person',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
    });
    // Seed once per booking; later edits belong to the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BookVisitScreen draft={draft} onChange={update} onContinue={() => router.push('/book/time')} onCancel={() => router.dismissAll()} />
  );
}
