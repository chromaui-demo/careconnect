import type { MessageThread } from '@careconnect/api-client';
import { Alert, Avatar, Badge, Card, EmptyState, ListRow, LoadingState, Screen } from '@careconnect/design-system-native';
import { formatDate } from '../lib/format';

export interface MessagesScreenProps {
  threads: MessageThread[];
  loading?: boolean;
  error?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenThread: (id: string) => void;
}

export function MessagesScreen({ threads, loading, error, refreshing, onRefresh, onOpenThread }: MessagesScreenProps) {
  if (loading) return <LoadingState label="Loading messages…" />;
  return (
    <Screen title="Messages" subtitle="Secure messaging with your care team" refreshing={refreshing} onRefresh={onRefresh}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {threads.length === 0 && !error ? (
        <EmptyState
          title="No messages yet"
          description="Send a secure message to your provider about care questions, refills, or follow-up."
        />
      ) : (
        <Card padding="none">
          {threads.map((t, i) => (
            <ListRow
              key={t.id}
              leading={<Avatar name={t.providerName} size="sm" />}
              overline={`${t.providerName} · ${formatDate(t.updatedAt)}`}
              title={t.subject}
              subtitle={t.lastPreview}
              trailing={t.unreadCount > 0 ? <Badge variant="info">{`${t.unreadCount} new`}</Badge> : undefined}
              onPress={() => onOpenThread(t.id)}
              last={i === threads.length - 1}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
