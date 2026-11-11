import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';
import './PatientBanner.css';

export type AllergySeverity = 'severe' | 'moderate' | 'mild';

export interface PatientAllergy {
  substance: string;
  reaction: string;
  severity: AllergySeverity;
}

const severityOrder: Record<AllergySeverity, number> = { severe: 0, moderate: 1, mild: 2 };
const severityLabel: Record<AllergySeverity, string> = { severe: 'Severe', moderate: 'Moderate', mild: 'Mild' };

export interface PatientBannerProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  mrn: string;
  dob: string;
  age: number;
  sex: string;
  status?: 'in-office' | 'prebooked' | 'completed' | 'cancelled';
  alerts?: string[];
  allergies?: PatientAllergy[];
  actions?: ReactNode;
}

export function PatientBanner({
  name,
  mrn,
  dob,
  age,
  sex,
  status = 'in-office',
  alerts = [],
  allergies = [],
  actions,
  className,
  ...props
}: PatientBannerProps) {
  return (
    <div className={clsx('cc-patient-banner', className)} {...props}>
      <Avatar name={name} size="lg" />
      <div className="cc-patient-banner__info">
        <div className="cc-patient-banner__row">
          <h2 className="cc-patient-banner__name">{name}</h2>
          <Badge variant={status} dot>{status.replace('-', ' ')}</Badge>
        </div>
        <p className="cc-patient-banner__meta">
          MRN {mrn} · DOB {dob} ({age}y) · {sex}
        </p>
        {(allergies.length > 0 || alerts.length > 0) && (
          <div className="cc-patient-banner__alerts">
            {[...allergies]
              .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
              .map((a) => (
                <span
                  key={a.substance}
                  className={a.severity === 'severe' ? 'cc-patient-banner__alert' : 'cc-patient-banner__allergy'}
                >
                  <strong>{severityLabel[a.severity]}</strong> · {a.substance} — {a.reaction}
                </span>
              ))}
            {alerts.map((a) => (
              <span key={a} className="cc-patient-banner__alert">{a}</span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="cc-patient-banner__actions">{actions}</div>}
    </div>
  );
}
