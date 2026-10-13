import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ClaimDetail, type ClaimNote, type ClaimDiagnosis } from '@careconnect/api-client';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Divider,
  Input,
  PageContainer,
  PageLoading,
  TabPanel,
  Tabs,
  Textarea,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@careconnect/design-system';
import { useHasRole } from '../../components/RequireRole';
import { BILLING_WRITE_ROLES } from './permissions';

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [tab, setTab] = useState('lines');
  const [notes, setNotes] = useState<ClaimNote[]>([]);
  const [dx, setDx] = useState<ClaimDiagnosis[]>([]);
  const [note, setNote] = useState('');
  const [x12, setX12] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setClaim(await api.getClaim(id));
    setNotes(await api.billing.getClaimNotes(id));
    setDx(await api.billing.getDiagnoses(id));
  };

  useEffect(() => { load(); }, [id]);

  if (!claim) return <PageContainer title="Claim"><PageLoading /></PageContainer>;

  return (
    <PageContainer>
      <Breadcrumb items={[
        { label: 'Claims', href: '/billing/claims' },
        { label: claim.patientName },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Claim — {claim.patientName}</h1>
          <p style={{ margin: '4px 0 0' }}>
            <Tooltip content="Primary payer on file">Payer: {claim.payerName}</Tooltip>
            {' · '}${Number(claim.totalAmount).toFixed(2)} · <Badge>{claim.status}</Badge>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => navigate('/billing/claims')}>Back</Button>
          {canWrite && claim.status === 'draft' && <Button variant="primary" onClick={async () => {
            setError('');
            try {
              await api.submitClaim(claim.id);
              push('Claim submitted.', 'success');
              load();
            } catch {
              setError('Submit failed.');
            }
          }}>Submit</Button>}
          <Button variant="ghost" onClick={async () => setX12(await api.billing.exportX12(claim.id))}>Export X12</Button>
        </div>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <Divider />
      <Tabs tabs={[
        { id: 'lines', label: 'Service Lines' }, { id: 'dx', label: 'Diagnoses' }, { id: 'notes', label: 'Notes' }, { id: 'x12', label: 'X12' },
      ]} activeTab={tab} onChange={setTab} />
      <TabPanel active={tab === 'lines'}>
        <Table>
          <TableHead><TableRow><TableHeader>CPT</TableHeader><TableHeader>Description</TableHeader><TableHeader>Amount</TableHeader><TableHeader>Units</TableHeader></TableRow></TableHead>
          <TableBody>
            {claim.lineItems.map((l) => (
              <TableRow key={l.id}><TableCell>{l.cptCode}</TableCell><TableCell>{l.description}</TableCell><TableCell>${l.amount}</TableCell><TableCell>{l.units}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TabPanel>
      <TabPanel active={tab === 'dx'}>
        {canWrite && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Input placeholder="ICD-10 code" id="icd" />
            <Button onClick={async () => {
              const el = document.getElementById('icd') as HTMLInputElement;
              await api.billing.addDiagnosis(claim.id, el.value);
              setDx(await api.billing.getDiagnoses(claim.id));
              el.value = '';
            }}>Add</Button>
          </div>
        )}
        <Table>
          <TableBody>{dx.map((d) => <TableRow key={d.id}><TableCell>{d.icdCode}</TableCell><TableCell>{d.description}</TableCell></TableRow>)}</TableBody>
        </Table>
      </TabPanel>
      <TabPanel active={tab === 'notes'}>
        {canWrite && (
          <>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note" fullWidth />
            <Button style={{ marginTop: 8 }} onClick={async () => {
              await api.billing.addClaimNote(claim.id, note);
              setNote('');
              setNotes(await api.billing.getClaimNotes(claim.id));
            }}>Add note</Button>
          </>
        )}
        {notes.map((n) => <Card key={n.id} padding="md" style={{ marginTop: 8 }}><p>{n.body}</p><small>{n.authorName} · {n.createdAt}</small></Card>)}
      </TabPanel>
      <TabPanel active={tab === 'x12'}>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{x12 || 'Click Export X12 to preview'}</pre>
      </TabPanel>
    </PageContainer>
  );
}
