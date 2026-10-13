import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';
import type { BadgeVariant } from './status';

export type { BadgeVariant } from './status';
export { appointmentStatusBadge, formatStatusLabel } from './status';

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  children: string | number;
}

// Same pairs as packages/design-system/src/components/Badge/Badge.css.
const palette: Record<BadgeVariant, { bg: string; fg: string }> = {
  default: { bg: colors.bgMuted, fg: colors.textSecondary },
  success: { bg: colors.successSubtle, fg: colors.successText },
  completed: { bg: colors.successSubtle, fg: colors.successText },
  warning: { bg: colors.warningSubtle, fg: colors.warningText },
  prebooked: { bg: '#EDE9FE', fg: '#6D28D9' },
  error: { bg: colors.errorSubtle, fg: colors.errorText },
  cancelled: { bg: colors.errorSubtle, fg: colors.errorText },
  info: { bg: colors.primarySubtle, fg: colors.primaryText },
  'in-office': { bg: colors.primarySubtle, fg: colors.primaryText },
};

export function Badge({ variant = 'default', dot, style, children }: BadgeProps) {
  const p = palette[variant];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: p.fg }]} />}
      <Text style={[styles.label, { color: p.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    paddingVertical: 2,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 0.24 },
});
