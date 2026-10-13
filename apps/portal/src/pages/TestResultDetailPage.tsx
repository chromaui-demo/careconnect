import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type PortalLabResultDetail } from '@careconnect/api-client';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  PageLoading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function TestResultDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PortalLabResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    api.portal.getLabResult(orderId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load result'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <PageLoading label="Loading result…" />;
  if (!detail) {
    return (
      <PortalPage title="Test Result">
        <p style={{ color: 'var(--cc-danger)' }}>{error || 'Result not found'}</p>
        <Button variant="ghost" onClick={() => navigate('/results')}>Back to results</Button>
      </PortalPage>
    );
  }

  const hasAbnormal = detail.results.some((r) => r.abnormal);

  return (
    <PortalPage title={detail.testName} subtitle={`Ordered ${new Date(detail.orderedAt).toLocaleDateString()} · ${detail.providerName}`}>
      <Breadcrumb items={[
        { label: 'Test results', href: '/results' },
        { label: detail.testName },
      ]} />
      {hasAbnormal && (
        <Alert variant="warning">
          One or more values are outside the normal range. Your provider may contact you to discuss next steps.
        </Alert>
      )}
      <Card padding="none">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Value</TableHeader>
              <TableHeader>Unit</TableHeader>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Flag</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {detail.results.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.resultValue ?? '—'}</TableCell>
                <TableCell>{r.resultUnit ?? '—'}</TableCell>
                <TableCell>{r.referenceRange ?? '—'}</TableCell>
                <TableCell>
                  {r.abnormal ? <Badge variant="error">Abnormal</Badge> : <Badge variant="success">Normal</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {detail.results[0]?.resultedAt && (
        <Card padding="md">
          <CardContent>
            <p style={{ margin: 0, fontSize: 'var(--cc-text-sm)', color: 'var(--cc-text-secondary)' }}>
              Resulted on {new Date(detail.results[0].resultedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
      <Button variant="ghost" onClick={() => navigate('/results')}>Back to all results</Button>
    </PortalPage>
  );
}
