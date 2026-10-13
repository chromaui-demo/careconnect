import type {
  Appointment, MessageThread, MessageThreadDetail, PaperworkProgress, PaperworkStep, Patient, TimeSlot,
} from '@careconnect/api-client';
import type { AuthUser } from '@careconnect/types';

// Story fixtures. Times are local wall-clock values so a story renders the
// same days and times in any simulator time zone, and nothing depends on
// "now" — Chromatic needs identical pixels on every run.
const at = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

export const patientUser: AuthUser = {
  id: 'u-alice',
  email: 'alice.smith@se-tools.net',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'Patient',
  patientId: 'p-alice',
};

const alice: Patient = {
  id: 'p-alice', firstName: 'Alice', lastName: 'Smith', dateOfBirth: '1988-04-12', gender: 'female',
  phone: '(555) 010-2231', email: 'alice.smith@se-tools.net',
};

export const alicePatient = alice;

export const appointments: Appointment[] = [
  {
    id: 'a-1', patientId: 'p-alice', patient: alice, status: 'prebooked', serviceMode: 'in-person',
    reasonForVisit: 'Annual physical', scheduledTime: at(10, 14, 9, 30), location: 'Main Clinic',
    provider: 'Dr. Raj Patel', visitType: 'followup',
  },
  {
    id: 'a-2', patientId: 'p-alice', patient: alice, status: 'prebooked', serviceMode: 'virtual',
    reasonForVisit: 'Skin rash', scheduledTime: at(10, 21, 15, 0), location: 'Virtual',
    provider: 'Dr. Ada Okafor', visitType: 'new',
  },
  {
    id: 'a-3', patientId: 'p-alice', patient: alice, status: 'completed', serviceMode: 'in-person',
    reasonForVisit: 'Cough and/or congestion', scheduledTime: at(9, 2, 11, 0), location: 'Urgent Care West',
    provider: 'Dr. Minh Nguyen', visitType: 'new',
  },
  {
    id: 'a-4', patientId: 'p-alice', patient: alice, status: 'cancelled', serviceMode: 'in-person',
    reasonForVisit: 'Back pain', scheduledTime: at(8, 18, 10, 30), location: 'Main Clinic',
    provider: 'Dr. Raj Patel', visitType: 'followup',
  },
  {
    id: 'a-5', patientId: 'p-alice', patient: alice, status: 'completed', serviceMode: 'virtual',
    reasonForVisit: 'Fever', scheduledTime: at(7, 7, 16, 0), location: 'Virtual',
    provider: 'Dr. Ada Okafor', visitType: 'new',
  },
];

const step = (id: string, slug: string, title: string, completed: boolean): PaperworkStep => ({
  id, responseId: `r-${id}`, slug, title, completed, answers: {}, schema: { pages: [] },
});

export const paperworkIncomplete: PaperworkProgress = {
  total: 3, completed: 1, complete: false, percent: 33,
  steps: [
    step('s-1', 'demographics', 'Demographics', true),
    step('s-2', 'medical-history', 'Medical history', false),
    step('s-3', 'consent', 'Consent to treat', false),
  ],
};

export const paperworkComplete: PaperworkProgress = {
  ...paperworkIncomplete,
  completed: 3, complete: true, percent: 100,
  steps: paperworkIncomplete.steps.map((s) => ({ ...s, completed: true })),
};

export const threads: MessageThread[] = [
  {
    id: 't-1', subject: 'Lab results follow-up', status: 'open', providerName: 'Dr. Raj Patel',
    updatedAt: at(10, 8, 14, 14), unreadCount: 2,
    lastPreview: 'Your A1C came back at 5.6%, which is in the normal range. No changes needed to your plan.',
  },
  {
    id: 't-2', subject: 'Refill: lisinopril 10 mg', status: 'open', providerName: 'Care team — Main Clinic',
    updatedAt: at(10, 3, 9, 41), unreadCount: 0,
    lastPreview: 'Your refill was sent to the pharmacy on file. It should be ready tomorrow.',
  },
  {
    id: 't-3', subject: 'Question about my rash', status: 'closed', providerName: 'Dr. Ada Okafor',
    updatedAt: at(9, 21, 17, 5), unreadCount: 0,
    lastPreview: 'Thanks for the photo. Let’s look at it together during your virtual visit.',
  },
];

export const threadDetail: MessageThreadDetail = {
  id: 't-1',
  subject: 'Lab results follow-up',
  providerName: 'Dr. Raj Patel',
  messages: [
    { id: 'm-1', senderRole: 'patient', body: 'Hi Dr. Patel — have my lab results come back yet?', createdAt: at(10, 7, 9, 2) },
    { id: 'm-2', senderRole: 'provider', body: 'Your A1C came back at 5.6%, which is in the normal range. No changes needed to your plan.', createdAt: at(10, 8, 14, 14) },
    { id: 'm-3', senderRole: 'provider', body: 'We can recheck at your annual physical on the 14th.', createdAt: at(10, 8, 14, 15) },
  ],
};

const slot = (id: string, month: number, day: number, hour: number, minute: number, provider: string): TimeSlot => ({
  id, startTime: at(month, day, hour, minute), endTime: at(month, day, hour, minute + 30), available: true,
  provider, providerId: provider.toLowerCase().replace(/[^a-z]+/g, '-'), location: 'Main Clinic', locationId: 'loc-main',
});

export const slots: TimeSlot[] = [
  slot('sl-1', 10, 14, 9, 0, 'Dr. Raj Patel'),
  slot('sl-2', 10, 14, 9, 30, 'Dr. Raj Patel'),
  slot('sl-3', 10, 14, 11, 0, 'Dr. Ada Okafor'),
  slot('sl-4', 10, 14, 14, 30, 'Dr. Raj Patel'),
  slot('sl-5', 10, 15, 8, 30, 'Dr. Minh Nguyen'),
  slot('sl-6', 10, 15, 10, 0, 'Dr. Minh Nguyen'),
  slot('sl-7', 10, 16, 13, 0, 'Dr. Raj Patel'),
  slot('sl-8', 10, 17, 9, 0, 'Dr. Ada Okafor'),
  slot('sl-9', 10, 20, 15, 0, 'Dr. Minh Nguyen'),
];
