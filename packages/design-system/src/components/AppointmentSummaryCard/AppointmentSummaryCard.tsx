import clsx from 'clsx';
import { useId, type HTMLAttributes } from 'react';
import { Button } from '../Button';
import { Card } from '../Card';
import './AppointmentSummaryCard.css';

export interface AppointmentSummary {
  id: string;
  reason: string;
  /** Preformatted labels keep the caller in control of locale and time zone. */
  dateLabel: string;
  timeLabel: string;
  /** ISO date-time for the semantic time element. */
  dateTime: string;
  provider: string;
  location: string;
  serviceMode: 'in-person' | 'virtual';
}

export interface AppointmentSummaryCardProps extends HTMLAttributes<HTMLDivElement> {
  appointment: AppointmentSummary;
  onViewVisit: (id: string) => void;
}

/** A patient-facing visit summary composed from the shared Card and Button. */
export function AppointmentSummaryCard({ appointment, onViewVisit, className, ...props }: AppointmentSummaryCardProps) {
  const headingId = useId();

  return (
    <Card padding="lg" className={clsx('cc-appointment-summary', className)} {...props}>
      <section aria-labelledby={headingId}>
        <p className="cc-appointment-summary__eyebrow">Next visit</p>
        <h3 id={headingId} className="cc-appointment-summary__title">{appointment.reason}</h3>
        <p className="cc-appointment-summary__date">
          <time dateTime={appointment.dateTime}>{appointment.dateLabel} · {appointment.timeLabel}</time>
        </p>
        <dl className="cc-appointment-summary__facts">
          <div><dt>Provider</dt><dd>{appointment.provider}</dd></div>
          <div><dt>{appointment.serviceMode === 'virtual' ? 'Visit type' : 'Location'}</dt><dd>{appointment.location}</dd></div>
        </dl>
        <div className="cc-appointment-summary__actions">
          <Button variant="primary" onClick={() => onViewVisit(appointment.id)}>View visit</Button>
        </div>
      </section>
    </Card>
  );
}
