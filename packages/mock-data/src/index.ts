import type { Appointment, Encounter, Patient, TimeSlot } from '@careconnect/types';

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const REASONS = [
  'Cough and/or congestion',
  'Fever',
  'Throat pain',
  'Ear pain',
  'Vomiting and/or diarrhea',
  'Abdominal pain',
  'Back pain',
  'Skin rash',
  'Headache',
  'Annual physical',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePatient(index: number): Patient {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  const year = 1960 + (index * 7) % 40;
  const month = String((index % 12) + 1).padStart(2, '0');
  const day = String((index % 28) + 1).padStart(2, '0');

  return {
    id: `patient-${index + 1}`,
    firstName,
    lastName,
    dateOfBirth: `${year}-${month}-${day}`,
    gender: index % 3 === 0 ? 'female' : index % 3 === 1 ? 'male' : 'other',
    phone: `(555) ${String(100 + index).slice(-3)}-${String(1000 + index * 11).slice(-4)}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    address: {
      line: `${100 + index * 10} Main Street`,
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
  };
}

const patients: Patient[] = Array.from({ length: 12 }, (_, i) => generatePatient(i));

const statuses: Array<'prebooked' | 'in-office' | 'completed' | 'cancelled'> = [
  'prebooked', 'prebooked', 'in-office', 'in-office', 'in-office',
  'completed', 'completed', 'completed', 'cancelled', 'prebooked', 'in-office', 'completed',
];

export const demoAppointments: Appointment[] = patients.map((patient, i) => {
  const status = statuses[i];
  const hour = 8 + (i % 10);
  const today = new Date();
  today.setHours(hour, (i % 4) * 15, 0, 0);

  return {
    id: `appt-${i + 1}`,
    patientId: patient.id,
    patient,
    status,
    serviceMode: i % 4 === 0 ? 'virtual' : 'in-person',
    reasonForVisit: REASONS[i % REASONS.length],
    scheduledTime: today.toISOString(),
    checkInTime: status === 'in-office' || status === 'completed'
      ? new Date(today.getTime() - 15 * 60000).toISOString()
      : undefined,
    location: i % 2 === 0 ? 'Main Clinic' : 'Urgent Care West',
    provider: randomFrom(['Dr. Sarah Chen', 'Dr. Michael Torres', 'Dr. Emily Park', 'NP Lisa Wong']),
    visitType: i % 3 === 0 ? 'Follow-up' : 'New Patient',
  };
});

export const demoEncounters: Encounter[] = demoAppointments
  .filter((a) => a.status === 'in-office')
  .map((appt, i) => ({
    id: `encounter-${i + 1}`,
    appointmentId: appt.id,
    patientId: appt.patientId,
    status: 'in-progress' as const,
    chiefComplaint: appt.reasonForVisit,
    vitals: {
      temperature: 98.2 + (i * 0.3),
      bloodPressureSystolic: 120 + i * 2,
      bloodPressureDiastolic: 75 + i,
      heartRate: 72 + i * 3,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      weight: 150 + i * 5,
      height: 66 + (i % 6),
    },
    allergies: i % 2 === 0 ? ['Penicillin'] : [],
    medications: i % 3 === 0 ? ['Lisinopril 10mg daily'] : [],
  }));

export const demoPatients = patients;

export const demoTimeSlots: TimeSlot[] = Array.from({ length: 8 }, (_, i) => {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9 + i, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(30);

  return {
    id: `slot-${i + 1}`,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    available: i !== 3 && i !== 6,
    provider: randomFrom(['Dr. Sarah Chen', 'Dr. Michael Torres', 'Dr. Emily Park']),
    location: 'Main Clinic',
  };
});

export function getAppointmentsByStatus(status: Appointment['status']): Appointment[] {
  return demoAppointments.filter((a) => a.status === status);
}

export function getPatientById(id: string): Patient | undefined {
  return demoPatients.find((p) => p.id === id);
}

export function getAppointmentById(id: string): Appointment | undefined {
  return demoAppointments.find((a) => a.id === id);
}

export function getEncounterByAppointmentId(appointmentId: string): Encounter | undefined {
  return demoEncounters.find((e) => e.appointmentId === appointmentId);
}

export { FIRST_NAMES, LAST_NAMES, REASONS };
