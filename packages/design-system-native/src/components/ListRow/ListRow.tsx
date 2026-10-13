import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, space } from '../../tokens/tokens';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Small text above the title, e.g. a date. */
  overline?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Hide the bottom hairline on the last row of a group. */
  last?: boolean;
}

export function ListRow({ title, subtitle, overline, leading, trailing, onPress, last }: ListRowProps) {
  const content = (
    <>
      {leading}
      <View style={styles.body}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing}
      {onPress ? <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">›</Text> : null}
    </>
  );
  const rowStyle = [styles.row, !last && styles.divider];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[overline, title, subtitle].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: colors.bgElevated,
    minHeight: 56,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.bgMuted },
  body: { flex: 1, gap: 2 },
  overline: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  title: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: space[1] },
});
