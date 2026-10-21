import { useId } from 'react';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { Skeleton } from '../Skeleton';
import { StatCard } from '../StatCard';
import './AttentionSummary.css';

export interface AttentionItem {
  /** Stable key, e.g. `results`. */
  id: string;
  /** What needs attention, e.g. "Results to review". */
  label: string;
  /** The headline: a count, an amount or a date. */
  value: string | number;
  /** One line of context under the value. */
  detail?: string;
  /** What the button does, e.g. "View results". */
  actionLabel: string;
  onAction: () => void;
}

export interface AttentionSummaryProps {
  /** Section heading. */
  title?: string;
  /** Only the things that need the patient; leave out anything with nothing due. */
  items: AttentionItem[];
  /** Data sources that failed to load, in plain words, e.g. `['billing']`. Items that did load still show. */
  unavailable?: string[];
  onRetry?: () => void;
  loading?: boolean;
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** The patient portal's home summary: what needs the patient's attention, each with a way to act on it. */
export function AttentionSummary({
  title = 'Needs your attention',
  items,
  unavailable = [],
  onRetry,
  loading,
}: AttentionSummaryProps) {
  const headingId = useId();

  return (
    <section className="cc-attention" aria-labelledby={headingId} aria-busy={loading || undefined}>
      <h2 id={headingId} className="cc-attention__title">{title}</h2>
      {unavailable.length > 0 && (
        <Alert
          variant="warning"
          title="Some of your information didn’t load"
          action={onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}
        >
          We couldn’t load your {joinWords(unavailable)} right now. Everything else here is up to date.
        </Alert>
      )}
      {loading ? (
        <div className="cc-grid-auto cc-grid-auto--4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={112} />)}
        </div>
      ) : items.length > 0 ? (
        <div className="cc-grid-auto cc-grid-auto--4">
          {items.map((item) => (
            <div key={item.id} className="cc-attention__item">
              <StatCard label={item.label} value={item.value} delta={item.detail} />
              <button type="button" className="cc-attention__go" onClick={item.onAction}>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M3 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : unavailable.length === 0 ? (
        <Alert variant="success" title="You’re all caught up">
          Nothing needs your attention right now.
        </Alert>
      ) : null}
    </section>
  );
}
