import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@careconnect/api-client';
import {
  Avatar, Badge, Card, ListRow, OptionCard, Screen, Text, appointmentStatusBadge, formatStatusLabel, space,
} from '@careconnect/design-system-native';
import { formatDateTime } from '../lib/format';

export type HomeDestination = 'book' | 'book-virtual' | 'visits' | 'messages';

export interface HomeScreenProps {
  firstName: string;
  lastName: string;
  /** The next upcoming visit, if any. */
  nextVisit?: Appointment | null;
  unreadMessages: number;
  onNavigate: (to: HomeDestination) => void;
  onOpenVisit: (id: string) => void;
  onSignOut: () => void;
}

export function HomeScreen({ firstName, lastName, nextVisit, unreadMessages, onNavigate, onOpenVisit, onSignOut }: HomeScreenProps) {
  return (
    <Screen
      title={`Hi, ${firstName}`}
      subtitle="Book visits, message your care team, and keep track of your care."
      headerAction={<Avatar name={`${firstName} ${lastName}`} />}
    >
      <View style={styles.section}>
        <Text variant="label" tone="muted">Next visit</Text>
        {nextVisit ? (
          <Card padding="none">
            <ListRow
              overline={formatDateTime(nextVisit.scheduledTime).toUpperCase()}
              title={nextVisit.reasonForVisit}
              subtitle={`${nextVisit.provider} · ${nextVisit.serviceMode === 'virtual' ? 'Video visit' : nextVisit.location}`}
              trailing={<Badge variant={appointmentStatusBadge(nextVisit.status)} dot>{formatStatusLabel(nextVisit.status)}</Badge>}
              onPress={() => onOpenVisit(nextVisit.id)}
              last
            />
          </Card>
        ) : (
          <Card><Text tone="secondary">No upcoming visits. Book one below.</Text></Card>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="label" tone="muted">What do you need today?</Text>
        <OptionCard icon="🏥" title="Book appointment" description="Choose in-person or virtual care" onPress={() => onNavigate('book')} />
        <OptionCard icon="💻" title="Virtual visit" description="See a provider from home" onPress={() => onNavigate('book-virtual')} />
        <OptionCard icon="📋" title="My visits" description="Upcoming and past appointments" onPress={() => onNavigate('visits')} />
        <OptionCard
          icon="✉️"
          title={unreadMessages > 0 ? `Messages (${unreadMessages} new)` : 'Messages'}
          description="Secure messaging with your care team"
          onPress={() => onNavigate('messages')}
        />
      </View>

      <Text variant="caption" tone="primary" align="center" onPress={onSignOut} accessibilityRole="button">
        Sign out
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[2] },
});
