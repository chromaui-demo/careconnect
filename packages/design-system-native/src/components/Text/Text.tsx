import type { ReactNode } from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, fontSize } from '../../tokens/tokens';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'label';
export type TextTone = 'default' | 'secondary' | 'muted' | 'inverse' | 'primary' | 'error';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  children: ReactNode;
}

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  inverse: colors.textInverse,
  primary: colors.primary,
  error: colors.error,
};

export function Text({ variant = 'body', tone = 'default', weight, align, style, children, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      accessibilityRole={variant === 'display' || variant === 'title' || variant === 'heading' ? 'header' : props.accessibilityRole}
      style={[styles[variant], { color: toneColor[tone] }, weight && { fontWeight: weight }, align && { textAlign: align }, style]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: fontSize['3xl'], fontWeight: '700', lineHeight: 36 },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', lineHeight: 30 },
  heading: { fontSize: fontSize.lg, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: fontSize.base, lineHeight: 22 },
  caption: { fontSize: fontSize.sm, lineHeight: 18 },
  label: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});
