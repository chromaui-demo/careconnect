import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type EraDetail, type Claim } from '@careconnect/api-client';
import { Button, FileUpload, Input, PageContainer, PageLoading, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@careconnect/design-system';
import { useHasRole } from '../../components/RequireRole';
import { BILLING_WRITE_ROLES } from './permissions';

export function EraPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [eras, setEras] = useState<Array<{ id: string; payerName: string; totalAmount: number }>>([]);
  const [x12, setX12] = useState('');

  const load = () => api.getEras().then(setEras);
  useEffect(() => { load(); }, []);

  const importEra = async () => {
    await api.billing.importEra(x12 || 'ISA*demo*~');
    setX12('');
    load();
  };

  return (
    <PageContainer title="ERAs">
      {canWrite && (
        <>
          <FileUpload
            label="Import ERA file"
            accept=".txt,.edi,.x12"
            hint="Or paste X12 below"
            onFilesSelected={(files) => {
              const reader = new FileReader();
              reader.onload = () => setX12(String(reader.result ?? ''));
              reader.readAsText(files[0]);
            }}
          />
          <div style={{ marginBottom: 16 }}>
            <Input placeholder="Paste X12 ERA content" value={x12} onChange={(e) => setX12(e.target.value)} fullWidth />
            <Button variant="primary" onClick={async () => {
              await importEra();
              push('ERA imported.', 'success');
            }}>Import ERA</Button>
          </div>
        </>
      )}
      <Table>
        <TableHead><TableRow><TableHeader>Payer</TableHeader><TableHeader>Amount</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
        <TableBody>
          {eras.map((e) => (
            <TableRow key={e.id} clickable onClick={() => navigate(`/billing/eras/${e.id}`)}>
              <TableCell>{e.payerName}</TableCell>
              <TableCell>${Number(e.totalAmount).toFixed(2)}</TableCell>
              <TableCell>Open</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
}

export function EraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [era, setEra] = useState<EraDetail | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    if (id) api.getEra(id).then(setEra);
    api.getClaims().then(setClaims);
  }, [id]);

  const match = async (paymentId: string, claimId: string) => {
    if (!id) return;
    await api.billing.matchEraPayment(id, paymentId, claimId);
    setEra(await api.getEra(id));
  };

  if (!era) return <PageContainer title="ERA"><PageLoading /></PageContainer>;

  return (
    <PageContainer title={`ERA — ${era.payerName}`} actions={<Button variant="secondary" onClick={() => navigate('/billing/eras')}>Back</Button>}>
      <Table>
        <TableHead><TableRow><TableHeader>Patient</TableHeader><TableHeader>Paid</TableHeader><TableHeader>Status</TableHeader><TableHeader>Match</TableHeader></TableRow></TableHead>
        <TableBody>
          {era.payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.patientName}</TableCell>
              <TableCell>${p.paidAmount}</TableCell>
              <TableCell>{p.status}</TableCell>
              <TableCell>
                {canWrite && p.status === 'unmatched' && claims[0] && (
                  <Button size="sm" onClick={() => match(p.id, claims[0].id)}>Match to claim</Button>
                )}
                {p.claimId && <Button size="sm" variant="ghost" onClick={() => navigate(`/billing/eras/${id}/claims/${p.claimId}`)}>Drill in</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
}

export function EraClaimDetailPage() {
  const { eraId, claimId } = useParams<{ eraId: string; claimId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<{ paidAmount: number; adjustments: Array<{ code: string; amount: number }> } | null>(null);

  useEffect(() => {
    if (eraId && claimId) api.billing.getEraClaimDetail(eraId, claimId).then(setDetail);
  }, [eraId, claimId]);

  return (
    <PageContainer title="ERA Claim Detail" actions={<Button variant="secondary" onClick={() => navigate(`/billing/eras/${eraId}`)}>Back</Button>}>
      {detail && (
        <>
          <p>Paid: ${detail.paidAmount}</p>
          <ul>{detail.adjustments.map((a) => <li key={a.code}>{a.code}: ${a.amount}</li>)}</ul>
        </>
      )}
    </PageContainer>
  );
}
