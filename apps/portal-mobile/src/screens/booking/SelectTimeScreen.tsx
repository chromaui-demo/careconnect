import { StyleSheet } from 'react-native';
import type { TimeSlot } from '@careconnect/api-client';
import { Alert, Button, Card, LoadingState, Screen, SlotPicker, StepProgress, Text, space } from '@careconnect/design-system-native';
import { formatDateTime } from '../../lib/format';

export interface SelectTimeScreenProps {
  slots: TimeSlot[];
  loading?: boolean;
  error?: string;
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  onContinue: () => void;
  onBack: () => void;
}

/** Step 2 of 4 — an open slot. */
export function SelectTimeScreen({ slots, loading, error, selected, onSelect, onContinue, onBack }: SelectTimeScreenProps) {
  const open = slots.filter((s) => s.available);
  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button variant="ghost" onPress={onBack}>Back</Button>
          <Button style={styles.grow} disabled={!selected} onPress={onContinue}>Continue</Button>
        </>
      }
    >
      <StepProgress current={2} total={4} label="Choose a time" />
      <Text variant="title">Select a time</Text>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? (
        <LoadingState fill={false} label="Finding open times…" />
      ) : (
        <SlotPicker
          slots={open.map((s) => ({ id: s.id, startTime: s.startTime, detail: s.provider }))}
          selectedId={selected?.id}
          onSelect={(s) => {
            const slot = open.find((o) => o.id === s.id);
            if (slot) onSelect(slot);
          }}
          emptyLabel="No open times this week. Try a virtual visit or call the clinic."
        />
      )}
      {selected ? (
        <Card tone="primary">
          <Text weight="600">{formatDateTime(selected.startTime)}</Text>
          <Text tone="secondary">{selected.provider} · {selected.location}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ grow: { flex: 1 } });
