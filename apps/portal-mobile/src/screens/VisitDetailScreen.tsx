import { StyleSheet, View } from 'react-native';
import type { Appointment, PaperworkProgress } from '@careconnect/api-client';
import {
  Badge, Button, Card, ListRow, LoadingState, Screen, Text, appointmentStatusBadge, colors, formatStatusLabel, space,
} from '@careconnect/design-system-native';
import { formatDateTime } from '../lib/format';

export type VisitAction = 'check-in' | 'cancel';

export interface VisitDetailScreenProps {
  appointment: Appointment | null;
  paperwork?: PaperworkProgress | null;
  /** The action currently in flight, to show its button as loading. */
  pending?: VisitAction | null;
  onAction: (action: VisitAction) => void;
}

export function VisitDetailScreen({ appointment: appt, paperwork, pending, onAction }: VisitDetailScreenProps) {
  if (!appt) return <LoadingState label="Loading visit…" />;

  const isVirtual = appt.serviceMode === 'virtual';
  const prebooked = appt.status === 'prebooked';
  const canCheckIn = prebooked && !isVirtual;

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.header}>
        <Badge variant={appointmentStatusBadge(appt.status)} dot>{formatStatusLabel(appt.status)}</Badge>
        <Text variant="title">{appt.reasonForVisit}</Text>
      </View>

      <Card padding="none">
        <ListRow title={formatDateTime(appt.scheduledTime)} subtitle="When" />
        <ListRow title={appt.provider} subtitle="Provider" />
        <ListRow title={isVirtual ? 'Video visit' : appt.location} subtitle={isVirtual ? 'Join from this app' : 'Location'} last />
      </Card>

      {paperwork && !paperwork.complete && prebooked ? (
        <Card tone="warning" elevated padding="lg">
          <View style={styles.callout}>
            <Text weight="700">Intake paperwork incomplete ({paperwork.percent}%)</Text>
            <Text tone="secondary">Complete all forms before your visit for faster check-in.</Text>
          </View>
        </Card>
      ) : null}
      {paperwork?.complete ? (
        <Card tone="success"><Text>✓ All intake paperwork complete</Text></Card>
      ) : null}

      {paperwork ? (
        <View style={styles.group}>
          <Text variant="heading">Paperwork</Text>
          <Card padding="none">
            {paperwork.steps.map((s, i) => (
              <ListRow
                key={s.id}
                leading={<Text style={{ color: s.completed ? colors.success : colors.textMuted }}>{s.completed ? '✓' : '○'}</Text>}
                title={s.title}
                subtitle={s.completed ? 'Done' : 'To do'}
                last={i === paperwork.steps.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}

      {prebooked ? (
        <View style={styles.actions}>
          {canCheckIn ? (
            <Button size="lg" fullWidth loading={pending === 'check-in'} disabled={!!pending} onPress={() => onAction('check-in')}>
              Check in
            </Button>
          ) : null}
          <Button variant="ghost" fullWidth loading={pending === 'cancel'} disabled={!!pending} onPress={() => onAction('cancel')}>
            Cancel visit
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[2] },
  callout: { gap: space[2] },
  group: { gap: space[2] },
  actions: { gap: space[2] },
});
