import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export interface StatCardProps {
  label: string;
  value: string | number;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ label, value, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 72,
    padding: space[3],
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { marginTop: space[1], fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
});
