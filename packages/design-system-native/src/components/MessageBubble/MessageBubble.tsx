import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export interface MessageBubbleProps {
  body: string;
  /** Who sent it, as shown above the text, e.g. "You" or "Dr. Patel". */
  sender: string;
  timestamp: string;
  /** Outgoing messages align right on the brand tint. */
  outgoing?: boolean;
}

export function MessageBubble({ body, sender, timestamp, outgoing }: MessageBubbleProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${sender}, ${timestamp}: ${body}`}
      style={[styles.bubble, outgoing ? styles.outgoing : styles.incoming]}
    >
      <Text style={styles.meta}>{sender} · {timestamp}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', padding: space[3], borderRadius: radius.lg, gap: space[1] },
  incoming: {
    alignSelf: 'flex-start', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  outgoing: { alignSelf: 'flex-end', backgroundColor: colors.primarySubtle, borderBottomRightRadius: radius.sm },
  meta: { fontSize: fontSize.xs, color: colors.textMuted },
  body: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
});
