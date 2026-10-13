import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export interface ChipGroupProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}

/** Single-select pills for short option lists, such as a visit reason. */
export function ChipGroup({ label, options, value, onChange }: ChipGroupProps) {
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option)}
              style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed]}
            >
              <Text style={[styles.chipLabel, selected && styles.selectedLabel]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space[2] },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.bgMuted },
  chipLabel: { fontSize: fontSize.sm, color: colors.text },
  selectedLabel: { color: colors.textInverse, fontWeight: '600' },
});
