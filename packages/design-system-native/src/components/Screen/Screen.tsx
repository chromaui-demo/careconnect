import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, fontSize, space } from '../../tokens/tokens';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Rendered beside the title, e.g. a small action button. */
  headerAction?: ReactNode;
  /** Pinned below the scroll area — the primary action on form steps. */
  footer?: ReactNode;
  /** Wrap the content in a ScrollView (default). Turn off for lists that scroll themselves. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Safe-area edges to pad; drop 'top' under a navigation header. */
  edges?: Edge[];
  children: ReactNode;
}

export function Screen({
  title,
  subtitle,
  headerAction,
  footer,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right'],
  children,
}: ScreenProps) {
  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {headerAction}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>
          {header}
          {children}
        </View>
      )}
      {footer ? <SafeAreaView edges={['bottom']} style={styles.footer}>{footer}</SafeAreaView> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space[4], gap: space[4] },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  headerText: { flex: 1, gap: space[1] },
  title: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
