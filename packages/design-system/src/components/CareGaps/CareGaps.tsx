import clsx from 'clsx';
import type { HTMLAttributes } from 'react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card, CardContent, CardHeader, CardTitle } from '../Card';
import './CareGaps.css';

export interface CareGap {
  id: string;
  /** What is due, e.g. "Colorectal cancer screening". */
  title: string;
  /** When it was last done or became due, e.g. "Last done Mar 2021". */
  detail: string;
  status: 'overdue' | 'due-soon';
}

export interface CareGapsProps extends HTMLAttributes<HTMLDivElement> {
  gaps: CareGap[];
  onAddress?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function CareGaps({ gaps, onAddress, onDismiss, className, ...props }: CareGapsProps) {
  return (
    <Card className={clsx('cc-care-gaps', className)} {...props}>
      <CardHeader>
        <CardTitle>Care gaps</CardTitle>
        {gaps.length > 0 && <Badge>{gaps.length} open</Badge>}
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <p className="cc-care-gaps__empty">No open care gaps.</p>
        ) : (
          <ul className="cc-care-gaps__list">
            {gaps.map((gap) => (
              <li key={gap.id} className="cc-care-gaps__item">
                <div className="cc-care-gaps__text">
                  <span className="cc-care-gaps__title">{gap.title}</span>
                  <span className="cc-care-gaps__detail">{gap.detail}</span>
                </div>
                <Badge variant={gap.status === 'overdue' ? 'warning' : 'info'}>
                  {gap.status === 'overdue' ? 'Overdue' : 'Due soon'}
                </Badge>
                <div className="cc-care-gaps__actions">
                  <Button variant="ghost" size="sm" onClick={() => onAddress?.(gap.id)}>
                    Mark addressed
                  </Button>
                  <button
                    type="button"
                    className="cc-care-gaps__dismiss"
                    aria-label={`Dismiss ${gap.title}`}
                    onClick={() => onDismiss?.(gap.id)}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
