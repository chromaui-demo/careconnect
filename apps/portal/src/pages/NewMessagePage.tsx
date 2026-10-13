import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Breadcrumb, Button, Input, Textarea, useToast } from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function NewMessagePage() {
  const navigate = useNavigate();
  const { push: toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const { threadId } = await api.portal.createMessage({ subject: subject.trim(), body: body.trim() });
      toast('Message sent', 'success');
      navigate(`/messages/${threadId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to send', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalPage title="New Message" subtitle="Send a secure message to your care team">
      <Breadcrumb items={[
        { label: 'Messages', href: '/messages' },
        { label: 'New message' },
      ]} />
      <div className="portal-form">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth />
        <Textarea label="Message" rows={6} value={body} onChange={(e) => setBody(e.target.value)} fullWidth />
        <div className="portal-actions">
          <Button variant="ghost" onClick={() => navigate('/messages')}>Cancel</Button>
          <Button variant="primary" disabled={submitting || !subject.trim() || !body.trim()} onClick={submit}>
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </div>
    </PortalPage>
  );
}
