import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type BillingPatientDetail } from '@careconnect/api-client';
import { Button, Input, PageContainer, PageLoading, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@careconnect/design-system';
import { useHasRole } from '../../components/RequireRole';
import { BILLING_WRITE_ROLES } from './permissions';

export function BillingPatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [patient, setPatient] = useState<BillingPatientDetail | null>(null);
  const [payer, setPayer] = useState('');
  const [memberId, setMemberId] = useState('');
  const [payment, setPayment] = useState('');

  const load = () => { if (id) api.billing.getPatient(id).then(setPatient); };
  useEffect(() => { load(); }, [id]);

  if (!patient) return <PageContainer title="Patient"><PageLoading /></PageContainer>;

  return (
    <PageContainer title={`${patient.firstName} ${patient.lastName}`} actions={<Button variant="secondary" onClick={() => navigate('/billing/patients')}>Back</Button>}>
      <p>Balance: ${Number(patient.balance).toFixed(2)}</p>
      <h3>Coverages</h3>
      <Table>
        <TableBody>{patient.coverages.map((c) => (
          <TableRow key={c.id}><TableCell>{c.payerName}</TableCell><TableCell>{c.memberId}</TableCell></TableRow>
        ))}</TableBody>
      </Table>
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          <Input placeholder="Payer" value={payer} onChange={(e) => setPayer(e.target.value)} />
          <Input placeholder="Member ID" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
          <Button onClick={async () => { await api.billing.addCoverage(patient.id, { payerName: payer, memberId }); load(); }}>Add Coverage</Button>
        </div>
      )}
      {canWrite && (
        <>
          <h3>Record Payment</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input placeholder="Amount" value={payment} onChange={(e) => setPayment(e.target.value)} />
            <Button onClick={async () => { await api.billing.recordPayment(patient.id, { amount: Number(payment) }); load(); }}>Apply</Button>
          </div>
        </>
      )}
      <h3>Claims</h3>
      <Table>
        <TableHead><TableRow><TableHeader>Status</TableHeader><TableHeader>Payer</TableHeader><TableHeader>Amount</TableHeader></TableRow></TableHead>
        <TableBody>{patient.claims.map((c) => (
          <TableRow key={c.id} clickable onClick={() => navigate(`/billing/claims/${c.id}`)}>
            <TableCell>{c.status}</TableCell><TableCell>{c.payerName}</TableCell><TableCell>${c.totalAmount}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </PageContainer>
  );
}
