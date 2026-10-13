import { StyleSheet, View } from 'react-native';
import { Button, ChipGroup, OptionCard, Screen, StepProgress, Text, space } from '@careconnect/design-system-native';
import { LOCATIONS, REASONS, type BookingDraft } from '../../booking/BookingContext';

export interface BookVisitScreenProps {
  draft: Pick<BookingDraft, 'mode' | 'reason' | 'location' | 'visitType'>;
  onChange: (patch: Partial<BookingDraft>) => void;
  onContinue: () => void;
  onCancel: () => void;
}

/** Step 1 of 4 — how, why and where. */
export function BookVisitScreen({ draft, onChange, onContinue, onCancel }: BookVisitScreenProps) {
  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button variant="ghost" onPress={onCancel}>Cancel</Button>
          <Button style={styles.grow} disabled={!draft.reason} onPress={onContinue}>Continue</Button>
        </>
      }
    >
      <StepProgress current={1} total={4} label="Visit details" />
      <Text variant="title">{draft.mode === 'virtual' ? 'Book a virtual visit' : 'Book an in-person visit'}</Text>
      <Text tone="secondary">Tell us about your visit so we can match you with the right provider.</Text>

      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Visit mode">
        <Text variant="caption" weight="600">How would you like to be seen?</Text>
        <OptionCard role="radio" icon="🏥" title="In person" description="Visit a clinic location" selected={draft.mode === 'in-person'} onPress={() => onChange({ mode: 'in-person' })} />
        <OptionCard role="radio" icon="💻" title="Virtual" description="Video visit from home" selected={draft.mode === 'virtual'} onPress={() => onChange({ mode: 'virtual' })} />
      </View>

      <ChipGroup label="Reason for visit" options={REASONS} value={draft.reason || null} onChange={(reason) => onChange({ reason })} />

      {draft.mode === 'in-person' ? (
        <ChipGroup label="Preferred location" options={LOCATIONS} value={draft.location} onChange={(location) => onChange({ location })} />
      ) : null}

      <ChipGroup
        label="Visit type"
        options={['New patient', 'Follow-up']}
        value={draft.visitType === 'new' ? 'New patient' : 'Follow-up'}
        onChange={(v) => onChange({ visitType: v === 'New patient' ? 'new' : 'followup' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  grow: { flex: 1 },
});
