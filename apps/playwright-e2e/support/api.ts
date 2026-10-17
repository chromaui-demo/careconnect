/**
 * Test setup and cleanup through the API, signed in as staff. Tests arrange
 * their data here and do the work under test through the UI, so a screen they
 * capture shows the same data on every run.
 */
import { request, type APIRequestContext } from '@playwright/test';
import { EHR_URL, PASSWORD, USERS } from './env';

/**
 * The patient the EHR encounter workflow charts. It is created once per
 * environment and reused, so their name, MRN and date of birth are the same
 * on every run. Created after the seed, it never gains demo history.
 */
export const ENCOUNTER_PATIENT = {
  firstName: 'Jordan',
  lastName: 'Rivera',
  dateOfBirth: '1985-01-01',
  gender: 'female',
  phone: '(555) 300-0001',
} as const;

export const ENCOUNTER_REASON = 'Sore throat and fever';

export async function staffApi(): Promise<APIRequestContext> {
  const login = await request.newContext();
  const response = await login.post(`${EHR_URL}/api/auth/login`, { data: { email: USERS.admin, password: PASSWORD } });
  if (!response.ok()) throw new Error(`staff API sign-in failed: ${response.status()}`);
  const { token } = await response.json();
  await login.dispose();
  return request.newContext({
    baseURL: `${EHR_URL}/api/`,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

async function ok<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  if (!response.ok()) throw new Error(`${response.url()} → ${response.status()} ${await response.text()}`);
  return (await response.json()) as T;
}

/**
 * The encounter patient's id, creating them if this environment has none yet.
 * If two first runs raced and created two, the oldest id always wins, so the
 * MRN on screen stays the same.
 */
export async function encounterPatientId(api: APIRequestContext): Promise<string> {
  const find = async () => {
    const rows = await ok<Array<{ id: string; firstName: string; lastName: string; dateOfBirth: string; createdAt: string }>>(
      await api.get('patients', { params: { search: `${ENCOUNTER_PATIENT.firstName} ${ENCOUNTER_PATIENT.lastName}` } }),
    );
    return rows
      .filter((p) => p.dateOfBirth === ENCOUNTER_PATIENT.dateOfBirth)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0]?.id;
  };
  const existing = await find();
  if (existing) return existing;
  await ok(await api.post('patients', { data: ENCOUNTER_PATIENT }));
  return (await find())!;
}

/**
 * Books a visit for the patient at the main clinic with the first provider,
 * the way the front desk would. The tracking board shows times to the minute
 * and the patient is the same every run, so the visit gets a minute in the
 * last hour that none of the patient's other visits uses: patient and time
 * then pick out this run's visit on the board. Two runs booking at the same
 * moment can still pick the same minute, so after booking it checks again and
 * moves its own visit until it is alone in its minute.
 */
export async function bookVisitNow(api: APIRequestContext, patientId: string): Promise<{ id: string; scheduledTime: string }> {
  const [locations, employees] = await Promise.all([
    ok<Array<{ id: string; name: string }>>(await api.get('admin/locations')),
    ok<Array<{ id: string; role: string; email: string }>>(await api.get('admin/employees')),
  ]);
  const location = locations.find((l) => l.name === 'Main Clinic') ?? locations[0];
  const provider = employees.filter((e) => e.role === 'Provider').sort((a, b) => a.email.localeCompare(b.email))[0];

  const minuteOf = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);
  const patientVisits = async () => (await ok<Array<{ id: string; patientId: string; scheduledTime: string }>>(
    await api.get('appointments'))).filter((v) => v.patientId === patientId);
  const freeMinute = async (excludeId?: string) => {
    const taken = new Set((await patientVisits()).filter((v) => v.id !== excludeId).map((v) => minuteOf(v.scheduledTime)));
    const now = Math.floor(Date.now() / 60_000);
    const free = Array.from({ length: 60 }, (_, i) => now - i).filter((m) => !taken.has(m));
    if (free.length === 0) throw new Error('no free minute in the last hour for the encounter patient');
    return new Date(free[Math.floor(Math.random() * free.length)] * 60_000).toISOString();
  };

  let scheduledTime = await freeMinute();
  const visit = await ok<{ id: string }>(await api.post('appointments', {
    data: {
      patientId, reasonForVisit: ENCOUNTER_REASON, serviceMode: 'in-person', visitType: 'Urgent Care',
      scheduledTime, locationId: location.id, providerId: provider.id,
    },
  }));
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = (await patientVisits()).some((v) => v.id !== visit.id && minuteOf(v.scheduledTime) === minuteOf(scheduledTime));
    if (!clash) return { id: visit.id, scheduledTime };
    scheduledTime = await freeMinute(visit.id);
    await ok(await api.patch(`appointments/${visit.id}/reschedule`, { data: { scheduledTime } }));
  }
  throw new Error('could not give the encounter visit a minute of its own');
}

/**
 * Leaves a visit closed whatever state a failed test left it in: a booked
 * visit is cancelled, and an open encounter is signed so the patient doesn't
 * linger on the tracking board's in-office queue.
 */
export async function closeVisit(api: APIRequestContext, visitId: string) {
  const visit = await ok<{ status: string }>(await api.get(`appointments/${visitId}`));
  if (visit.status === 'prebooked') {
    await ok(await api.patch(`appointments/${visitId}/cancel`));
  } else if (visit.status === 'in-office') {
    const encounter = await ok<{ id: string }>(await api.get(`encounters/by-appointment/${visitId}`));
    await ok(await api.post(`encounters/${encounter.id}/sign`));
  }
}
