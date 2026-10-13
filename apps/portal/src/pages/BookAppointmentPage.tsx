import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, Select } from '@careconnect/design-system';

const REASONS = [
  { value: '', label: 'Select a reason...' },
  { value: 'Cough and/or congestion', label: 'Cough and/or congestion' },
  { value: 'Fever', label: 'Fever' },
  { value: 'Throat pain', label: 'Throat pain' },
  { value: 'Ear pain', label: 'Ear pain' },
  { value: 'Abdominal pain', label: 'Abdominal pain' },
  { value: 'Back pain', label: 'Back pain' },
  { value: 'Skin rash', label: 'Skin rash' },
  { value: 'Annual physical', label: 'Annual physical' },
  { value: 'Other', label: 'Other' },
];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="portal-step-indicator">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`portal-step ${s <= step ? (s < step ? 'portal-step--completed' : 'portal-step--active') : ''}`}
        />
      ))}
    </div>
  );
}

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVirtual = searchParams.get('mode') === 'virtual';
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('Main Clinic');

  return (
    <>
      <StepIndicator step={1} />
      <h1 style={{ fontSize: 'var(--cc-text-2xl)', marginBottom: 'var(--cc-space-2)' }}>
        {isVirtual ? 'Book a Virtual Visit' : 'Book an In-Person Visit'}
      </h1>
      <p style={{ color: 'var(--cc-text-secondary)', marginBottom: 'var(--cc-space-6)' }}>
        Tell us about your visit so we can match you with the right provider.
      </p>

      <Card padding="lg">
        <CardContent>
          <div className="portal-form">
            <Select
              label="Reason for Visit"
              options={REASONS}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
            />

            {!isVirtual && (
              <Select
                label="Preferred Location"
                options={[
                  { value: 'Main Clinic', label: 'Main Clinic' },
                  { value: 'Urgent Care West', label: 'Urgent Care West' },
                ]}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth
              />
            )}

            <Select
              label="Visit Type"
              options={[
                { value: 'new', label: 'New Patient' },
                { value: 'followup', label: 'Follow-up' },
              ]}
              fullWidth
            />
          </div>
        </CardContent>
      </Card>

      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate('/')}>Back</Button>
        <Button
          variant="primary"
          disabled={!reason}
          onClick={() => navigate(`/book/time?mode=${isVirtual ? 'virtual' : 'in-person'}&reason=${encodeURIComponent(reason)}&location=${encodeURIComponent(location)}`)}
        >
          Continue
        </Button>
      </div>
    </>
  );
}
