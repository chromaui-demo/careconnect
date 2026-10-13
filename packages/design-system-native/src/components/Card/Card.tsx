import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from '../../tokens/tokens';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardTone = 'default' | 'warning' | 'success' | 'primary';

export interface CardProps {
  padding?: CardPadding;
  elevated?: boolean;
  /** Adds a colored leading edge, like the web portal's highlighted cards. */
  tone?: CardTone;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

const paddingFor: Record<CardPadding, number> = { none: 0, sm: space[3], md: space[4], lg: space[6] };
const toneColor: Record<Exclude<CardTone, 'default'>, string> = {
  warning: colors.warning,
  success: colors.success,
  primary: colors.primary,
};

export function Card({ padding = 'md', elevated, tone = 'default', onPress, accessibilityLabel, style, children }: CardProps) {
  const cardStyle = [
    styles.card,
    { padding: paddingFor[padding] },
    elevated && shadow.md,
    tone !== 'default' && { borderLeftWidth: 4, borderLeftColor: toneColor[tone] },
    style,
  ];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.bgMuted },
});
