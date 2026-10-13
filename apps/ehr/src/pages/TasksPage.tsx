import { useEffect, useState } from 'react';
import { api, type Task } from '@careconnect/api-client';
import { Badge, Button, Card, EmptyState, PageContainer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@careconnect/design-system';
import { AddTaskDialog } from '../components/Dialogs';

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showNew, setShowNew] = useState(false);

  const { push } = useToast();

  const load = () => api.getTasks().then(setTasks);

  useEffect(() => { load(); }, []);

  const complete = async (id: string) => {
    await api.updateTask(id, { status: 'completed' });
    push('Task marked complete.', 'success');
    load();
  };

  return (
    <PageContainer title="Tasks" actions={<Button variant="primary" onClick={() => setShowNew(true)}>New Task</Button>}>
      {tasks.length === 0 ? (
        <EmptyState title="No open tasks" description="Create a task to track follow-ups and assignments." action={<Button onClick={() => setShowNew(true)}>New Task</Button>} />
      ) : (
      <Card padding="none">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Task</TableHeader>
              <TableHeader>Priority</TableHeader>
              <TableHeader>Assignee</TableHeader>
              <TableHeader>Patient</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell><strong>{t.title}</strong>{t.description && <div style={{ fontSize: 12, color: 'var(--cc-text-muted)' }}>{t.description}</div>}</TableCell>
                <TableCell><Badge variant={t.priority === 'high' ? 'warning' : 'default'}>{t.priority}</Badge></TableCell>
                <TableCell>{t.assigneeName ?? '—'}</TableCell>
                <TableCell>{t.patientName ?? '—'}</TableCell>
                <TableCell><Badge variant={t.status === 'open' ? 'in-office' : 'completed'}>{t.status}</Badge></TableCell>
                <TableCell>{t.status === 'open' && <Button size="sm" onClick={() => complete(t.id)}>Complete</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      )}
      <AddTaskDialog open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </PageContainer>
  );
}
