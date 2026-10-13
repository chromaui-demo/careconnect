import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { api, type Appointment } from '@careconnect/api-client';
import { useAuth } from '../../src/auth/AuthContext';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { isUpcoming } from '../../src/screens/VisitsScreen';

export default function HomeRoute() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [nextVisit, setNextVisit] = useState<Appointment | null>(null);
  const [unread, setUnread] = useState(0);

  // Refetch on focus so a visit booked in the modal shows up on return.
  useFocusEffect(
    useCallback(() => {
      api.getAppointments()
        .then((all) => setNextVisit(
          all.filter(isUpcoming).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))[0] ?? null,
        ))
        .catch(() => setNextVisit(null));
      api.portal.getMessagesUnreadCount().then((r) => setUnread(r.count)).catch(() => setUnread(0));
    }, []),
  );

  if (!user) return null;
  return (
    <HomeScreen
      firstName={user.firstName}
      lastName={user.lastName}
      nextVisit={nextVisit}
      unreadMessages={unread}
      onOpenVisit={(id) => router.push(`/visits/${id}`)}
      onNavigate={(to) => {
        if (to === 'book') router.push('/book');
        else if (to === 'book-virtual') router.push('/book?mode=virtual');
        else router.push(`/${to}`);
      }}
      onSignOut={logout}
    />
  );
}
