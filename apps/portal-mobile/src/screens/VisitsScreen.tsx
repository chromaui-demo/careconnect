import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@careconnect/api-client';
import {
  Alert, Badge, Button, Card, EmptyState, ListRow, LoadingState, Screen, StatCard, Text,
  appointmentStatusBadge, formatStatusLabel, space,
} from '@careconnect/design-system-native';
import { formatDateTime } from '../lib/format';

export interface VisitsScreenProps {
  appointments: Appointment[];
  loading?: boolean;
  error?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenVisit: (id: string) => void;
  onBook: () => void;
}

export const isUpcoming = (a: Appointment) => a.status === 'prebooked' || a.status === 'in-office';

function VisitGroup({ title, visits, onOpenVisit }: { title: string; visits: Appointment[]; onOpenVisit?: (id: string) => void }) {
  return (
    <View style={styles.group}>
      <Text variant="heading">{title}</Text>
      <Card padding="none">
        {visits.map((a, i) => (
          <ListRow
            key={a.id}
            overline={formatDateTime(a.scheduledTime).toUpperCase()}
            title={a.reasonForVisit}
            subtitle={`${a.provider} · ${a.serviceMode === 'virtual' ? 'Video visit' : a.location}`}
            trailing={<Badge variant={appointmentStatusBadge(a.status)} dot>{formatStatusLabel(a.status)}</Badge>}
            onPress={onOpenVisit ? () => onOpenVisit(a.id) : undefined}
            last={i === visits.length - 1}
          />
        ))}
      </Card>
    </View>
  );
}

export function VisitsScreen({ appointments, loading, error, refreshing, onRefresh, onOpenVisit, onBook }: VisitsScreenProps) {
  if (loading) return <LoadingState label="Loading your visits…" />;

  const upcoming = appointments.filter(isUpcoming);
  const past = appointments.filter((a) => !isUpcoming(a));
  const completed = past.filter((a) => a.status === 'completed').length;

  return (
    <Screen
      title="My Visits"
      subtitle="Upcoming and past appointments"
      headerAction={<Button size="sm" onPress={onBook}>Book</Button>}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <View style={styles.stats}>
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Cancelled" value={past.length - completed} />
      </View>
      {upcoming.length > 0 ? (
        <VisitGroup title="Upcoming" visits={upcoming} onOpenVisit={onOpenVisit} />
      ) : (
        <EmptyState icon="📅" title="No upcoming visits" description="Book in-person or virtual care in a few taps." action={<Button onPress={onBook}>Book a visit</Button>} />
      )}
      {past.length > 0 ? <VisitGroup title="Past visits" visits={past} onOpenVisit={onOpenVisit} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space[2] },
  group: { gap: space[2] },
});
