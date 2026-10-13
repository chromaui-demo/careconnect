import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Button, PageContainer } from '@careconnect/design-system';
import { PatientPickerDialog } from '../components/Dialogs';

export function FaxMatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const match = async (patientId: string) => {
    if (!id) return;
    await api.matchFax(id, patientId);
    navigate('/fax');
  };

  useEffect(() => { setOpen(true); }, [id]);

  return (
    <PageContainer title="Match Inbound Fax">
      <p>Select the patient to attach this fax to.</p>
      <Button variant="secondary" onClick={() => navigate('/fax')}>Cancel</Button>
      <PatientPickerDialog open={open} onClose={() => navigate('/fax')} onSelect={(p) => match(p.id)} title="Match fax to patient" />
    </PageContainer>
  );
}
