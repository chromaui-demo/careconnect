import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Appointment, type PaperworkProgress } from '@careconnect/api-client';
import { Badge, Button, Card, CardContent, appointmentStatusBadge, formatStatusLabel } from '@careconnect/design-system';

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [paperwork, setPaperwork] = useState<PaperworkProgress | null>(null);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getAppointment(id).then(setAppt);
    api.getPaperwork(id).then(setPaperwork).catch(() => {});
  }, [id]);

  const run = async (action: string, fn: () => Promise<unknown>) => {
    setLoading(action);
    try {
      await fn();
      if (id) {
        setAppt(await api.getAppointment(id));
        setPaperwork(await api.getPaperwork(id));
      }
    } finally {
      setLoading('');
    }
  };

  if (!appt) return <p>Loading visit...</p>;

  const isVirtual = appt.serviceMode === 'virtual';
  const canCheckIn = appt.status === 'prebooked' && !isVirtual;
  const canTelemed = isVirtual && (appt.status === 'prebooked' || appt.status === 'in-office');
  const canCancel = appt.status === 'prebooked';
  const canReschedule = appt.status === 'prebooked';

  return (
    <>
      <Button variant="ghost" onClick={() => navigate('/visits')} style={{ marginBottom: 16 }}>← My Visits</Button>
      <h1 style={{ fontSize: 'var(--cc-text-2xl)' }}>{appt.reasonForVisit}</h1>
      <p style={{ color: 'var(--cc-text-secondary)' }}>
        {new Date(appt.scheduledTime).toLocaleString()} · {appt.provider} · {appt.location}
      </p>
      <div style={{ marginBottom: 24 }}>
        <Badge variant={appointmentStatusBadge(appt.status)} dot>
          {formatStatusLabel(appt.status)}
        </Badge>
      </div>

      {paperwork && !paperwork.complete && appt.status === 'prebooked' && (
        <Card padding="lg" elevated style={{ marginBottom: 16, borderLeft: '4px solid var(--cc-warning)' }}>
          <CardContent>
            <strong>Intake paperwork incomplete ({paperwork.percent}%)</strong>
            <p style={{ margin: '8px 0 16px', color: 'var(--cc-text-secondary)' }}>
              Complete all forms before your visit for faster check-in.
            </p>
            <Button variant="accent" onClick={() => navigate(`/visits/${id}/paperwork`)}>
              Complete Paperwork
            </Button>
          </CardContent>
        </Card>
      )}

      {paperwork?.complete && (
        <Card padding="md" style={{ marginBottom: 16 }}>
          <CardContent>✓ All intake paperwork complete</CardContent>
        </Card>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {canCheckIn && (
          <Button variant="primary" loading={loading === 'checkin'} onClick={() => run('checkin', () => api.checkIn(id!))}>
            Check In
          </Button>
        )}
        {canTelemed && (
          <Button variant="accent" onClick={() => navigate(`/visits/${id}/telemed/waiting`)}>
            Join Virtual Visit
          </Button>
        )}
        {canReschedule && (
          <Button variant="secondary" onClick={() => navigate(`/visits/${id}/reschedule`)}>Reschedule</Button>
        )}
        {canCancel && (
          <Button variant="ghost" loading={loading === 'cancel'} onClick={() => run('cancel', () => api.cancelAppointment(id!))}>
            Cancel Visit
          </Button>
        )}
        {paperwork && (
          <Button variant="secondary" onClick={() => navigate(`/visits/${id}/paperwork`)}>View Paperwork</Button>
        )}
      </div>

      {paperwork && (
        <Card padding="lg" style={{ marginTop: 24 }}>
          <CardContent>
            <h3>Paperwork Steps</h3>
            <ul style={{ lineHeight: 2 }}>
              {paperwork.steps.map((s) => (
                <li key={s.id}>
                  {s.completed ? '✓' : '○'} {s.title}
                  {!s.completed && (
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/visits/${id}/paperwork/${s.slug}`)}>Start</Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
