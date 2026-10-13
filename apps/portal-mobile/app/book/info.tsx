import { useRouter } from 'expo-router';
import { useBooking } from '../../src/booking/BookingContext';
import { PatientInfoScreen } from '../../src/screens/booking/PatientInfoScreen';

export default function PatientInfoRoute() {
  const router = useRouter();
  const { draft, update } = useBooking();
  return (
    <PatientInfoScreen draft={draft} onChange={update} onContinue={() => router.push('/book/review')} onBack={() => router.back()} />
  );
}
