export type UserRole =
  | 'Administrator'
  | 'Manager'
  | 'Staff'
  | 'Provider'
  | 'Clinician'
  | 'CustomerSupport'
  | 'Billing'
  | 'Patient';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  patientId?: string;
}
