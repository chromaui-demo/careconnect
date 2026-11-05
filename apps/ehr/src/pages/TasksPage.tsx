import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Task } from '@careconnect/api-client';
import { Button, FollowUpQueue, PageContainer, useToast } from '@careconnect/design-system';
import { AddTaskDialog } from '../components/Dialogs';
import { useAuth } from '../context/AuthContext';

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const load = async () => {
    setLoading(true);
    setError('');
    try { setTasks(await api.getTasks()); }
    catch { setError('Could not load the latest follow-ups.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const complete = async (id: string) => {
    await api.updateTask(id, { status: 'completed' });
    await load();
    push('Follow-up marked complete.', 'success');
  };
  return <PageContainer title="Patient follow-ups" actions={<Button onClick={() => setShowNew(true)}>New Task</Button>}>
    <FollowUpQueue key={user?.id} items={tasks} currentUserId={user?.id ?? ''} initialView={user?.role === 'Clinician' || user?.role === 'Provider' ? 'mine' : 'team'} today={new Date().toLocaleDateString('en-CA')} loading={loading} loadError={error} onRetry={load} onComplete={complete} onOpenPatient={id => navigate(`/patients/${id}`)} />
    <AddTaskDialog open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
  </PageContainer>;
}
