import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type PortalMedication } from '@careconnect/api-client';
import {
  Alert,
  Breadcrumb,
  Button,
  Input,
  PageLoading,
  Select,
  Textarea,
  useToast,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function RefillRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { push: toast } = useToast();
  const [meds, setMeds] = useState<PortalMedication[]>([]);
  const [medication, setMedication] = useState(searchParams.get('medication') ?? '');
  const [dosage, setDosage] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.portal.getMedications()
      .then((list) => {
        setMeds(list);
        const prefill = searchParams.get('medication');
        const match = list.find((m) => m.medication === prefill) ?? list[0];
        if (match && !prefill) {
          setMedication(match.medication);
          setDosage(match.dosage);
          setPharmacy(match.pharmacy ?? '');
        } else if (match && prefill) {
          setDosage(match.dosage);
          setPharmacy(match.pharmacy ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const onMedChange = (value: string) => {
    setMedication(value);
    const match = meds.find((m) => m.medication === value);
    if (match) {
      setDosage(match.dosage);
      setPharmacy(match.pharmacy ?? '');
    }
  };

  const submit = async () => {
    if (!medication.trim()) return;
    setSubmitting(true);
    try {
      await api.portal.requestRefill({ medication, dosage, pharmacy, notes });
      toast('Refill request submitted', 'success');
      navigate('/medications');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Request failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading label="Loading…" />;

  return (
    <PortalPage title="Request Refill" subtitle="Submit a refill request to your care team">
      <Breadcrumb items={[
        { label: 'Medications', href: '/medications' },
        { label: 'Request refill' },
      ]} />
      <Alert variant="info">
        Refill requests are reviewed by your provider. Allow 1–2 business days for approval.
      </Alert>
      <div className="portal-form">
        <Select
          label="Medication"
          value={medication}
          onChange={(e) => onMedChange(e.target.value)}
          options={[
            { value: '', label: 'Select medication…' },
            ...meds.map((m) => ({ value: m.medication, label: m.medication })),
          ]}
          fullWidth
        />
        <Input label="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} fullWidth />
        <Input label="Pharmacy" value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} fullWidth />
        <Textarea label="Notes (optional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
        <div className="portal-actions">
          <Button variant="ghost" onClick={() => navigate('/medications')}>Cancel</Button>
          <Button variant="primary" disabled={submitting || !medication} onClick={submit}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </div>
    </PortalPage>
  );
}
