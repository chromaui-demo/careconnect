import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@careconnect/api-client';
import { Button, Card, CardContent } from '@careconnect/design-system';

export function TelemedWaitingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<{ status: string; roomId?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getTelemedSession(id).then(setSession);
    const t = setInterval(() => api.getTelemedSession(id).then(setSession), 3000);
    return () => clearInterval(t);
  }, [id]);

  return (
    <>
      <h1 style={{ fontSize: 'var(--cc-text-2xl)' }}>Virtual Waiting Room</h1>
      <Card padding="lg">
        <CardContent style={{ textAlign: 'center' }}>
          <p>Status: <strong>{session?.status ?? 'loading...'}</strong></p>
          {session?.roomId && <p style={{ fontSize: 12, color: 'var(--cc-text-muted)' }}>Room: {session.roomId}</p>}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button variant="accent" onClick={() => navigate(`/visits/${id}/telemed/video`)}>Enter Visit</Button>
            <Button variant="ghost" onClick={() => navigate(`/visits/${id}`)}>Leave</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export { TelemedVideoPage } from './TelemedVideoPage';
