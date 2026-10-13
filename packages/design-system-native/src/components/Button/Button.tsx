import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';
import { Spinner } from '../Spinner/Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children: string;
}

const palette: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryDark, fg: colors.textInverse },
  secondary: { bg: colors.bgElevated, pressed: colors.bgMuted, fg: colors.text, border: colors.border },
  accent: { bg: colors.accent, pressed: '#C9674E', fg: colors.textInverse },
  ghost: { bg: 'transparent', pressed: colors.primarySubtle, fg: colors.primary },
  danger: { bg: colors.error, pressed: '#CF5B3F', fg: colors.textInverse },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  fullWidth,
  icon,
  style,
  children,
  ...props
}: ButtonProps) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      {...props}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        { backgroundColor: pressed ? p.pressed : p.bg },
        p.border && { borderWidth: 1, borderColor: p.border },
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <Spinner size="sm" color={p.fg} /> : icon}
        <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: p.fg }]}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  sm: { minHeight: 32, paddingHorizontal: space[3] },
  md: { minHeight: 44, paddingHorizontal: space[4] },
  lg: { minHeight: 52, paddingHorizontal: space[6] },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { fontSize: fontSize.base, fontWeight: '600' },
  labelSm: { fontSize: fontSize.sm },
});
