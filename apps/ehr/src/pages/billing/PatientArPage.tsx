import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type PatientAr } from '@careconnect/api-client';
import { Button, Input, MetricBarChart, PageContainer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@careconnect/design-system';
import { useHasRole } from '../../components/RequireRole';
import { BILLING_WRITE_ROLES } from './permissions';

export function PatientArPage() {
  const navigate = useNavigate();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [rows, setRows] = useState<PatientAr[]>([]);
  const [patientId, setPatientId] = useState('');
  const [amount, setAmount] = useState('');

  const load = () => api.getPatientAr().then(setRows);
  useEffect(() => { load(); }, []);

  const chartData = useMemo(
    () => rows
      .map((r) => ({ name: r.name, value: Number(r.balance) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12),
    [rows],
  );

  const pay = async () => {
    if (!patientId || !amount) return;
    await api.billing.recordPayment(patientId, { amount: Number(amount), method: 'cash' });
    setAmount('');
    load();
  };

  return (
    <PageContainer title="Patient Accounts Receivable">
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <Input placeholder="Payment amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={pay}>Record Payment</Button>
        </div>
      )}

      {chartData.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <MetricBarChart
            data={chartData}
            title="AR Balances by Patient"
            subtitle="Outstanding patient balances"
            valueFormatter={(v) => `$${v.toFixed(2)}`}
            height={280}
          />
        </div>
      )}

      <Table>
        <TableHead><TableRow><TableHeader>Patient</TableHeader><TableHeader>Balance</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.patientId}>
              <TableCell>{r.name}</TableCell>
              <TableCell>${Number(r.balance).toFixed(2)}</TableCell>
              <TableCell><Button size="sm" onClick={() => navigate(`/billing/patients/${r.patientId}`)}>Open</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
}
