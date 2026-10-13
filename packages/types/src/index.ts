export * from './questionnaires.js';
export * from './auth.js';

export type AppointmentStatus = 'prebooked' | 'in-office' | 'completed' | 'cancelled';

export type ServiceMode = 'in-person' | 'virtual';

export type Gender = 'male' | 'female' | 'other' | 'unknown';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string;
  address?: {
    line: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: Patient;
  status: AppointmentStatus;
  serviceMode: ServiceMode;
  reasonForVisit: string;
  scheduledTime: string;
  checkInTime?: string;
  location: string;
  provider: string;
  visitType: string;
}

export interface VitalSigns {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface Encounter {
  id: string;
  appointmentId: string;
  patientId: string;
  status: 'in-progress' | 'completed' | 'signed';
  chiefComplaint?: string;
  vitals?: VitalSigns;
  allergies?: string[];
  medications?: string[];
  hpi?: string;
  assessment?: string;
  plan?: string;
}

export type NavTab = 'Tracking Board' | 'Patients' | 'Admin' | 'Tasks' | 'Reports';

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  provider: string;
  location: string;
}

export interface PaperworkStep {
  id: string;
  title: string;
  slug: string;
  completed: boolean;
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
