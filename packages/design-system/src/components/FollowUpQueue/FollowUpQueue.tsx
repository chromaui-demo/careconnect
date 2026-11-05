import { useId, useMemo, useState } from 'react';
import { Alert } from '../Alert';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { DataGrid, type DataGridColumn } from '../DataGrid';
import { RadioGroup } from '../RadioGroup';
import './FollowUpQueue.css';

export interface FollowUpItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  patientId?: string;
  patientName?: string;
  dueDate?: string;
}

export interface FollowUpQueueProps {
  /** Existing tasks, including completed work which the queue filters out. */
  items: FollowUpItem[];
  /** Local calendar date, YYYY-MM-DD; fixed in stories. */
  today: string;
  /** Signed-in staff identity; ownership compares IDs rather than names. */
  currentUserId: string;
  /** Clinicians start with their work; coordinators start with the team. */
  initialView?: 'team' | 'mine';
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  onComplete: (id: string) => Promise<void>;
  onOpenPatient: (patientId: string) => void;
}

/** Patient follow-ups ordered by due date, with explicit ownership and retryable actions. */
export function FollowUpQueue({ items, today, currentUserId, initialView = 'team', loading = false, loadError, onRetry, onComplete, onOpenPatient }: FollowUpQueueProps) {
  const name = useId();
  const [view, setView] = useState<string>(initialView);
  const [pending, setPending] = useState<string[]>([]);
  const [failure, setFailure] = useState<{ id: string; title: string } | null>(null);
  const open = items.filter(item => item.status !== 'completed');
  const overdue = (item: FollowUpItem) => !!item.dueDate && item.dueDate.slice(0, 10) < today;
  const rows = useMemo(() => open.filter(item => view === 'mine' ? item.assigneeId === currentUserId : view === 'overdue' ? overdue(item) : true)
    .sort((a, b) => Number(overdue(b)) - Number(overdue(a)) || Number(b.priority === 'high') - Number(a.priority === 'high') || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')), [items, view, currentUserId, today]);

  const complete = async (item: FollowUpItem) => {
    setPending(ids => [...ids, item.id]);
    setFailure(null);
    try { await onComplete(item.id); }
    catch { setFailure({ id: item.id, title: item.title }); }
    finally { setPending(ids => ids.filter(id => id !== item.id)); }
  };
  const columns: DataGridColumn<FollowUpItem>[] = [
    { id: 'patient', header: 'Patient and follow-up', accessor: item => <div className="cc-follow-up-queue__patient"><strong>{item.patientName ?? 'No patient linked'}</strong><span>{item.title}</span></div>, sortValue: item => item.patientName ?? '' },
    { id: 'due', header: 'Due', accessor: item => <div className="cc-follow-up-queue__due"><span>{item.dueDate?.slice(0, 10) ?? 'No due date'}</span>{overdue(item) && <Badge variant="error">Overdue</Badge>}</div>, sortValue: item => item.dueDate ?? '9999' },
    { id: 'owner', header: 'Owner', accessor: item => item.assigneeName ?? 'Unassigned' },
    { id: 'priority', header: 'Priority', accessor: item => <Badge variant={item.priority === 'high' ? 'error' : 'info'}>{item.priority === 'high' ? 'High priority' : 'Routine'}</Badge> },
    { id: 'actions', header: 'Actions', accessor: item => <div className="cc-follow-up-queue__actions"><Button size="sm" variant="ghost" disabled={!item.patientId} onClick={() => item.patientId && onOpenPatient(item.patientId)}>Open patient</Button><Button size="sm" variant="secondary" loading={pending.includes(item.id)} onClick={() => complete(item)}>Complete follow-up</Button></div> },
  ];

  return <section className="cc-follow-up-queue" aria-label="Patient follow-up queue">
    <header className="cc-follow-up-queue__header"><div><h2>{view === 'mine' ? 'My follow-ups' : 'Team handoff'}</h2><p>See what is due and who owns the next step.</p></div><p className="cc-follow-up-queue__summary">{open.filter(overdue).length} overdue · {open.filter(item => !item.assigneeId).length} unassigned</p></header>
    <RadioGroup name={name} label="Show follow-ups" layout="horizontal" value={view} onChange={event => setView(event.target.value)} options={[{ value: 'team', label: 'Team' }, { value: 'mine', label: 'Mine' }, { value: 'overdue', label: 'Overdue' }]} />
    {loadError && <Alert variant="error" title="The queue could not refresh" action={onRetry ? <Button size="sm" variant="secondary" onClick={onRetry}>Retry loading</Button> : undefined}>{loadError} Previously loaded work stays visible.</Alert>}
    {failure && <Alert variant="error" title="Follow-up was not completed" action={<Button size="sm" variant="secondary" onClick={() => { const item = items.find(item => item.id === failure.id); if (item) void complete(item); }}>Retry completion</Button>}>{failure.title} is still open. Check the connection and retry.</Alert>}
    {loading && items.length === 0 ? <p role="status">Loading follow-ups…</p> : loadError && items.length === 0 ? <p role="status">Follow-ups are unavailable until the queue refreshes.</p> : <DataGrid rows={rows} rowKey={item => item.id} columns={columns} emptyMessage={view === 'mine' ? 'No open follow-ups assigned to you.' : 'No open follow-ups in this view.'} searchPlaceholder="Search patients or follow-ups…" searchFilter={(item, query) => `${item.patientName ?? ''} ${item.title} ${item.assigneeName ?? ''}`.toLowerCase().includes(query)} />}
  </section>;
}
