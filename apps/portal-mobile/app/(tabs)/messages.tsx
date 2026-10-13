import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { api, type MessageThread } from '@careconnect/api-client';
import { MessagesScreen } from '../../src/screens/MessagesScreen';

export default function MessagesRoute() {
  const router = useRouter();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setThreads(await api.portal.getMessages());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <MessagesScreen
      threads={threads}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      onOpenThread={(id) => router.push(`/messages/${id}`)}
    />
  );
}
