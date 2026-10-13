import type { Request, Response } from 'express';
import { queryOne } from '../db/helpers.js';
import type { AuthUser, UserRole } from '../middleware/auth.js';

const STAFF_ROLES: UserRole[] = [
  'Administrator',
  'Manager',
  'Staff',
  'Provider',
  'Clinician',
  'CustomerSupport',
];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function getLinkedPatientId(user: AuthUser): string | null {
  if (user.role !== 'Patient') return null;
  if (user.patientId) return user.patientId;
  const row = queryOne('SELECT patient_id FROM users WHERE id = ?', user.id);
  return row?.patient_id ? String(row.patient_id) : null;
}

/** Resolves linked patient for portal routes; sends 403 and returns null if not a Patient user. */
export function requirePatientContext(req: Request, res: Response): { patientId: string } | null {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (isStaffRole(req.user.role)) {
    res.status(403).json({ error: 'Patient portal access only' });
    return null;
  }
  const patientId = getLinkedPatientId(req.user);
  if (!patientId) {
    res.status(403).json({ error: 'No linked patient record' });
    return null;
  }
  return { patientId };
}

export function assertPatientResourceAccess(
  res: Response,
  linkedPatientId: string,
  resourcePatientId: string,
): boolean {
  if (linkedPatientId !== resourcePatientId) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return false;
  }
  return true;
}

/** Returns true if access is allowed; sends 403/404 and returns false otherwise. */
export function assertAppointmentAccess(req: Request, res: Response, appointmentId: string): boolean {
  const row = queryOne('SELECT patient_id FROM appointments WHERE id = ?', appointmentId);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }
  if (!req.user || isStaffRole(req.user.role)) return true;

  const patientId = getLinkedPatientId(req.user);
  if (!patientId || String(row.patient_id) !== patientId) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return false;
  }
  return true;
}
