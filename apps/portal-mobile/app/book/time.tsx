import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { api, type TimeSlot } from '@careconnect/api-client';
import { useBooking } from '../../src/booking/BookingContext';
import { SelectTimeScreen } from '../../src/screens/booking/SelectTimeScreen';

export default function SelectTimeRoute() {
  const router = useRouter();
  const { draft, update } = useBooking();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSlots()
      .then(setSlots)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load open times'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SelectTimeScreen
      slots={slots}
      loading={loading}
      error={error}
      selected={draft.slot}
      onSelect={(slot) => update({ slot })}
      onContinue={() => router.push('/book/info')}
      onBack={() => router.back()}
    />
  );
}
