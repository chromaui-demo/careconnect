import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type BillingPatient } from '@careconnect/api-client';
import { Input, PageContainer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@careconnect/design-system';

export function BillingPatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<BillingPatient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { api.billing.getPatients(search || undefined).then(setPatients); }, [search]);

  return (
    <PageContainer title="Billing Patients">
      <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320, marginBottom: 16 }} />
      <Table>
        <TableHead><TableRow><TableHeader>Patient</TableHeader><TableHeader>DOB</TableHeader><TableHeader>Balance</TableHeader></TableRow></TableHead>
        <TableBody>
          {patients.map((p) => (
            <TableRow key={p.id} clickable onClick={() => navigate(`/billing/patients/${p.id}`)}>
              <TableCell>{p.firstName} {p.lastName}</TableCell>
              <TableCell>{p.dateOfBirth}</TableCell>
              <TableCell>${Number(p.balance).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
}
