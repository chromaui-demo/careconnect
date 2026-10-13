import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api, type Appointment, type PaperworkProgress } from '@careconnect/api-client';
import { VisitDetailScreen, type VisitAction } from '../../src/screens/VisitDetailScreen';

export default function VisitDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [paperwork, setPaperwork] = useState<PaperworkProgress | null>(null);
  const [pending, setPending] = useState<VisitAction | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setAppt(await api.getAppointment(id));
    setPaperwork(await api.getPaperwork(id).catch(() => null));
  }, [id]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const run = async (action: VisitAction) => {
    if (!id) return;
    setPending(action);
    try {
      await (action === 'check-in' ? api.checkIn(id) : api.cancelAppointment(id));
      await load();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setPending(null);
    }
  };

  const onAction = (action: VisitAction) => {
    if (action === 'check-in') return run(action);
    Alert.alert('Cancel this visit?', 'You can book a new time afterwards.', [
      { text: 'Keep visit', style: 'cancel' },
      { text: 'Cancel visit', style: 'destructive', onPress: () => run(action) },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: appt?.reasonForVisit ?? 'Visit' }} />
      <VisitDetailScreen appointment={appt} paperwork={paperwork} pending={pending} onAction={onAction} />
    </>
  );
}
