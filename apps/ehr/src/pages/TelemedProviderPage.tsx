import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Appointment, createWebRTCCall } from '@careconnect/api-client';
import { Button, Card, CardContent, PageContainer } from '@careconnect/design-system';

export function TelemedWaitingPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<{ status: string; roomId?: string } | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    api.getTelemedSession(appointmentId).then(setSession);
  }, [appointmentId]);

  return (
    <PageContainer title="Virtual Waiting Room">
      <Card padding="lg"><CardContent style={{ textAlign: 'center' }}>
        <p>Status: <strong>{session?.status ?? 'loading'}</strong></p>
        <Button variant="accent" onClick={() => navigate(`/telemed/${appointmentId}/video`)}>Enter Visit</Button>
      </CardContent></Card>
    </PageContainer>
  );
}

export function TelemedProviderPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [appt, setAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    api.getAppointment(appointmentId).then(setAppt);
    let call: ReturnType<typeof createWebRTCCall> | null = null;
    (async () => {
      await api.joinTelemed(appointmentId, 'provider');
      call = createWebRTCCall(appointmentId, 'provider');
      await call.start((remote) => { if (remoteRef.current) remoteRef.current.srcObject = remote; });
      const local = call.getLocalStream();
      if (local && localRef.current) localRef.current.srcObject = local;
    })();
    return () => { call?.stop(); };
  }, [appointmentId]);

  return (
    <PageContainer title="Telemed Visit" actions={<Button variant="ghost" onClick={() => navigate('/visits')}>Back</Button>}>
      {appt && <p>{appt.patient?.firstName} {appt.patient?.lastName} — {appt.reasonForVisit}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <video ref={localRef} autoPlay muted playsInline style={{ width: '100%', borderRadius: 8, background: '#111' }} />
        <video ref={remoteRef} autoPlay playsInline style={{ width: '100%', borderRadius: 8, background: '#111' }} />
      </div>
      <Button variant="primary" onClick={() => navigate(`/encounter/${appointmentId}`)}>Open Chart</Button>
      <Button variant="ghost" onClick={() => api.endTelemed(appointmentId!)}>End Visit</Button>
    </PageContainer>
  );
}
