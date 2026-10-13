import { StyleSheet } from 'react-native';
import { Alert, Badge, Button, Card, ListRow, Screen, StepProgress, Text } from '@careconnect/design-system-native';
import type { BookingDraft } from '../../booking/BookingContext';
import { formatDateTime } from '../../lib/format';

export interface ReviewScreenProps {
  draft: BookingDraft;
  submitting?: boolean;
  error?: string;
  onConfirm: () => void;
  onBack: () => void;
}

/** Step 4 of 4 — confirm and book. */
export function ReviewScreen({ draft, submitting, error, onConfirm, onBack }: ReviewScreenProps) {
  const virtual = draft.mode === 'virtual';
  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button variant="ghost" disabled={submitting} onPress={onBack}>Back</Button>
          <Button variant="accent" style={styles.grow} loading={submitting} onPress={onConfirm}>Confirm appointment</Button>
        </>
      }
    >
      <StepProgress current={4} total={4} label="Review" />
      <Text variant="title">Review your appointment</Text>
      {error ? <Alert tone="error" title="Couldn’t book this time">{error}</Alert> : null}
      <Badge variant={virtual ? 'info' : 'default'}>{virtual ? 'Virtual' : 'In person'}</Badge>
      <Card padding="none">
        <ListRow subtitle="Reason" title={draft.reason} />
        <ListRow subtitle="When" title={draft.slot ? formatDateTime(draft.slot.startTime) : 'TBD'} />
        <ListRow subtitle="Provider" title={draft.slot?.provider ?? 'First available'} />
        <ListRow subtitle="Where" title={virtual ? 'Video visit in this app' : draft.slot?.location ?? draft.location} />
        <ListRow subtitle="Patient" title={`${draft.firstName} ${draft.lastName}`} last />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
