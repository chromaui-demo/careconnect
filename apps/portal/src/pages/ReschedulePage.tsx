import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type TimeSlot } from '@careconnect/api-client';
import { Alert, Breadcrumb, Button, Card, CardContent, DatePicker, Progress } from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

function formatSlotTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function ReschedulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.getSlots().then(setSlots); }, []);

  const visible = slots.filter((s) => {
    if (!s.available) return false;
    if (!filterDate) return true;
    return s.startTime.slice(0, 10) === filterDate;
  });

  const confirm = async () => {
    if (!id || !selected) return;
    setLoading(true);
    setError('');
    try {
      await api.rescheduleAppointment(id, {
        scheduledTime: selected.startTime,
        providerId: selected.providerId,
        locationId: selected.locationId,
      });
      navigate(`/visits/${id}`);
    } catch {
      setError('Unable to reschedule. Pick another time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalPage title="Reschedule Visit" subtitle="Choose a new appointment time">
      <Breadcrumb items={[
        { label: 'My visits', href: '/visits' },
        { label: 'Visit', href: `/visits/${id}` },
        { label: 'Reschedule' },
      ]} />
      <Progress value={75} label="Reschedule flow" showValue />
      {error && <Alert variant="error">{error}</Alert>}
      <DatePicker label="Filter by date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
      <Card padding="lg">
        <CardContent>
          <div className="time-slot-grid">
            {visible.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`time-slot ${selected?.id === slot.id ? 'time-slot--selected' : ''}`}
                onClick={() => setSelected(slot)}
              >
                <div>{formatSlotTime(slot.startTime)}</div>
                <div style={{ fontSize: 'var(--cc-text-xs)', opacity: 0.8 }}>{slot.provider}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate(`/visits/${id}`)}>Cancel</Button>
        <Button variant="primary" disabled={!selected} loading={loading} onClick={confirm}>Confirm New Time</Button>
      </div>
    </PortalPage>
  );
}
