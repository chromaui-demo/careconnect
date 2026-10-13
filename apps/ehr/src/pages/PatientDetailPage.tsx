import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Appointment, type Patient } from '@careconnect/api-client';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageContainer,
  PageHeader,
  PageLoading,
  PatientBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Timeline,
  appointmentStatusBadge,
  formatStatusLabel,
} from '@careconnect/design-system';

function patientAge(dob: string) {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getPatient(id).then(setPatient);
    api.getAppointments().then((all) => setAppointments(all.filter((a) => a.patientId === id)));
  }, [id]);

  if (!patient) return <PageContainer title="Patient"><PageLoading /></PageContainer>;

  const timelineEvents = appointments.slice(0, 6).map((a) => ({
    id: a.id,
    time: new Date(a.scheduledTime).toLocaleString(),
    title: a.reasonForVisit,
    description: `${formatStatusLabel(a.status)} · ${a.provider}`,
    variant: 'clinical' as const,
  }));

  return (
    <PageContainer>
      <Breadcrumb items={[
        { label: 'Patients', href: '/patients' },
        { label: `${patient.firstName} ${patient.lastName}` },
      ]} />
      <PageHeader
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle="Patient chart overview"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/patient/${id}/info`)}>Info</Button>
            <Button variant="secondary" onClick={() => navigate(`/patient/${id}/docs`)}>Docs</Button>
            <Button variant="secondary" onClick={() => navigate(`/patient/${id}/action-logs`)}>Logs</Button>
            <Button variant="secondary" onClick={() => navigate('/patients')}>Back</Button>
          </>
        }
      />
      <PatientBanner
        name={`${patient.firstName} ${patient.lastName}`}
        mrn={patient.id.slice(0, 8).toUpperCase()}
        dob={patient.dateOfBirth}
        age={patientAge(patient.dateOfBirth)}
        sex={patient.gender}
        status="in-office"
      />
      <div className="cc-grid-auto cc-grid-auto--2">
        <Card padding="lg">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent>
            <p><strong>Phone:</strong> {patient.phone}</p>
            <p><strong>Email:</strong> {patient.email}</p>
          </CardContent>
        </Card>
        <Card padding="lg">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {timelineEvents.length > 0 ? <Timeline events={timelineEvents} /> : <p>No recent visits.</p>}
          </CardContent>
        </Card>
      </div>
      <Card padding="lg">
        <CardHeader><CardTitle>Visit History</CardTitle></CardHeader>
        <Table>
          <TableHead><TableRow><TableHeader>Date</TableHeader><TableHeader>Reason</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
          <TableBody>
            {appointments.map((a) => (
              <TableRow key={a.id} clickable onClick={() => navigate(`/encounter/${a.id}`)}>
                <TableCell>{new Date(a.scheduledTime).toLocaleDateString()}</TableCell>
                <TableCell>{a.reasonForVisit}</TableCell>
                <TableCell><Badge variant={appointmentStatusBadge(a.status)}>{formatStatusLabel(a.status)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageContainer>
  );
}
