import { useEffect, useState } from 'react';
import { api, type PortalBillingSummary } from '@careconnect/api-client';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Divider,
  EmptyState,
  Input,
  PageLoading,
  Select,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function BillsPage() {
  const { push: toast } = useToast();
  const [billing, setBilling] = useState<PortalBillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [claimId, setClaimId] = useState('');
  const [paying, setPaying] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);

  const load = () => {
    api.portal.getBilling()
      .then((b) => {
        setBilling(b);
        setPayAmount(b.balance > 0 ? String(b.balance) : '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load billing'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const pay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setPaying(true);
    try {
      const result = await api.portal.payBill({ amount, claimId: claimId || undefined });
      toast(`Payment of ${formatMoney(amount)} recorded`, 'success');
      setBilling((prev) => prev ? { ...prev, balance: result.balance } : prev);
      setShowPayForm(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Payment failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <PageLoading label="Loading billing…" />;

  const balance = billing?.balance ?? 0;

  return (
    <PortalPage title="Bills & Payments" subtitle="View balances and pay online">
      {error && (
        <Card padding="md">
          <CardContent><p style={{ margin: 0, color: 'var(--cc-danger)' }}>{error}</p></CardContent>
        </Card>
      )}
      <div className="cc-grid-auto cc-grid-auto--2">
        <StatCard label="Balance due" value={formatMoney(balance)} />
        <StatCard label="Open claims" value={billing?.claims.filter((c) => c.status !== 'paid').length ?? 0} />
      </div>
      {balance > 0 && (
        <Alert variant="info">
          Demo payments are simulated — no real card is charged. Payments update your account balance immediately.
        </Alert>
      )}
      {balance > 0 && !showPayForm && (
        <Button variant="primary" onClick={() => setShowPayForm(true)}>Pay balance</Button>
      )}
      {showPayForm && (
        <Card padding="lg">
          <CardContent>
            <div className="portal-form">
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                fullWidth
              />
              {billing && billing.claims.length > 0 && (
                <Select
                  label="Apply to claim (optional)"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                  options={[
                    { value: '', label: 'General payment' },
                    ...billing.claims.map((c) => ({
                      value: c.id,
                      label: `${c.payerName ?? 'Claim'} — ${formatMoney(c.totalAmount)}`,
                    })),
                  ]}
                  fullWidth
                />
              )}
              <div className="portal-actions">
                <Button variant="ghost" onClick={() => setShowPayForm(false)}>Cancel</Button>
                <Button variant="primary" disabled={paying} onClick={pay}>
                  {paying ? 'Processing…' : 'Submit payment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Divider />
      <h2 style={{ fontSize: 'var(--cc-text-lg)' }}>Claims</h2>
      {!billing?.claims.length ? (
        <EmptyState title="No claims" description="Insurance claims from your visits will appear here." />
      ) : (
        <Card padding="none">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Payer</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {billing.claims.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{new Date(c.submittedAt ?? c.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{c.payerName ?? '—'}</TableCell>
                  <TableCell>{formatMoney(c.totalAmount)}</TableCell>
                  <TableCell><Badge variant="default">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {billing && billing.recentPayments.length > 0 && (
        <>
          <Divider />
          <h2 style={{ fontSize: 'var(--cc-text-lg)' }}>Payment history</h2>
          <Card padding="none">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Method</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {billing.recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{formatMoney(p.amount)}</TableCell>
                    <TableCell>{p.method ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </PortalPage>
  );
}
