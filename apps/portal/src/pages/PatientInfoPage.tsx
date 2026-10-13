import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, DatePicker, Input, PasswordInput, Progress } from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function PatientInfoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const continueNext = () => {
    const p = new URLSearchParams(searchParams);
    p.set('firstName', firstName);
    p.set('lastName', lastName);
    p.set('dob', dob);
    p.set('phone', phone);
    p.set('email', email);
    navigate(`/book/review?${p}`);
  };

  return (
    <PortalPage title="Your Information" subtitle="Step 3 of 4 — patient demographics">
      <Progress value={75} label="Booking progress" showValue />
      <Card padding="lg">
        <CardContent>
          <div className="portal-form cc-stack">
            <div className="cc-grid-auto cc-grid-auto--2">
              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
            </div>
            <DatePicker label="Date of Birth" value={dob} onChange={(e) => setDob(e.target.value)} fullWidth />
            <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <PasswordInput label="Portal PIN (optional demo)" value="" onChange={() => {}} placeholder="Set a 4-digit PIN" />
            <Input label="Reason for Visit" defaultValue={searchParams.get('reason') ?? ''} fullWidth readOnly />
          </div>
        </CardContent>
      </Card>
      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate(`/book/time?${searchParams}`)}>Back</Button>
        <Button variant="primary" onClick={continueNext}>Continue</Button>
      </div>
    </PortalPage>
  );
}
