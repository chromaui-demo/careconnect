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
  /** Text of the button that opens the item's page, e.g. "View results". */
  actionLabel: string;
  onAction: () => void;
  /** Highlight items the patient has to act on, such as results to review or a balance due. */
  needsAction?: boolean;
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
              <StatCard label={item.label} value={item.value} delta={item.detail} tone={item.needsAction ? 'attention' : 'default'} />
              <Button variant="ghost" size="sm" onClick={item.onAction}>{item.actionLabel}</Button>
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
