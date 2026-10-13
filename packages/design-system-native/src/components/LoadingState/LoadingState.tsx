import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, space } from '../../tokens/tokens';
import { Spinner } from '../Spinner/Spinner';

export interface LoadingStateProps {
  label?: string;
  /** Fill the parent and center, for full-screen loading. */
  fill?: boolean;
}

export function LoadingState({ label = 'Loading…', fill = true }: LoadingStateProps) {
  return (
    <View style={[styles.wrapper, fill && styles.fill]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Spinner size="lg" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  fill: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
});
