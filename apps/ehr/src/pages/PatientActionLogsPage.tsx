import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type AuditLogDetail } from '@careconnect/api-client';
import { Breadcrumb, Button, EmptyState, PageContainer, PageHeader, Timeline } from '@careconnect/design-system';
import { PatientChartNav } from './PatientChartInfoPage';

export function PatientActionLogsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLogDetail[]>([]);

  useEffect(() => { if (id) api.getAuditLogs(id).then(setLogs); }, [id]);

  const events = logs.map((l) => ({
    id: l.id,
    time: l.createdAt,
    title: l.action,
    description: l.resourceType ? `${l.resourceType}${l.resourceId ? ` #${l.resourceId.slice(0, 8)}` : ''}` : undefined,
    variant: 'system' as const,
  }));

  return (
    <PageContainer>
      <Breadcrumb items={[
        { label: 'Patients', href: '/patients' },
        { label: 'Chart', href: `/patient/${id}` },
        { label: 'Action logs' },
      ]} />
      <PageHeader title="Action Logs" actions={<Button variant="secondary" onClick={() => navigate(`/patient/${id}`)}>Back</Button>} />
      <PatientChartNav id={id!} section="logs" />
      {events.length === 0 ? (
        <EmptyState title="No activity yet" description="Audit events for this patient will appear here." />
      ) : (
        <Timeline events={events} />
      )}
    </PageContainer>
  );
}
