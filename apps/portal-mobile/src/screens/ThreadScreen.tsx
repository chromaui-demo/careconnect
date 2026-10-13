import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import type { MessageThreadDetail } from '@careconnect/api-client';
import { Alert, Button, LoadingState, MessageBubble, Screen, Text, TextField, space } from '@careconnect/design-system-native';
import { formatShortDateTime } from '../lib/format';

export interface ThreadScreenProps {
  thread: MessageThreadDetail | null;
  reply: string;
  onReplyChange: (v: string) => void;
  onSend: () => void;
  sending?: boolean;
  /** Result of the last send, shown above the composer. */
  notice?: { tone: 'success' | 'error'; text: string } | null;
}

export function ThreadScreen({ thread, reply, onReplyChange, onSend, sending, notice }: ThreadScreenProps) {
  if (!thread) return <LoadingState label="Loading conversation…" />;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <Screen
        edges={['left', 'right']}
        footer={
          <View style={styles.composer}>
            {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
            <TextField label="Reply" multiline value={reply} onChangeText={onReplyChange} placeholder={`Message ${thread.providerName}`} />
            <Button fullWidth loading={sending} disabled={sending || !reply.trim()} onPress={onSend}>Send reply</Button>
          </View>
        }
      >
        <Text variant="caption" tone="secondary">With {thread.providerName}</Text>
        <View style={styles.messages}>
          {thread.messages.map((m) => (
            <MessageBubble
              key={m.id}
              outgoing={m.senderRole === 'patient'}
              sender={m.senderRole === 'patient' ? 'You' : thread.providerName}
              timestamp={formatShortDateTime(m.createdAt)}
              body={m.body}
            />
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { gap: space[3] },
  composer: { flex: 1, gap: space[2], paddingBottom: space[3] },
});
