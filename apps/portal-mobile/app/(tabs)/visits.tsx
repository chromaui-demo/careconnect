import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { api, type Appointment } from '@careconnect/api-client';
import { VisitsScreen } from '../../src/screens/VisitsScreen';

export default function VisitsRoute() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setAppointments(await api.getAppointments());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load visits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <VisitsScreen
      appointments={appointments}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      onOpenVisit={(id) => router.push(`/visits/${id}`)}
      onBook={() => router.push('/book')}
    />
  );
}
