import { StyleSheet, View } from 'react-native';
import { Button, Screen, StepProgress, Text, TextField, space } from '@careconnect/design-system-native';
import type { BookingDraft } from '../../booking/BookingContext';

export interface PatientInfoScreenProps {
  draft: Pick<BookingDraft, 'firstName' | 'lastName' | 'dateOfBirth' | 'phone' | 'email' | 'reason'>;
  onChange: (patch: Partial<BookingDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const DOB = /^\d{4}-\d{2}-\d{2}$/;

/** Step 3 of 4 — who the visit is for (pre-filled from the signed-in patient). */
export function PatientInfoScreen({ draft, onChange, onContinue, onBack }: PatientInfoScreenProps) {
  const dobError = draft.dateOfBirth && !DOB.test(draft.dateOfBirth) ? 'Use YYYY-MM-DD' : undefined;
  const ready = !!draft.firstName && !!draft.lastName && DOB.test(draft.dateOfBirth);
  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <>
          <Button variant="ghost" onPress={onBack}>Back</Button>
          <Button style={styles.grow} disabled={!ready} onPress={onContinue}>Continue</Button>
        </>
      }
    >
      <StepProgress current={3} total={4} label="Your information" />
      <Text variant="title">Your information</Text>
      <View style={styles.row}>
        <View style={styles.grow}>
          <TextField label="First name" value={draft.firstName} onChangeText={(firstName) => onChange({ firstName })} autoComplete="given-name" />
        </View>
        <View style={styles.grow}>
          <TextField label="Last name" value={draft.lastName} onChangeText={(lastName) => onChange({ lastName })} autoComplete="family-name" />
        </View>
      </View>
      <TextField
        label="Date of birth"
        value={draft.dateOfBirth}
        onChangeText={(dateOfBirth) => onChange({ dateOfBirth })}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        error={dobError}
      />
      <TextField label="Phone" value={draft.phone} onChangeText={(phone) => onChange({ phone })} keyboardType="phone-pad" autoComplete="tel" />
      <TextField label="Email" value={draft.email} onChangeText={(email) => onChange({ email })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Reason for visit" value={draft.reason} editable={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  grow: { flex: 1 },
});
