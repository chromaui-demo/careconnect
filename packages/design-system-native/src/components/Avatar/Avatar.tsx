import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../tokens/tokens';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
}

const dimension: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56 };

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const d = dimension[size];
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={[styles.avatar, { width: d, height: d, borderRadius: d / 2 }]}
    >
      <Text style={[styles.text, { fontSize: d * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.primary, fontWeight: '700' },
});
