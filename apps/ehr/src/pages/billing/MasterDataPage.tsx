import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, type MasterRecord, type BillingTag, type ChargeItem, type BillingRule } from '@careconnect/api-client';
import { Button, Checkbox, Input, PageContainer, Switch, Textarea, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@careconnect/design-system';
import { useHasRole } from '../../components/RequireRole';
import { BILLING_WRITE_ROLES } from './permissions';

type MasterType = 'billing-providers' | 'rendering-providers' | 'service-facilities';

export function MasterDataPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const type = location.pathname.split('/').filter(Boolean).pop() as MasterType;
  const [rows, setRows] = useState<MasterRecord[]>([]);
  const [name, setName] = useState('');

  const load = async () => {
    if (type === 'billing-providers') setRows(await api.billing.getBillingProviders());
    if (type === 'rendering-providers') setRows(await api.billing.getRenderingProviders());
    if (type === 'service-facilities') setRows(await api.billing.getServiceFacilities());
  };

  useEffect(() => { load(); }, [type]);

  const title = type?.replace(/-/g, ' ') ?? 'Master Data';

  return (
    <PageContainer title={title} actions={<Button variant="secondary" onClick={() => navigate('/billing/claims')}>Back</Button>}>
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={async () => {
            if (!name || !type) return;
            if (type === 'billing-providers') await api.billing.createBillingProvider({ name });
            if (type === 'rendering-providers') await api.billing.createRenderingProvider({ name });
            if (type === 'service-facilities') await api.billing.createServiceFacility({ name });
            setName('');
            load();
          }}>Add</Button>
        </div>
      )}
      <Table>
        <TableHead><TableRow><TableHeader>Name</TableHeader><TableHeader>NPI</TableHeader></TableRow></TableHead>
        <TableBody>{rows.map((r) => <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.npi ?? '—'}</TableCell></TableRow>)}</TableBody>
      </Table>
    </PageContainer>
  );
}

export function ChargeMastersPage() {
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [items, setItems] = useState<ChargeItem[]>([]);
  const [cpt, setCpt] = useState('');
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');

  const load = () => api.billing.getChargeMasters().then(setItems);
  useEffect(() => { load(); }, []);

  return (
    <PageContainer title="Charge Masters">
      {canWrite && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input placeholder="CPT" value={cpt} onChange={(e) => setCpt(e.target.value)} />
          <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input placeholder="Amount" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <Button onClick={async () => { await api.billing.createChargeMaster({ cptCode: cpt, description: desc, defaultAmount: Number(amt) }); load(); }}>Add</Button>
        </div>
      )}
      <Table>
        <TableBody>{items.map((i) => <TableRow key={i.id}><TableCell>{i.cptCode}</TableCell><TableCell>{i.description}</TableCell><TableCell>${i.defaultAmount}</TableCell></TableRow>)}</TableBody>
      </Table>
    </PageContainer>
  );
}

export function TagsPage() {
  const [tags, setTags] = useState<BillingTag[]>([]);
  useEffect(() => { api.billing.getTags().then(setTags); }, []);
  return (
    <PageContainer title="Tags">
      <Table><TableBody>{tags.map((t) => <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell><span style={{ color: t.color }}>●</span></TableCell></TableRow>)}</TableBody></Table>
    </PageContainer>
  );
}

export function RulesPage() {
  const { engine } = useParams<{ engine: string }>();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [rules, setRules] = useState<BillingRule[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autoRun, setAutoRun] = useState(true);

  const load = () => { if (engine) api.billing.getRules(engine).then(setRules); };
  useEffect(() => { load(); }, [engine]);

  return (
    <PageContainer title={`Rules — ${engine}`}>
      {canWrite && (
        <div className="cc-stack cc-stack--sm" style={{ maxWidth: 520, marginBottom: 16 }}>
          <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Rule description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} fullWidth />
          <Switch label="Auto-run on claim save" checked={autoRun} onChange={(e) => setAutoRun(e.target.checked)} />
          <Checkbox label="Stop processing on first match" defaultChecked />
          <Button onClick={async () => { if (engine && name) { await api.billing.createRule(engine, { name, actions: [] }); load(); } }}>Add Rule</Button>
        </div>
      )}
      <Table>
        <TableBody>{rules.map((r) => (
          <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.enabled ? 'On' : 'Off'}</TableCell><TableCell>{r.sortOrder}</TableCell></TableRow>
        ))}</TableBody>
      </Table>
    </PageContainer>
  );
}
