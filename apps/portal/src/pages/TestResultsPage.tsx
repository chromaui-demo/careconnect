import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type PortalLabResult } from '@careconnect/api-client';
import {
  Alert,
  Badge,
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

export function TestResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<PortalLabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.portal.getLabResults()
      .then(setResults)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  const abnormalCount = useMemo(() => results.filter((r) => r.abnormal).length, [results]);

  if (loading) return <PageLoading label="Loading test results…" />;

  return (
    <PortalPage title="Test Results" subtitle="Lab and diagnostic results from your visits">
      {error && (
        <Card padding="md">
          <CardContent><p style={{ margin: 0, color: 'var(--cc-danger)' }}>{error}</p></CardContent>
        </Card>
      )}
      {abnormalCount > 0 && (
        <Alert variant="warning">
          {abnormalCount} result{abnormalCount > 1 ? 's' : ''} flagged outside the normal range. Contact your care team if you have questions.
        </Alert>
      )}
      <div className="cc-grid-auto cc-grid-auto--2">
        <StatCard label="Total results" value={results.length} />
        <StatCard label="Needs review" value={abnormalCount} />
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Completed lab work from your visits will appear here when available."
        />
      ) : (
        <Card padding="none">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Test</TableHeader>
                <TableHeader>Result</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Provider</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.resultId} clickable onClick={() => navigate(`/results/${r.orderId}`)}>
                  <TableCell>
                    {r.testName}
                    {r.abnormal && (
                      <Badge variant="error" style={{ marginLeft: 8 }}>Abnormal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.resultValue != null ? `${r.resultValue}${r.resultUnit ? ` ${r.resultUnit}` : ''}` : '—'}
                  </TableCell>
                  <TableCell>
                    {r.resultedAt ? new Date(r.resultedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{r.providerName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PortalPage>
  );
}
