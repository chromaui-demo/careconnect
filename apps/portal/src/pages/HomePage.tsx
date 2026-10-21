import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Appointment, type PortalBillingSummary, type PortalLabResult, type RefillRequest } from '@careconnect/api-client';
import { AttentionSummary, type AttentionItem } from '@careconnect/design-system';

interface HomeData {
  appointments?: Appointment[];
  results?: PortalLabResult[];
  unreadMessages?: number;
  billing?: PortalBillingSummary;
  refills?: RefillRequest[];
}

const SOURCES = ['visits', 'test results', 'messages', 'billing', 'refill requests'] as const;

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function buildItems(data: HomeData, go: (path: string) => void): AttentionItem[] {
  const items: AttentionItem[] = [];

  const next = (data.appointments ?? [])
    .filter((a) => a.status === 'prebooked' || a.status === 'in-office')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))[0];
  if (next) {
    const when = new Date(next.scheduledTime);
    items.push({
      id: 'visit',
      label: 'Next visit',
      value: when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      detail: `${when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · ${next.provider} · ${next.reasonForVisit}`,
      actionLabel: 'View visit',
      onAction: () => go(`/visits/${next.id}`),
    });
  }

  const abnormal = (data.results ?? []).filter((r) => r.abnormal);
  if (abnormal.length > 0) {
    const first = abnormal[0];
    const value = first.resultValue != null ? ` · ${first.resultValue}${first.resultUnit ? ` ${first.resultUnit}` : ''}` : '';
    items.push({
      id: 'results',
      label: 'Results to review',
      value: abnormal.length,
      detail: abnormal.length === 1 ? `${first.testName}${value}` : `${first.testName} and ${abnormal.length - 1} more`,
      actionLabel: 'View results',
      onAction: () => go('/results'),
    });
  }

  if (data.unreadMessages) {
    items.push({
      id: 'messages',
      label: 'Unread messages',
      value: data.unreadMessages,
      detail: 'From your care team',
      actionLabel: 'Open messages',
      onAction: () => go('/messages'),
    });
  }

  if (data.billing && data.billing.balance > 0) {
    items.push({
      id: 'balance',
      label: 'Balance due',
      value: formatMoney(data.billing.balance),
      actionLabel: 'Pay bill',
      onAction: () => go('/bills'),
    });
  }

  const pending = (data.refills ?? []).filter((r) => r.status === 'pending');
  if (pending.length > 0) {
    items.push({
      id: 'refills',
      label: 'Refills in progress',
      value: pending.length,
      detail: pending.map((r) => r.medication).join(', '),
      actionLabel: 'View medications',
      onAction: () => go('/medications'),
    });
  }

  return items;
}

export function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData>({});
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Each source loads on its own, so one failing request never blanks the page.
  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.getAppointments(),
      api.portal.getLabResults(),
      api.portal.getMessagesUnreadCount(),
      api.portal.getBilling(),
      api.portal.getRefillRequests(),
    ]).then(([appointments, results, unread, billing, refills]) => {
      const settled = [appointments, results, unread, billing, refills];
      setData({
        appointments: appointments.status === 'fulfilled' ? appointments.value : undefined,
        results: results.status === 'fulfilled' ? results.value : undefined,
        unreadMessages: unread.status === 'fulfilled' ? unread.value.count : undefined,
        billing: billing.status === 'fulfilled' ? billing.value : undefined,
        refills: refills.status === 'fulfilled' ? refills.value : undefined,
      });
      setUnavailable(SOURCES.filter((_, i) => settled[i].status === 'rejected'));
      setLoading(false);
    });
  }, []);

  useEffect(load, [load]);

  const cards = [
    { icon: '🏥', title: 'Book Appointment', desc: 'Choose in-person or virtual care', path: '/book/service' },
    { icon: '💻', title: 'Virtual Visit', desc: 'See a provider from home', path: '/book?mode=virtual' },
    { icon: '🚶', title: 'Walk-In', desc: 'Register for urgent care', path: '/walk-in' },
    { icon: '📋', title: 'My Visits', desc: 'Upcoming and past appointments', path: '/visits' },
    { icon: '💊', title: 'Medications', desc: 'View prescriptions and request refills', path: '/medications' },
    { icon: '🧪', title: 'Test Results', desc: 'Lab and diagnostic results', path: '/results' },
    { icon: '✉️', title: 'Messages', desc: 'Secure messaging with your care team', path: '/messages' },
    { icon: '💳', title: 'Pay Bills', desc: 'View balance and pay online', path: '/bills' },
    { icon: '🔄', title: 'Request Refill', desc: 'Submit a medication refill request', path: '/medications/refill' },
    { icon: '👨‍👩‍👧', title: 'My Patients', desc: 'Manage family members on your account', path: '/my-patients' },
  ];

  return (
    <>
      <div className="portal-hero">
        <h1>Welcome to CareConnect</h1>
        <p>Book visits, view results, message your care team, manage medications, and pay bills — all in one place.</p>
      </div>

      <div className="portal-attention">
        <AttentionSummary
          items={buildItems(data, navigate)}
          unavailable={unavailable}
          onRetry={load}
          loading={loading}
        />
      </div>

      <div className="portal-cards">
        {cards.map((c) => (
          <button key={c.path} type="button" className="portal-card-option" onClick={() => navigate(c.path)}>
            <span style={{ fontSize: '2rem' }}>{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </button>
        ))}
      </div>
    </>
  );
}
