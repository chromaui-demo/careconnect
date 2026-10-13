import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Appointment } from '@careconnect/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Divider,
  PatientAvatar,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  appointmentStatusBadge,
  formatStatusLabel,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function MyVisitsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    api.getAppointments().then(setAppointments).catch(console.error);
  }, []);

  const upcoming = appointments.filter((a) => a.status === 'prebooked' || a.status === 'in-office');
  const past = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  return (
    <PortalPage
      title="My Visits"
      subtitle="Upcoming and past appointments"
      actions={<Button variant="primary" onClick={() => navigate('/book')}>Book New Visit</Button>}
    >
      <div className="cc-grid-auto cc-grid-auto--4">
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Completed" value={past.filter((a) => a.status === 'completed').length} />
        <StatCard label="Cancelled" value={past.filter((a) => a.status === 'cancelled').length} />
        <StatCard label="Total" value={appointments.length} />
      </div>
      <Divider />
      <h2 style={{ fontSize: 'var(--cc-text-lg)' }}>Upcoming</h2>
      {upcoming.length > 0 ? (
        <Card padding="none" style={{ marginBottom: 'var(--cc-space-6)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Date</TableHeader>
                <TableHeader>Reason</TableHeader>
                <TableHeader>Provider</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {upcoming.slice(0, 5).map((appt) => (
                <TableRow key={appt.id} clickable onClick={() => navigate(`/visits/${appt.id}`)}>
                  <TableCell>{formatDateTime(appt.scheduledTime)}</TableCell>
                  <TableCell>{appt.reasonForVisit}</TableCell>
                  <TableCell>{appt.provider}</TableCell>
                  <TableCell>
                    <Tooltip content={appt.serviceMode === 'virtual' ? 'Video visit' : 'In-clinic visit'}>
                      <Badge variant={appointmentStatusBadge(appt.status)} dot>
                        {formatStatusLabel(appt.status)}
                      </Badge>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/visits/${appt.id}`); }}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card padding="lg" style={{ marginBottom: 'var(--cc-space-6)' }}>
          <CardContent><p style={{ margin: 0, color: 'var(--cc-text-muted)' }}>No upcoming visits.</p></CardContent>
        </Card>
      )}
      <Divider />
      <h2 style={{ fontSize: 'var(--cc-text-lg)' }}>Past Visits</h2>
      <Card padding="none">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Patient</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Reason</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {past.map((appt) => (
              <TableRow key={appt.id}>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {appt.patient && <PatientAvatar patient={appt.patient} size="sm" />}
                    {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Patient'}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(appt.scheduledTime)}</TableCell>
                <TableCell>{appt.reasonForVisit}</TableCell>
                <TableCell>
                  <Badge variant={appointmentStatusBadge(appt.status)}>
                    {formatStatusLabel(appt.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PortalPage>
  );
}
