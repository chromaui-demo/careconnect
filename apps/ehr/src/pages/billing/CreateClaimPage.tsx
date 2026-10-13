import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type ChargeItem, type BillingPatient } from '@careconnect/api-client';
import { Alert, Button, Checkbox, Input, PageContainer, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@careconnect/design-system';

export function CreateClaimPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [patients, setPatients] = useState<BillingPatient[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [patientId, setPatientId] = useState('');
  const [payer, setPayer] = useState('Blue Cross Blue Shield');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    api.billing.getPatients().then(setPatients);
    api.billing.getChargeMasters().then(setCharges);
  }, []);

  const submit = async () => {
    setError('');
    if (!patientId || selected.size === 0) {
      setError('Select a patient and at least one charge line.');
      return;
    }
    const appts = await api.getAppointments();
    const appt = appts.find((a) => a.patientId === patientId);
    if (!appt) {
      setError('No encounter found for this patient.');
      return;
    }
    const enc = await api.getEncounterByAppointment(appt.id);
    const lineItems = charges.filter((c) => selected.has(c.id)).map((c) => ({
      cptCode: c.cptCode, description: c.description, amount: c.defaultAmount, units: 1,
    }));
    const { id } = await api.createClaim({ encounterId: enc.id, patientId, payerName: payer, lineItems });
    push('Claim created.', 'success');
    navigate(`/billing/claims/${id}`);
  };

  return (
    <PageContainer title="Create Claim" actions={<Button variant="secondary" onClick={() => navigate('/billing/claims')}>Cancel</Button>}>
      {error && <Alert variant="error">{error}</Alert>}
      <Select label="Patient" value={patientId} onChange={(e) => setPatientId(e.target.value)} options={[
        { value: '', label: 'Select patient' }, ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
      ]} />
      <Input label="Payer" value={payer} onChange={(e) => setPayer(e.target.value)} fullWidth />
      <Table>
        <TableHead><TableRow><TableHeader></TableHeader><TableHeader>CPT</TableHeader><TableHeader>Description</TableHeader><TableHeader>Amount</TableHeader></TableRow></TableHead>
        <TableBody>
          {charges.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Checkbox
                  label={`Select ${c.cptCode}`}
                  checked={selected.has(c.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(c.id); else next.delete(c.id);
                    setSelected(next);
                  }}
                />
              </TableCell>
              <TableCell>{c.cptCode}</TableCell><TableCell>{c.description}</TableCell><TableCell>${c.defaultAmount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button variant="primary" onClick={submit} disabled={!patientId || selected.size === 0}>Create Claim</Button>
    </PageContainer>
  );
}
