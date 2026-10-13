import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, space } from '../../tokens/tokens';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">{icon}</Text>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: space[10], paddingHorizontal: space[6], gap: space[2] },
  icon: { fontSize: 40 },
  title: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, textAlign: 'center' },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  action: { marginTop: space[3] },
});
