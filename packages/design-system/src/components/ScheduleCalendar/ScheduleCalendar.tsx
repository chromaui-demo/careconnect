import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEffect, useRef } from 'react';
import './ScheduleCalendar.css';

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
}

export interface ScheduleCalendarProps {
  events: ScheduleEvent[];
  initialView?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  /** ISO date the calendar opens on; defaults to today. */
  initialDate?: string;
  height?: number | string;
  onEventClick?: (eventId: string) => void;
}

export function ScheduleCalendar({
  events,
  initialView = 'timeGridWeek',
  initialDate,
  height = 520,
  onEventClick,
}: ScheduleCalendarProps) {
  const ref = useRef<HTMLDivElement>(null);

  // FullCalendar renders its toolbar chevrons as role="img" with no name and
  // has no option to change that. The icons are decorative (each button has a
  // title), so hide them; re-applied whenever FullCalendar re-renders the toolbar.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const patch = () => {
      root.querySelectorAll('.fc-icon[role="img"]').forEach((icon) => {
        icon.removeAttribute('role');
        icon.setAttribute('aria-hidden', 'true');
      });
    };
    patch();
    const observer = new MutationObserver(patch);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="cc-schedule-calendar" ref={ref}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        initialDate={initialDate}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        height={height}
        events={events}
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        allDaySlot={false}
        nowIndicator
        eventClick={(info) => onEventClick?.(info.event.id)}
      />
    </div>
  );
}

export const sampleScheduleEvents: ScheduleEvent[] = [
  { id: '1', title: 'Alice Smith — Follow-up', start: '2026-08-21T09:00:00', end: '2026-08-21T09:30:00', backgroundColor: 'var(--cc-primary)' },
  { id: '2', title: 'Bob Johnson — Telemed', start: '2026-08-21T10:00:00', end: '2026-08-21T10:20:00', backgroundColor: 'var(--cc-info)' },
  { id: '3', title: 'Charlie Williams — New patient', start: '2026-08-21T11:00:00', end: '2026-08-21T11:45:00', backgroundColor: 'var(--cc-accent)' },
  { id: '4', title: 'Diana Lee — Lab review', start: '2026-08-22T14:00:00', end: '2026-08-22T14:15:00', backgroundColor: 'var(--cc-success)' },
];
