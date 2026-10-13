import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type TimeSlot } from '@careconnect/api-client';
import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  Progress,
  ScheduleCalendar,
  type ScheduleEvent,
} from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function SelectTimePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const params = searchParams.toString();

  useEffect(() => {
    api.getSlots().then(setSlots);
  }, []);

  const events: ScheduleEvent[] = useMemo(() => slots.filter((s) => s.available).map((slot) => ({
    id: slot.id,
    title: `${slot.provider} · ${new Date(slot.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    start: slot.startTime,
    end: slot.endTime,
  })), [slots]);

  return (
    <PortalPage title="Select a Time" subtitle="Step 2 of 4 — choose an available slot">
      <Breadcrumb items={[
        { label: 'Book', href: '/book' },
        { label: 'Time' },
      ]} />
      <Progress value={50} label="Booking progress" showValue />
      <Card padding="lg">
        <CardContent>
          <ScheduleCalendar
            events={events}
            initialView="timeGridWeek"
            onEventClick={(id) => setSelectedSlot(slots.find((s) => s.id === id) ?? null)}
          />
          {selectedSlot && (
            <p style={{ marginTop: 12 }}>
              Selected: {new Date(selectedSlot.startTime).toLocaleString()} with {selectedSlot.provider}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate(`/book?${params}`)}>Back</Button>
        <Button variant="primary" disabled={!selectedSlot} onClick={() => {
          const p = new URLSearchParams(params);
          if (selectedSlot) {
            p.set('slotTime', selectedSlot.startTime);
            p.set('providerId', selectedSlot.providerId);
            p.set('locationId', selectedSlot.locationId);
          }
          navigate(`/book/info?${p}`);
        }}>Continue</Button>
      </div>
    </PortalPage>
  );
}
