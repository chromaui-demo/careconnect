import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, createWebRTCCall } from '@careconnect/api-client';
import { Button } from '@careconnect/design-system';

export function TelemedVideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let call: ReturnType<typeof createWebRTCCall> | null = null;
    (async () => {
      try {
        await api.joinTelemed(id, 'patient');
        call = createWebRTCCall(id, 'patient');
        await call.start((remote) => {
          if (remoteRef.current) remoteRef.current.srcObject = remote;
          setConnected(true);
        });
        const local = call.getLocalStream();
        if (local && localRef.current) localRef.current.srcObject = local;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera/mic access required');
      }
    })();
    return () => { call?.stop(); };
  }, [id]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1>Virtual Visit</h1>
      {error && <p style={{ color: 'var(--cc-error)' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <video ref={localRef} autoPlay muted playsInline style={{ width: '100%', borderRadius: 8, background: '#111' }} />
        <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, background: '#111' }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--cc-text-muted)' }}>{connected ? 'WebRTC connected' : 'Waiting for provider...'}</p>
      <Button variant="accent" onClick={() => navigate(`/visits/${id}`)}>End Call</Button>
    </div>
  );
}
