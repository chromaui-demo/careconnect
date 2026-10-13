import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Patient } from '@careconnect/api-client';
import { PageContainer, PageLoading, PatientAvatar, Button, Card, CardContent } from '@careconnect/design-system';

export function PatientChartInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => { if (id) api.getPatient(id).then(setPatient); }, [id]);

  if (!patient) return <PageContainer title="Patient"><PageLoading /></PageContainer>;

  return (
    <PageContainer title={`${patient.firstName} ${patient.lastName}`} actions={<Button variant="secondary" onClick={() => navigate(`/patient/${id}`)}>Chart Home</Button>}>
      <PatientChartNav id={id!} section="info" />
      <Card padding="lg">
        <PatientAvatar patient={patient} size="lg" />
        <CardContent>
          <p><strong>DOB:</strong> {patient.dateOfBirth}</p>
          <p><strong>Gender:</strong> {patient.gender}</p>
          <p><strong>Phone:</strong> {patient.phone}</p>
          <p><strong>Email:</strong> {patient.email}</p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export function PatientChartNav({ id, section }: { id: string; section: string }) {
  const tabs = [
    { key: 'info', label: 'Info', path: `/patient/${id}/info` },
    { key: 'docs', label: 'Documents', path: `/patient/${id}/docs` },
    { key: 'logs', label: 'Action Logs', path: `/patient/${id}/action-logs` },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      {tabs.map((t) => (
        <Link key={t.key} to={t.path} style={{ fontWeight: section === t.key ? 700 : 400 }}>{t.label}</Link>
      ))}
    </div>
  );
}
