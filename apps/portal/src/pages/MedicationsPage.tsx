import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type PortalMedication, type RefillRequest } from '@careconnect/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageLoading,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

function medStatusBadge(status: string): 'success' | 'warning' | 'default' {
  if (status === 'active' || status === 'filled') return 'success';
  if (status === 'pending') return 'warning';
  return 'default';
}

export function MedicationsPage() {
  const navigate = useNavigate();
  const [meds, setMeds] = useState<PortalMedication[]>([]);
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.portal.getMedications(), api.portal.getRefillRequests()])
      .then(([m, r]) => {
        setMeds(m);
        setRefills(r);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load medications'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading label="Loading medications…" />;

  const pendingRefills = refills.filter((r) => r.status === 'pending').length;

  return (
    <PortalPage
      title="My Medications"
      subtitle="Active prescriptions and refill requests"
      actions={
        <Button variant="primary" onClick={() => navigate('/medications/refill')}>
          Request Refill
        </Button>
      }
    >
      {error && (
        <Card padding="md">
          <CardContent><p style={{ margin: 0, color: 'var(--cc-danger)' }}>{error}</p></CardContent>
        </Card>
      )}
      <div className="cc-grid-auto cc-grid-auto--3">
        <StatCard label="Active medications" value={meds.length} />
        <StatCard label="Pending refills" value={pendingRefills} />
        <StatCard label="Pharmacies" value={new Set(meds.map((m) => m.pharmacy).filter(Boolean)).size} />
      </div>
      {meds.length === 0 ? (
        <EmptyState
          title="No medications on file"
          description="Prescriptions from your visits will appear here."
          action={<Button variant="primary" onClick={() => navigate('/book')}>Book a visit</Button>}
        />
      ) : (
        <Card padding="none">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Medication</TableHeader>
                <TableHeader>Dosage</TableHeader>
                <TableHeader>Pharmacy</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {meds.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.medication}</TableCell>
                  <TableCell>{m.dosage}</TableCell>
                  <TableCell>{m.pharmacy ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={medStatusBadge(m.status)}>{m.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {refills.length > 0 && (
        <>
          <h2 style={{ fontSize: 'var(--cc-text-lg)', marginTop: 'var(--cc-space-6)' }}>Refill history</h2>
          <Card padding="none">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Medication</TableHeader>
                  <TableHeader>Requested</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {refills.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.medication}</TableCell>
                    <TableCell>{new Date(r.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'error'}>
                        {r.status}
                      </Badge>
                    </TableCell>
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
