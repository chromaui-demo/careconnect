import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Button, Card, CardContent, Input, Select } from '@careconnect/design-system';

const REASONS = [
  { value: 'Fever', label: 'Fever' },
  { value: 'Cough and/or congestion', label: 'Cough and/or congestion' },
  { value: 'Throat pain', label: 'Throat pain' },
  { value: 'Back pain', label: 'Back pain' },
  { value: 'Other', label: 'Other' },
];

export function WalkInPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('Fever');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const appt = await api.walkIn({
        firstName, lastName, phone,
        reasonForVisit: reason,
        serviceMode: 'in-person',
        scheduledTime: new Date().toISOString(),
      });
      navigate(`/visits/${appt.id}/paperwork`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 style={{ fontSize: 'var(--cc-text-2xl)' }}>Walk-In Registration</h1>
      <p style={{ color: 'var(--cc-text-secondary)' }}>Register for an urgent care walk-in visit at Main Clinic.</p>
      <Card padding="lg">
        <CardContent>
          <div className="portal-form">
            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <Select label="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} fullWidth />
          </div>
        </CardContent>
      </Card>
      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
        <Button variant="accent" loading={loading} onClick={submit} disabled={!firstName || !lastName}>Check In Now</Button>
      </div>
    </>
  );
}
