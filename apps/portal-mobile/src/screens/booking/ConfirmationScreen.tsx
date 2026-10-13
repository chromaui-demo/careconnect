import { StyleSheet, View } from 'react-native';
import { Button, Screen, Text, colors, space } from '@careconnect/design-system-native';
import { formatDateTime } from '../../lib/format';

export interface ConfirmationScreenProps {
  scheduledTime?: string;
  provider?: string;
  onViewVisit: () => void;
  onDone: () => void;
}

export function ConfirmationScreen({ scheduledTime, provider, onViewVisit, onDone }: ConfirmationScreenProps) {
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.check} accessibilityElementsHidden importantForAccessibility="no">
          <Text variant="display" tone="inverse">✓</Text>
        </View>
        <Text variant="title" align="center">Appointment confirmed</Text>
        {scheduledTime ? (
          <Text align="center" weight="600">{formatDateTime(scheduledTime)}{provider ? ` with ${provider}` : ''}</Text>
        ) : null}
        <Text tone="secondary" align="center">
          Your appointment has been booked. Please complete your intake paperwork before your visit.
        </Text>
        <View style={styles.actions}>
          <Button size="lg" fullWidth onPress={onViewVisit}>View visit details</Button>
          <Button variant="secondary" size="lg" fullWidth onPress={onDone}>Back to home</Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space[3], paddingTop: space[12] },
  check: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: space[2],
  },
  actions: { alignSelf: 'stretch', gap: space[2], marginTop: space[4] },
});
