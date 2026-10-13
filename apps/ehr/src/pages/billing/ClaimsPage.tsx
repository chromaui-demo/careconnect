import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Claim } from '@careconnect/api-client';
import {
  Alert,
  Badge,
  Button,
  DataGrid,
  type DataGridColumn,
  DatePicker,
  DateRangePicker,
  EmptyState,
  PageContainer,
  Pagination,
  PayerMixChart,
  PaymentsBarChart,
  RevenueTrendChart,
  Select,
  StatCard,
  useToast,
} from '@careconnect/design-system';
import { useHasRole } from '../../components/RequireRole';
import { BILLING_WRITE_ROLES } from './permissions';

const PAGE_SIZE = 8;

export function ClaimsPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const canWrite = useHasRole(BILLING_WRITE_ROLES);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [serviceDate, setServiceDate] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = () => api.getClaims().then(setClaims);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => claims.filter((c) => {
    if (status !== 'all' && c.status !== status) return false;
    if (serviceDate && c.submittedAt && c.submittedAt.slice(0, 10) !== serviceDate) return false;
    if (dateRange.from && c.submittedAt && c.submittedAt.slice(0, 10) < dateRange.from) return false;
    if (dateRange.to && c.submittedAt && c.submittedAt.slice(0, 10) > dateRange.to) return false;
    return true;
  }), [claims, status, serviceDate, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const draftCount = claims.filter((c) => c.status === 'draft').length;
  const submittedCount = claims.filter((c) => c.status === 'submitted').length;

  const payerChart = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of filtered) {
      const payer = c.payerName ?? 'Unknown';
      totals.set(payer, (totals.get(payer) ?? 0) + Number(c.totalAmount));
    }
    return [...totals.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const paymentChart = useMemo(() => {
    const totals = new Map<string, number>();
    for (const c of filtered) {
      const month = c.submittedAt?.slice(0, 7) ?? 'Unknown';
      totals.set(month, (totals.get(month) ?? 0) + Number(c.totalAmount));
    }
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, charges]) => ({ month, charges, collections: charges * 0.82 }));
  }, [filtered]);

  const columns: DataGridColumn<Claim>[] = [
    { id: 'patient', header: 'Patient', accessor: (c) => c.patientName, sortValue: (c) => c.patientName },
    { id: 'payer', header: 'Payer', accessor: (c) => c.payerName },
    { id: 'amount', header: 'Amount', accessor: (c) => `$${Number(c.totalAmount).toFixed(2)}`, sortValue: (c) => Number(c.totalAmount) },
    { id: 'status', header: 'Status', accessor: (c) => <Badge variant={c.status === 'submitted' ? 'completed' : 'warning'}>{c.status}</Badge> },
    { id: 'link', header: 'Actions', hideHeader: true, accessor: (c) => <Link to={`/billing/claims/${c.id}`}>Open</Link> },
  ];

  const runRules = async () => {
    setError('');
    try {
      await api.billing.runRules('claim-submission', filtered.filter((c) => c.status === 'draft').map((c) => c.id));
      push('Billing rules executed.', 'success');
      load();
    } catch {
      setError('Could not run rules. Try again.');
    }
  };

  return (
    <PageContainer title="Claims" actions={
      canWrite ? (
        <>
          <Button variant="secondary" onClick={runRules}>Run Rules</Button>
          <Button variant="primary" onClick={() => navigate('/billing/claims/new')}>Create Claim</Button>
        </>
      ) : undefined
    }>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="cc-grid-auto cc-grid-auto--4" style={{ marginBottom: 16 }}>
        <StatCard label="Open drafts" value={draftCount} delta="Needs submission" />
        <StatCard label="Submitted" value={submittedCount} delta="This period" />
        <StatCard label="Filtered rows" value={filtered.length} />
        <StatCard label="Total charges" value={`$${filtered.reduce((s, c) => s + Number(c.totalAmount), 0).toFixed(0)}`} />
      </div>
      <div className="cc-grid-auto cc-grid-auto--2" style={{ marginBottom: 16 }}>
        <PayerMixChart data={payerChart} title="Payer mix" height={220} />
        <PaymentsBarChart data={payerChart.map((p) => ({ payer: p.name, amount: p.value }))} title="Charges by payer" height={220} />
        <RevenueTrendChart data={paymentChart} title="Revenue trend" height={220} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[
          { value: 'all', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' },
        ]} />
        <DatePicker label="Service date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
        <DateRangePicker label="DOS range" value={dateRange} onChange={setDateRange} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No claims" description="Adjust filters or create a new claim." action={canWrite ? <Button onClick={() => navigate('/billing/claims/new')}>Create Claim</Button> : undefined} />
      ) : (
        <>
          <DataGrid
            columns={columns}
            rows={pageRows}
            rowKey={(c) => c.id}
            searchFilter={(c, q) => c.patientName.toLowerCase().includes(q) || (c.payerName ?? '').toLowerCase().includes(q)}
            onRowClick={(c) => navigate(`/billing/claims/${c.id}`)}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </PageContainer>
  );
}
