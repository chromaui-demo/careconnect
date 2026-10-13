import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@careconnect/design-system';

export function ConfirmationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const appointmentId = params.get('appointmentId');

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="confirmation-icon">✓</div>
      <h1 style={{ fontSize: 'var(--cc-text-2xl)', marginBottom: 'var(--cc-space-2)' }}>
        Appointment Confirmed
      </h1>
      <p style={{ color: 'var(--cc-text-secondary)', marginBottom: 'var(--cc-space-6)', maxWidth: 400, marginInline: 'auto' }}>
        Your appointment has been booked. Please complete your intake paperwork before your visit.
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {appointmentId && (
          <Button variant="accent" onClick={() => navigate(`/visits/${appointmentId}/paperwork`)}>
            Complete Paperwork Now
          </Button>
        )}
        <Button variant="primary" onClick={() => navigate(appointmentId ? `/visits/${appointmentId}` : '/visits')}>
          View Visit Details
        </Button>
        <Button variant="secondary" onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    </div>
  );
}
