import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type MessageThreadDetail } from '@careconnect/api-client';
import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  PageLoading,
  Textarea,
  useToast,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function MessageThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { push: toast } = useToast();
  const [thread, setThread] = useState<MessageThreadDetail | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    if (!threadId) return;
    setLoading(true);
    api.portal.getMessageThread(threadId)
      .then(setThread)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async () => {
    if (!threadId || !reply.trim()) return;
    setSending(true);
    try {
      await api.portal.replyToThread(threadId, reply.trim());
      setReply('');
      setLoading(true);
      load();
      toast('Reply sent', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading && !thread) return <PageLoading label="Loading conversation…" />;

  return (
    <PortalPage title={thread?.subject ?? 'Message'} subtitle={thread ? `With ${thread.providerName}` : undefined}>
      <Breadcrumb items={[
        { label: 'Messages', href: '/messages' },
        { label: thread?.subject ?? 'Thread' },
      ]} />
      <div className="cc-stack">
        {thread?.messages.map((m) => (
          <Card
            key={m.id}
            padding="md"
            style={{
              alignSelf: m.senderRole === 'patient' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.senderRole === 'patient' ? 'var(--cc-primary-subtle)' : 'var(--cc-bg-elevated)',
            }}
          >
            <CardContent>
              <p style={{ margin: '0 0 var(--cc-space-2)', fontSize: 'var(--cc-text-xs)', color: 'var(--cc-text-muted)' }}>
                {m.senderRole === 'patient' ? 'You' : thread.providerName} · {new Date(m.createdAt).toLocaleString()}
              </p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="portal-form" style={{ marginTop: 'var(--cc-space-6)' }}>
        <Textarea label="Reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} fullWidth />
        <div className="portal-actions">
          <Button variant="ghost" onClick={() => navigate('/messages')}>Back to inbox</Button>
          <Button variant="primary" disabled={sending || !reply.trim()} onClick={sendReply}>
            {sending ? 'Sending…' : 'Send reply'}
          </Button>
        </div>
      </div>
    </PortalPage>
  );
}
