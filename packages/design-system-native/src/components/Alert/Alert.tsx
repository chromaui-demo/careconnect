import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}

const palette: Record<AlertTone, { bg: string; border: string; fg: string }> = {
  info: { bg: colors.primarySubtle, border: colors.primary, fg: colors.primaryDark },
  success: { bg: colors.successSubtle, border: colors.success, fg: colors.successText },
  warning: { bg: colors.warningSubtle, border: colors.warning, fg: colors.warningText },
  error: { bg: colors.errorSubtle, border: colors.error, fg: colors.errorText },
};

export function Alert({ tone = 'info', title, children }: AlertProps) {
  const p = palette[tone];
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.alert, { backgroundColor: p.bg, borderLeftColor: p.border }]}
    >
      {title ? <Text style={[styles.title, { color: p.fg }]}>{title}</Text> : null}
      {typeof children === 'string' ? <Text style={[styles.body, { color: p.fg }]}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { padding: space[3], borderRadius: radius.md, borderLeftWidth: 4, gap: space[1] },
  title: { fontSize: fontSize.sm, fontWeight: '700' },
  body: { fontSize: fontSize.sm, lineHeight: 20 },
});
