import type { AuthUser } from '@careconnect/types';

// `import.meta.env` is Vite's; under React Native's import.meta polyfill it is
// undefined, and the native app sets an absolute base with configureApiBase().
let API_BASE = import.meta.env?.VITE_API_URL ?? '/api';

/** Point the client at an absolute API origin (e.g. `https://host/api`) where `/api` doesn't resolve. */
export function configureApiBase(url: string) {
  API_BASE = url.replace(/\/$/, '');
}

let storageKey = 'cc_token';
let authToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;

/** Use a separate storage key per app (e.g. cc_portal_token) to avoid cross-app session bleed. */
export function configureAuthStorage(key: string) {
  storageKey = key;
  authToken = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(storageKey, token);
  else localStorage.removeItem(storageKey);
}

export function getAuthToken() {
  return authToken;
}

async function parseErrorBody(res: Response): Promise<string> {
  const fallback = res.statusText || 'Request failed';
  try {
    const body = await res.json() as Record<string, unknown>;
    if (typeof body.error === 'string') return body.error;
    if (typeof body.message === 'string') return body.message;
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) => (typeof item === 'string' ? item : (item as { msg?: string })?.msg))
        .filter(Boolean)
        .join(', ') || fallback;
    }
  } catch {
    /* non-JSON body */
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    throw new Error(await parseErrorBody(res));
  }
  return res.json() as Promise<T>;
}

export type { UserRole, AuthUser } from '@careconnect/types';

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: AuthUser }>('/auth/me'),

  getAppointments: (params?: { status?: string; location?: string; provider?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.location) q.set('location', params.location);
    if (params?.provider) q.set('provider', params.provider);
    return request<Appointment[]>(`/appointments?${q}`);
  },

  getAppointment: (id: string) => request<Appointment>(`/appointments/${id}`),

  updateAppointmentStatus: (id: string, status: string) =>
    request<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getSlots: () => request<TimeSlot[]>('/appointments/slots/available'),

  bookAppointment: (data: BookAppointmentPayload) =>
    request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),

  getPatients: (search?: string) =>
    request<Patient[]>(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  getPatient: (id: string) => request<Patient>(`/patients/${id}`),

  createPatient: (data: Partial<Patient> & { firstName: string; lastName: string; dateOfBirth: string }) =>
    request<{ id: string }>('/patients', { method: 'POST', body: JSON.stringify(data) }),

  createTask: (data: { title: string; description?: string; priority?: string; assigneeId?: string; patientId?: string; dueDate?: string }) =>
    request<{ id: string }>('/tasks', { method: 'POST', body: JSON.stringify(data) }),

  updateTask: (id: string, data: { status?: string; assigneeId?: string; priority?: string }) =>
    request<{ ok: boolean }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getExtendedChart: (encounterId: string) =>
    request<ExtendedChart>(`/clinical/encounters/${encounterId}/extended-chart`),

  saveExtendedChart: (encounterId: string, data: ExtendedChart) =>
    request<ExtendedChart>(`/clinical/encounters/${encounterId}/extended-chart`, { method: 'PUT', body: JSON.stringify(data) }),

  getExternalLabs: (encounterId: string) => request<ClinicalOrder[]>(`/external-labs/encounter/${encounterId}`),
  createExternalLab: (encounterId: string, data: { testName: string; labName?: string }) =>
    request<{ id: string }>(`/external-labs/encounter/${encounterId}`, { method: 'POST', body: JSON.stringify(data) }),

  getInhouseLabs: (encounterId: string) => request<ClinicalOrder[]>(`/inhouse-labs/encounter/${encounterId}`),
  createInhouseLab: (encounterId: string, data: { testName: string }) =>
    request<{ id: string }>(`/inhouse-labs/encounter/${encounterId}`, { method: 'POST', body: JSON.stringify(data) }),

  getRadiologyOrders: (encounterId: string) => request<ClinicalOrder[]>(`/radiology/encounter/${encounterId}`),
  createRadiologyOrder: (encounterId: string, data: { studyName: string; modality?: string }) =>
    request<{ id: string }>(`/radiology/encounter/${encounterId}`, { method: 'POST', body: JSON.stringify(data) }),

  getPatientDocuments: (patientId: string) => request<PatientDocument[]>(`/documents/patient/${patientId}`),
  uploadPatientDocument: (patientId: string, data: { title: string; category?: string; fileName?: string }) =>
    request<{ id: string }>(`/documents/patient/${patientId}`, { method: 'POST', body: JSON.stringify(data) }),

  getAuditLogs: (patientId?: string) =>
    request<AuditLogDetail[]>(`/audit-logs${patientId ? `?patientId=${patientId}` : ''}`),

  getCompleteEncountersReport: () => request<ReportEncounter[]>('/reports/complete-encounters'),
  getVisitsOverviewReport: () => request<{ byStatus: Array<{ status: string; count: number }>; total: number }>('/reports/visits-overview'),
  getPracticeKpisReport: () => request<Record<string, number>>('/reports/practice-kpis'),
  getInvoiceablePatientsReport: () => request<Array<{ patientId: string; name: string; amount: number }>>('/reports/invoiceable-patients'),
  runAdHocReport: (reportType: string) =>
    request<unknown[]>('/reports/ad-hoc', { method: 'POST', body: JSON.stringify({ reportType }) }),

  getEncounterByAppointment: (appointmentId: string) =>
    request<Encounter>(`/encounters/by-appointment/${appointmentId}`),

  saveChartData: (encounterId: string, data: Partial<Encounter>) =>
    request<Encounter>(`/encounters/${encounterId}/chart-data`, { method: 'PUT', body: JSON.stringify(data) }),

  signEncounter: (encounterId: string) =>
    request<Encounter>(`/encounters/${encounterId}/sign`, { method: 'POST', body: '{}' }),

  getTasks: (status?: string) =>
    request<Task[]>(`/tasks${status ? `?status=${status}` : ''}`),

  getKpis: () => request<Kpis>('/reports/kpis'),

  checkIn: (id: string) =>
    request<Appointment>(`/appointments/${id}/check-in`, { method: 'POST', body: '{}' }),

  cancelAppointment: (id: string) =>
    request<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH', body: '{}' }),

  rescheduleAppointment: (id: string, data: { scheduledTime: string; providerId?: string; locationId?: string }) =>
    request<Appointment>(`/appointments/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(data) }),

  getPaperwork: (appointmentId: string) =>
    request<PaperworkProgress>(`/paperwork/${appointmentId}`),

  savePaperwork: (appointmentId: string, questionnaireId: string, answers: Record<string, unknown>) =>
    request<PaperworkProgress>(`/paperwork/${appointmentId}/${questionnaireId}`, {
      method: 'PUT',
      body: JSON.stringify({ answers }),
    }),

  submitPaperwork: (appointmentId: string, questionnaireId: string, answers: Record<string, unknown>) =>
    request<PaperworkProgress>(`/paperwork/${appointmentId}/${questionnaireId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  getTelemedSession: (appointmentId: string) =>
    request<TelemedSession>(`/telemed/${appointmentId}/session`),

  joinTelemed: (appointmentId: string, role: 'patient' | 'provider' = 'patient') =>
    request<TelemedSession & { token: string }>(`/telemed/${appointmentId}/join`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  endTelemed: (appointmentId: string) =>
    request<TelemedSession>(`/telemed/${appointmentId}/end`, { method: 'POST', body: '{}' }),

  getLabOrders: (encounterId: string) =>
    request<LabOrder[]>(`/labs/encounter/${encounterId}`),

  createLabOrder: (encounterId: string, testName: string) =>
    request<LabOrder>(`/labs/encounter/${encounterId}`, { method: 'POST', body: JSON.stringify({ testName }) }),

  getErxOrders: (encounterId: string) =>
    request<ErxOrder[]>(`/erx/encounter/${encounterId}`),

  createErxOrder: (encounterId: string, data: { medication: string; dosage: string; pharmacy?: string }) =>
    request<{ id: string; status: string }>(`/erx/encounter/${encounterId}`, { method: 'POST', body: JSON.stringify(data) }),

  walkIn: (data: BookAppointmentPayload) =>
    request<Appointment>('/appointments/walk-in', { method: 'POST', body: JSON.stringify(data) }),

  sendTelemedSignal: (appointmentId: string, fromRole: string, signalType: string, payload: unknown) =>
    request<{ id: string }>(`/telemed/${appointmentId}/signal`, {
      method: 'POST', body: JSON.stringify({ fromRole, signalType, payload }),
    }),

  getTelemedSignals: (appointmentId: string, after?: string) =>
    request<TelemedSignal[]>(`/telemed/${appointmentId}/signals${after ? `?after=${after}` : ''}`),

  getClaims: () => request<Claim[]>('/billing/claims'),
  getClaim: (id: string) => request<ClaimDetail>(`/billing/claims/${id}`),
  createClaim: (data: unknown) => request<{ id: string }>('/billing/claims', { method: 'POST', body: JSON.stringify(data) }),
  submitClaim: (id: string) => request<{ status: string }>(`/billing/claims/${id}/submit`, { method: 'POST', body: '{}' }),
  getEras: () => request<Era[]>('/billing/eras'),
  getEra: (id: string) => request<EraDetail>(`/billing/eras/${id}`),
  getChargeItems: () => request<ChargeItem[]>('/billing/charge-items'),
  getPatientAr: () => request<PatientAr[]>('/billing/patient-ar'),

  billing: {
    updateClaim: (id: string, data: Partial<Claim>) =>
      request<Claim>(`/billing/claims/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    addClaimNote: (id: string, body: string, authorName?: string) =>
      request<{ id: string }>(`/billing/claims/${id}/notes`, { method: 'POST', body: JSON.stringify({ body, authorName }) }),
    getClaimNotes: (id: string) => request<ClaimNote[]>(`/billing/claims/${id}/notes`),
    addDiagnosis: (id: string, icdCode: string, description?: string) =>
      request<{ id: string }>(`/billing/claims/${id}/diagnoses`, { method: 'POST', body: JSON.stringify({ icdCode, description }) }),
    getDiagnoses: (id: string) => request<ClaimDiagnosis[]>(`/billing/claims/${id}/diagnoses`),
    exportX12: async (id: string) => {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}/billing/claims/${id}/export-x12`, { headers });
      if (!res.ok) throw new Error(await parseErrorBody(res));
      return res.text();
    },
    importEra: (x12Content: string) =>
      request<{ id: string }>('/billing/eras/import', { method: 'POST', body: JSON.stringify({ x12Content }) }),
    matchEraPayment: (eraId: string, paymentId: string, claimId: string) =>
      request<{ ok: boolean }>(`/billing/eras/${eraId}/payments/${paymentId}/match`, { method: 'POST', body: JSON.stringify({ claimId }) }),
    unmatchEraPayment: (eraId: string, paymentId: string) =>
      request<{ ok: boolean }>(`/billing/eras/${eraId}/payments/${paymentId}/unmatch`, { method: 'POST', body: '{}' }),
    getEraClaimDetail: (eraId: string, claimId: string) =>
      request<EraClaimDetail>(`/billing/eras/${eraId}/claims/${claimId}`),
    getPatients: (search?: string) =>
      request<BillingPatient[]>(`/billing/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getPatient: (id: string) => request<BillingPatientDetail>(`/billing/patients/${id}`),
    addCoverage: (patientId: string, data: { payerName: string; memberId?: string; groupNumber?: string; rank?: number }) =>
      request<{ id: string }>(`/billing/patients/${patientId}/coverages`, { method: 'POST', body: JSON.stringify(data) }),
    recordPayment: (patientId: string, data: { amount: number; method?: string; claimId?: string; note?: string }) =>
      request<{ id: string }>(`/billing/patient-ar/${patientId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    getBillingProviders: () => request<MasterRecord[]>('/billing/billing-providers'),
    createBillingProvider: (data: { name: string; npi?: string; taxId?: string; organization?: boolean }) =>
      request<{ id: string }>('/billing/billing-providers', { method: 'POST', body: JSON.stringify(data) }),
    getRenderingProviders: () => request<MasterRecord[]>('/billing/rendering-providers'),
    createRenderingProvider: (data: { name: string; npi?: string; specialty?: string }) =>
      request<{ id: string }>('/billing/rendering-providers', { method: 'POST', body: JSON.stringify(data) }),
    getServiceFacilities: () => request<MasterRecord[]>('/billing/service-facilities'),
    createServiceFacility: (data: { name: string; npi?: string; address?: string }) =>
      request<{ id: string }>('/billing/service-facilities', { method: 'POST', body: JSON.stringify(data) }),
    getTags: () => request<BillingTag[]>('/billing/tags'),
    getChargeMasters: () => request<ChargeItem[]>('/billing/charge-masters'),
    createChargeMaster: (data: { cptCode: string; description: string; defaultAmount: number }) =>
      request<{ id: string }>('/billing/charge-masters', { method: 'POST', body: JSON.stringify(data) }),
    getRules: (engine: string) => request<BillingRule[]>(`/billing/rules/${engine}`),
    createRule: (engine: string, data: Partial<BillingRule>) =>
      request<{ id: string }>(`/billing/rules/${engine}`, { method: 'POST', body: JSON.stringify(data) }),
    updateRule: (engine: string, id: string, data: Partial<BillingRule>) =>
      request<{ ok: boolean }>(`/billing/rules/${engine}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    runRules: (engine: string, claimIds: string[]) =>
      request<{ results: Array<{ claimId: string; applied: string[] }> }>(`/billing/rules/${engine}/run`, { method: 'POST', body: JSON.stringify({ claimIds }) }),
  },

  portal: {
    getMedications: () => request<PortalMedication[]>('/portal/medications'),
    getLabResults: () => request<PortalLabResult[]>('/portal/lab-results'),
    getLabResult: (orderId: string) => request<PortalLabResultDetail>(`/portal/lab-results/${orderId}`),
    getMessagesUnreadCount: () => request<{ count: number }>('/portal/messages/unread-count'),
    getMessages: () => request<MessageThread[]>('/portal/messages'),
    getMessageThread: (threadId: string) => request<MessageThreadDetail>(`/portal/messages/${threadId}`),
    createMessage: (data: { subject: string; body: string; providerId?: string }) =>
      request<{ threadId: string }>('/portal/messages', { method: 'POST', body: JSON.stringify(data) }),
    replyToThread: (threadId: string, body: string) =>
      request<{ id: string }>(`/portal/messages/${threadId}/reply`, { method: 'POST', body: JSON.stringify({ body }) }),
    getBilling: () => request<PortalBillingSummary>('/portal/billing'),
    payBill: (data: { amount: number; claimId?: string }) =>
      request<{ balance: number }>('/portal/billing/pay', { method: 'POST', body: JSON.stringify(data) }),
    getRefillRequests: () => request<RefillRequest[]>('/portal/refill-requests'),
    requestRefill: (data: { medication: string; dosage?: string; pharmacy?: string; notes?: string; erxOrderId?: string }) =>
      request<{ id: string }>('/portal/refill-requests', { method: 'POST', body: JSON.stringify(data) }),
  },

  getFaxOutbound: () => request<FaxMessage[]>('/fax/outbound'),
  sendFax: (data: { recipientFax: string; subject?: string; patientId?: string; pages?: number }) =>
    request<{ id: string }>('/fax/outbound', { method: 'POST', body: JSON.stringify(data) }),
  getFaxInbound: () => request<FaxInbound[]>('/fax/inbound'),
  matchFax: (id: string, patientId: string) =>
    request<{ ok: boolean }>(`/fax/inbound/${id}/match`, { method: 'PATCH', body: JSON.stringify({ patientId }) }),

  startScribe: (encounterId: string) =>
    request<ScribeSession>(`/ai-scribe/encounter/${encounterId}/start`, { method: 'POST', body: '{}' }),
  submitScribeTranscript: (sessionId: string, transcript: string) =>
    request<ScribeSession>(`/ai-scribe/${sessionId}/transcript`, { method: 'POST', body: JSON.stringify({ transcript }) }),
  applyScribe: (sessionId: string) =>
    request<{ ok: boolean }>(`/ai-scribe/${sessionId}/apply`, { method: 'POST', body: '{}' }),

  getUnsolicitedLabs: () => request<UnsolicitedLab[]>('/labs-inbox/unsolicited'),
  matchUnsolicitedLab: (id: string, patientId: string) =>
    request<{ ok: boolean }>(`/labs-inbox/unsolicited/${id}/match`, { method: 'POST', body: JSON.stringify({ patientId }) }),

  getIncompleteEncounters: () => request<ReportEncounter[]>('/reports/incomplete-encounters'),
  getRecentPatientsReport: () => request<ReportPatient[]>('/reports/recent-patients'),
  getDailyPaymentsReport: () => request<ReportPayment[]>('/reports/daily-payments'),

  admin: {
    getEmployees: () => request<Employee[]>('/admin/employees'),
    getLocations: () => request<Location[]>('/admin/locations'),
    getServices: () => request<ServiceCategory[]>('/admin/service-categories'),
    getSchedules: () => request<Schedule[]>('/admin/schedules'),
    getInsurancePayers: () => request<InsurancePayer[]>('/admin/insurance-payers'),
    getQuestionnaires: () => request<Questionnaire[]>('/admin/questionnaires'),
    getQuestionnaire: (id: string) => request<QuestionnaireDetail>(`/admin/questionnaires/${id}`),
    createQuestionnaire: (data: { title: string; slug: string; schema: unknown }) =>
      request<{ id: string }>('/admin/questionnaires', { method: 'POST', body: JSON.stringify(data) }),
    updateQuestionnaire: (id: string, data: unknown) =>
      request<{ ok: boolean }>(`/admin/questionnaires/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteQuestionnaire: (id: string) =>
      request<{ ok: boolean }>(`/admin/questionnaires/${id}`, { method: 'DELETE' }),
    getAuditLogs: () => request<AuditLog[]>('/admin/audit-logs'),
    createEmployee: (data: Partial<Employee> & { email: string; password?: string }) =>
      request<{ id: string }>('/admin/employees', { method: 'POST', body: JSON.stringify(data) }),
    createLocation: (data: { name: string; address?: string; phone?: string }) =>
      request<{ id: string }>('/admin/locations', { method: 'POST', body: JSON.stringify(data) }),
    createSchedule: (data: { practitionerId: string; locationId: string; dayOfWeek: number; startTime: string; endTime: string }) =>
      request<{ id: string }>('/admin/schedules', { method: 'POST', body: JSON.stringify(data) }),
  },
};

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: { line: string; city: string; state: string; zip: string };
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  status: string;
  serviceMode: string;
  reasonForVisit: string;
  scheduledTime: string;
  checkInTime?: string;
  location: string;
  provider: string;
  visitType: string;
}

export interface Encounter {
  id: string;
  appointmentId: string;
  patientId: string;
  status: string;
  chiefComplaint?: string;
  vitals?: Record<string, number>;
  allergies?: string[];
  medications?: string[];
  hpi?: string;
  assessment?: string;
  plan?: string;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  provider: string;
  providerId: string;
  location: string;
  locationId: string;
}

export interface BookAppointmentPayload {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  reasonForVisit: string;
  serviceMode: string;
  scheduledTime: string;
  locationId?: string;
  providerId?: string;
  visitType?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeName?: string;
  patientName?: string;
  dueDate?: string;
}

export interface Kpis {
  totalAppointments: number;
  inOffice: number;
  completedToday: number;
  appointmentsToday: number;
  openTasks: number;
}

export interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  mode: string;
  description?: string;
}

export interface Schedule {
  id: string;
  practitioner_name: string;
  location_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface InsurancePayer {
  id: string;
  name: string;
  payer_id?: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  slug: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type?: string;
  created_at: string;
}

export interface PaperworkStep {
  id: string;
  responseId: string;
  title: string;
  slug: string;
  completed: boolean;
  answers: Record<string, unknown>;
  schema: { pages: Array<{ slug: string; title: string; fields: Array<{ id: string; type: string; label: string; required?: boolean; options?: string[]; placeholder?: string }> }> };
}

export interface PaperworkProgress {
  total: number;
  completed: number;
  complete: boolean;
  percent: number;
  steps: PaperworkStep[];
}

export interface TelemedSession {
  id?: string;
  appointmentId?: string;
  status: string;
  roomId?: string;
  patientJoinedAt?: string;
  providerJoinedAt?: string;
  endedAt?: string;
  token?: string;
}

export interface LabOrder {
  id: string;
  encounterId: string;
  testName: string;
  status: string;
  orderedAt: string;
  results: Array<{ id: string; value: string; unit: string; abnormal: boolean }>;
}

export interface ErxOrder {
  id: string;
  medication: string;
  dosage: string;
  status: string;
  pharmacy?: string;
  orderedAt: string;
}

export interface TelemedSignal {
  id: string;
  fromRole: string;
  signalType: string;
  payload: unknown;
  createdAt: string;
}

export interface Claim {
  id: string;
  patientName: string;
  status: string;
  payerName?: string;
  totalAmount: number;
  submittedAt?: string;
}

export interface ClaimDetail extends Claim {
  lineItems: Array<{ id: string; cptCode: string; description?: string; amount: number; units: number }>;
}

export interface Era {
  id: string;
  payerName: string;
  checkNumber?: string;
  totalAmount: number;
  receivedAt: string;
}

export interface EraDetail extends Era {
  payments: Array<{ id: string; claimId?: string; patientName?: string; paidAmount: number; status: string }>;
}

export interface ChargeItem {
  id: string;
  cptCode: string;
  description: string;
  defaultAmount: number;
}

export interface PatientAr {
  patientId: string;
  name: string;
  balance: number;
}

export interface FaxMessage {
  id: string;
  recipientFax: string;
  subject?: string;
  status: string;
  sentAt?: string;
}

export interface FaxInbound {
  id: string;
  senderFax: string;
  status: string;
  patientName?: string | null;
  receivedAt: string;
}

export interface ScribeSession {
  id: string;
  encounterId: string;
  status: string;
  transcript?: string;
  generatedHpi?: string;
  generatedAssessment?: string;
  generatedPlan?: string;
}

export interface UnsolicitedLab {
  id: string;
  patientName: string;
  testName: string;
  resultValue?: string;
  resultUnit?: string;
}

export interface ReportEncounter {
  id: string;
  patientName: string;
  status: string;
  chiefComplaint?: string;
}

export interface ReportPatient {
  id: string;
  name: string;
  createdAt: string;
}

export interface ReportPayment {
  claimId: string;
  payer?: string;
  amount: number;
  date?: string;
}

export interface QuestionnaireDetail extends Questionnaire {
  schema: unknown;
  active?: boolean;
}

export interface ExtendedChart {
  ros?: string;
  exam?: string;
  conditions?: string;
  surgicalHistory?: string;
  hospitalization?: string;
  screening?: string;
  procedures?: string;
  immunizations?: string;
  inhouseMedications?: string;
  nursingOrders?: string;
}

export interface ClinicalOrder {
  id: string;
  encounterId: string;
  status: string;
  orderedAt: string;
  testName?: string;
  studyName?: string;
  labName?: string;
  modality?: string;
  resultValue?: string;
  resultUnit?: string;
  resultSummary?: string;
}

export interface PatientDocument {
  id: string;
  title: string;
  category: string;
  fileName?: string;
  uploadedAt: string;
}

export interface AuditLogDetail {
  id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: unknown;
  createdAt: string;
}

export interface ClaimNote {
  id: string;
  body: string;
  authorName?: string;
  createdAt: string;
}

export interface ClaimDiagnosis {
  id: string;
  icdCode: string;
  description?: string;
}

export interface BillingPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  balance: number;
}

export interface BillingPatientDetail extends BillingPatient {
  coverages: Array<{ id: string; payerName: string; memberId?: string; groupNumber?: string; rank: number }>;
  claims: Claim[];
  pendingPayments: number;
}

export interface MasterRecord {
  id: string;
  name: string;
  npi?: string;
  taxId?: string;
  organization?: boolean;
  specialty?: string;
  address?: string;
}

export interface BillingTag {
  id: string;
  name: string;
  color: string;
}

export interface BillingRule {
  id: string;
  engine: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  conditions: unknown;
  actions: unknown[];
}

export interface EraClaimDetail {
  claimId: string;
  patientName?: string;
  paidAmount: number;
  status: string;
  adjustments: Array<{ code: string; amount: number; description: string }>;
}

export interface PortalMedication {
  id: string;
  medication: string;
  dosage: string;
  pharmacy?: string;
  status: string;
  orderedAt: string;
  source: 'erx' | 'encounter';
}

export interface PortalLabResult {
  orderId: string;
  testName: string;
  orderStatus: string;
  orderedAt: string;
  resultId: string;
  resultValue?: string;
  resultUnit?: string;
  abnormal: boolean;
  resultedAt?: string;
  providerName: string;
}

export interface PortalLabResultDetail {
  orderId: string;
  testName: string;
  orderStatus: string;
  orderedAt: string;
  providerName: string;
  results: Array<{
    id: string;
    resultValue?: string;
    resultUnit?: string;
    abnormal: boolean;
    resultedAt?: string;
    referenceRange?: string;
  }>;
}

export interface MessageThread {
  id: string;
  subject: string;
  status: string;
  providerName: string;
  updatedAt: string;
  lastPreview: string;
  unreadCount: number;
}

export interface PortalMessage {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export interface MessageThreadDetail {
  id: string;
  subject: string;
  providerName: string;
  messages: PortalMessage[];
}

export interface PortalClaim {
  id: string;
  status: string;
  payerName?: string;
  totalAmount: number;
  submittedAt?: string;
  createdAt: string;
}

export interface PortalPayment {
  id: string;
  amount: number;
  method?: string;
  claimId?: string;
  note?: string;
  createdAt?: string;
}

export interface PortalBillingSummary {
  balance: number;
  claims: PortalClaim[];
  recentPayments: PortalPayment[];
}

export type RefillRequestStatus = 'pending' | 'approved' | 'denied';

export interface RefillRequest {
  id: string;
  medication: string;
  dosage?: string;
  pharmacy?: string;
  status: RefillRequestStatus;
  erxOrderId?: string;
  notes?: string;
  requestedAt: string;
}

export { createWebRTCCall } from './webrtc.js';
