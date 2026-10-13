import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Appointment } from '@careconnect/api-client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageContainer, PageLoading, PatientAvatar, appointmentStatusBadge, formatStatusLabel } from '@careconnect/design-system';

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (id) api.getAppointment(id).then(setAppt);
  }, [id]);

  if (!appt) return <PageContainer title="Visit"><PageLoading /></PageContainer>;

  return (
    <PageContainer title="Visit Details" actions={<Button variant="secondary" onClick={() => navigate('/visits')}>Back</Button>}>
      <Card padding="lg">
        <CardHeader>
          {appt.patient && <PatientAvatar patient={appt.patient} size="md" />}
          <CardTitle>{appt.patient?.firstName} {appt.patient?.lastName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Scheduled:</strong> {new Date(appt.scheduledTime).toLocaleString()}</p>
          <p><strong>Reason:</strong> {appt.reasonForVisit}</p>
          <p><strong>Provider:</strong> {appt.provider}</p>
          <p><strong>Location:</strong> {appt.location}</p>
          <p><strong>Mode:</strong> {appt.serviceMode}</p>
          <p><Badge variant={appointmentStatusBadge(appt.status)}>{formatStatusLabel(appt.status)}</Badge></p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {appt.status === 'in-office' && (
              appt.serviceMode === 'virtual'
                ? <Button variant="accent" onClick={() => navigate(`/telemed/${appt.id}/waiting`)}>Telemed Waiting Room</Button>
                : <Button variant="accent" onClick={() => navigate(`/encounter/${appt.id}`)}>Open Encounter</Button>
            )}
            {appt.patientId && <Button variant="secondary" onClick={() => navigate(`/patient/${appt.patientId}/info`)}>Patient Chart</Button>}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
