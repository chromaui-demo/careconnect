import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Button, Input, PageContainer, Select } from '@careconnect/design-system';

export function AddVisitPage() {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('in-person');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');

  const submit = async () => {
    const appt = await api.walkIn({
      firstName, lastName, dateOfBirth: dob, reasonForVisit: reason || 'Walk-in visit',
      serviceMode: mode, scheduledTime: new Date().toISOString(),
    });
    navigate(`/visit/${appt.id}`);
  };

  return (
    <PageContainer title="Add Patient / Visit">
      <div className="portal-form" style={{ maxWidth: 480 }}>
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
        <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} fullWidth />
        <Input label="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth />
        <Select label="Service mode" value={mode} onChange={(e) => setMode(e.target.value)} options={[
          { value: 'in-person', label: 'In person' }, { value: 'virtual', label: 'Virtual' },
        ]} />
        <Button variant="primary" onClick={submit}>Create walk-in visit</Button>
        <Button variant="ghost" onClick={() => navigate('/visits')}>Cancel</Button>
      </div>
    </PageContainer>
  );
}
