import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { api, type MessageThreadDetail } from '@careconnect/api-client';
import { ThreadScreen, type ThreadScreenProps } from '../../src/screens/ThreadScreen';

export default function ThreadRoute() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [thread, setThread] = useState<MessageThreadDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<ThreadScreenProps['notice']>(null);

  const load = useCallback(() => {
    if (threadId) api.portal.getMessageThread(threadId).then(setThread).catch(console.error);
  }, [threadId]);

  useEffect(load, [load]);

  const send = async () => {
    if (!threadId || !reply.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      await api.portal.replyToThread(threadId, reply.trim());
      setReply('');
      setNotice({ tone: 'success', text: 'Reply sent' });
      load();
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: thread?.subject ?? 'Conversation' }} />
      <ThreadScreen thread={thread} reply={reply} onReplyChange={setReply} onSend={send} sending={sending} notice={notice} />
    </>
  );
}
