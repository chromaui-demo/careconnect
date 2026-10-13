import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export interface OptionCardProps {
  title: string;
  description?: string;
  /** An emoji or short glyph, as on the web portal's home tiles. */
  icon?: string;
  selected?: boolean;
  /** `radio` for a choice in a group; `button` for navigation tiles. */
  role?: 'button' | 'radio';
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function OptionCard({ title, description, icon, selected, role = 'button', onPress, style }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: !!selected } : undefined}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed, style]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {role === 'radio' ? (
        <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  selected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySubtle },
  pressed: { backgroundColor: colors.bgMuted },
  icon: { fontSize: 28 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  description: { fontSize: fontSize.sm, color: colors.textSecondary },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
