import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type MessageThread } from '@careconnect/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageLoading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function MessagesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.portal.getMessages()
      .then(setThreads)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading label="Loading messages…" />;

  return (
    <PortalPage
      title="Messages"
      subtitle="Secure messaging with your care team"
      actions={<Button variant="primary" onClick={() => navigate('/messages/new')}>New message</Button>}
    >
      {error && (
        <Card padding="md">
          <CardContent><p style={{ margin: 0, color: 'var(--cc-danger)' }}>{error}</p></CardContent>
        </Card>
      )}
      {threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Send a secure message to your provider about care questions, refills, or follow-up."
          action={<Button variant="primary" onClick={() => navigate('/messages/new')}>New message</Button>}
        />
      ) : (
        <Card padding="none">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Subject</TableHeader>
                <TableHeader>From</TableHeader>
                <TableHeader>Updated</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {threads.map((t) => (
                <TableRow key={t.id} clickable onClick={() => navigate(`/messages/${t.id}`)}>
                  <TableCell>
                    {t.subject}
                    {t.unreadCount > 0 && (
                      <Badge variant="info" style={{ marginLeft: 8 }}>{t.unreadCount} new</Badge>
                    )}
                  </TableCell>
                  <TableCell>{t.providerName}</TableCell>
                  <TableCell>{new Date(t.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell style={{ color: 'var(--cc-text-muted)', fontSize: 'var(--cc-text-sm)' }}>
                    {t.lastPreview.slice(0, 60)}{t.lastPreview.length > 60 ? '…' : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PortalPage>
  );
}
