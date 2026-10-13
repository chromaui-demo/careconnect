import { useRouter } from 'expo-router';
import { useState } from 'react';
import { api } from '@careconnect/api-client';
import { useBooking } from '../../src/booking/BookingContext';
import { ReviewScreen } from '../../src/screens/booking/ReviewScreen';

export default function ReviewRoute() {
  const router = useRouter();
  const { draft } = useBooking();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const appt = await api.bookAppointment({
        firstName: draft.firstName,
        lastName: draft.lastName,
        dateOfBirth: draft.dateOfBirth,
        phone: draft.phone,
        email: draft.email,
        reasonForVisit: draft.reason,
        serviceMode: draft.mode,
        visitType: draft.visitType,
        scheduledTime: draft.slot?.startTime ?? new Date().toISOString(),
        locationId: draft.slot?.locationId,
        providerId: draft.slot?.providerId,
      });
      router.replace({ pathname: '/book/confirmed', params: { appointmentId: appt.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  return <ReviewScreen draft={draft} submitting={submitting} error={error} onConfirm={confirm} onBack={() => router.back()} />;
}
