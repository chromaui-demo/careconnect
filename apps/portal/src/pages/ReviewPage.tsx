import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Button, Card, CardContent, Badge } from '@careconnect/design-system';
import { useState } from 'react';

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="portal-step-indicator">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`portal-step ${s <= step ? (s < step ? 'portal-step--completed' : 'portal-step--active') : ''}`} />
      ))}
    </div>
  );
}

export function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const isVirtual = searchParams.get('mode') === 'virtual';

  const confirm = async () => {
    setLoading(true);
    try {
      const appt = await api.bookAppointment({
        firstName: searchParams.get('firstName') ?? 'Guest',
        lastName: searchParams.get('lastName') ?? 'Patient',
        dateOfBirth: searchParams.get('dob') ?? '1990-01-01',
        phone: searchParams.get('phone') ?? '',
        email: searchParams.get('email') ?? '',
        reasonForVisit: searchParams.get('reason') ?? 'General visit',
        serviceMode: isVirtual ? 'virtual' : 'in-person',
        scheduledTime: searchParams.get('slotTime') ?? new Date().toISOString(),
        locationId: searchParams.get('locationId') ?? undefined,
        providerId: searchParams.get('providerId') ?? undefined,
      });
      navigate(`/book/confirmed?appointmentId=${appt.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepIndicator step={4} />
      <h1 style={{ fontSize: 'var(--cc-text-2xl)' }}>Review Your Appointment</h1>
      <Card padding="lg">
        <CardContent>
          <p><Badge variant={isVirtual ? 'info' : 'default'}>{isVirtual ? 'Virtual' : 'In Person'}</Badge></p>
          <p><strong>Reason:</strong> {searchParams.get('reason')}</p>
          <p><strong>Time:</strong> {searchParams.get('slotTime') ? new Date(searchParams.get('slotTime')!).toLocaleString() : 'TBD'}</p>
        </CardContent>
      </Card>
      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate(`/book/info?${searchParams}`)}>Back</Button>
        <Button variant="accent" loading={loading} onClick={confirm}>Confirm Appointment</Button>
      </div>
    </>
  );
}
