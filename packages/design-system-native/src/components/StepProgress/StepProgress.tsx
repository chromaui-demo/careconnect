import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export interface StepProgressProps {
  /** 1-based index of the current step. */
  current: number;
  total: number;
  label?: string;
}

export function StepProgress({ current, total, label }: StepProgressProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Progress'}
      accessibilityValue={{ min: 1, max: total, now: current, text: `Step ${current} of ${total}` }}
      style={styles.wrapper}
    >
      <View style={styles.track}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, i + 1 < current && styles.done, i + 1 === current && styles.active]}
          />
        ))}
      </View>
      <Text style={styles.caption}>Step {current} of {total}{label ? ` · ${label}` : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space[2] },
  track: { flexDirection: 'row', gap: space[1] },
  segment: { flex: 1, height: 4, borderRadius: radius.full, backgroundColor: colors.border },
  done: { backgroundColor: colors.primary },
  active: { backgroundColor: colors.accent },
  caption: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted },
});
