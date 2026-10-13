import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';
import { assignPaperworkToAppointment } from '../services/paperwork.js';
import { assertAppointmentAccess, getLinkedPatientId, isStaffRole } from '../services/patient-access.js';

export const appointmentsRouter = Router();

function mapAppointment(row: Record<string, unknown>) {
  const patient = queryOne('SELECT * FROM patients WHERE id = ?', String(row.patient_id));
  const location = row.location_id ? queryOne('SELECT name FROM locations WHERE id = ?', String(row.location_id)) : undefined;
  const provider = row.provider_id ? queryOne('SELECT first_name, last_name FROM users WHERE id = ?', String(row.provider_id)) : undefined;

  return {
    id: row.id, patientId: row.patient_id,
    patient: patient ? {
      id: patient.id, firstName: patient.first_name, lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth, gender: patient.gender, phone: patient.phone, email: patient.email,
      address: patient.address_json ? JSON.parse(String(patient.address_json)) : undefined,
    } : undefined,
    status: row.status, serviceMode: row.service_mode, reasonForVisit: row.reason_for_visit,
    scheduledTime: row.scheduled_time, checkInTime: row.check_in_time,
    location: location?.name ?? 'Unknown', locationId: row.location_id,
    provider: provider ? `Dr. ${provider.first_name} ${provider.last_name}` : 'Unassigned',
    providerId: row.provider_id, visitType: row.visit_type, createdAt: row.created_at,
  };
}

appointmentsRouter.post('/walk-in', authRequired, (req, res) => {
  const { firstName, lastName, dateOfBirth, phone, email, reasonForVisit, gender } = req.body;
  const linkedPatientId = req.user ? getLinkedPatientId(req.user) : null;
  const pid = linkedPatientId ?? uuid();
  const apptId = uuid();
  const encId = uuid();
  if (!linkedPatientId) {
    execute(`INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      pid, firstName, lastName, dateOfBirth ?? '1990-01-01', gender ?? 'unknown', phone, email);
  }
  const loc = queryOne('SELECT id FROM locations LIMIT 1');
  const provider = queryOne("SELECT id FROM users WHERE role = 'Provider' LIMIT 1");
  execute(`INSERT INTO appointments (id, patient_id, status, service_mode, reason_for_visit, scheduled_time, check_in_time, location_id, provider_id, visit_type)
    VALUES (?, ?, 'in-office', 'in-person', ?, datetime('now'), datetime('now'), ?, ?, 'Walk-in')`,
    apptId, pid, reasonForVisit ?? 'Walk-in visit', loc?.id != null ? String(loc.id) : null, provider?.id != null ? String(provider.id) : null);
  execute(`INSERT INTO encounters (id, appointment_id, patient_id, status, chief_complaint) VALUES (?, ?, ?, 'in-progress', ?)`,
    encId, apptId, pid, reasonForVisit ?? 'Walk-in visit');
  assignPaperworkToAppointment(apptId);
  const row = queryOne('SELECT * FROM appointments WHERE id = ?', apptId)!;
  res.status(201).json(mapAppointment(row));
});

appointmentsRouter.get('/slots/available', authRequired, (_req, res) => {
  const providers = queryAll("SELECT id, first_name, last_name FROM users WHERE role = 'Provider'");
  const loc = queryOne('SELECT id, name FROM locations LIMIT 1');
  const slots = [];
  for (let i = 1; i <= 8; i++) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(8 + i, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(30);
    const p = providers[i % providers.length];
    slots.push({
      id: `slot-${i}`, startTime: start.toISOString(), endTime: end.toISOString(),
      available: i !== 3 && i !== 6,
      provider: `Dr. ${p.first_name} ${p.last_name}`, providerId: p.id,
      location: loc?.name, locationId: loc?.id,
    });
  }
  res.json(slots);
});

appointmentsRouter.get('/', authRequired, (req, res) => {
  const { status, location, provider } = req.query;
  let rows = queryAll('SELECT * FROM appointments ORDER BY scheduled_time');
  if (req.user && !isStaffRole(req.user.role)) {
    const patientId = getLinkedPatientId(req.user);
    if (!patientId) {
      res.json([]);
      return;
    }
    rows = rows.filter((r) => String(r.patient_id) === patientId);
  }
  if (status) rows = rows.filter((r) => r.status === status);
  if (location && location !== 'all') {
    rows = rows.filter((r) => {
      const loc = queryOne('SELECT name FROM locations WHERE id = ?', String(r.location_id));
      return loc?.name === location;
    });
  }
  if (provider && provider !== 'all') {
    rows = rows.filter((r) => {
      const p = queryOne('SELECT first_name, last_name FROM users WHERE id = ?', String(r.provider_id));
      return p && `Dr. ${p.first_name} ${p.last_name}` === provider;
    });
  }
  res.json(rows.map(mapAppointment));
});

appointmentsRouter.get('/:id', authRequired, (req, res) => {
  const id = String(req.params.id);
  if (!assertAppointmentAccess(req, res, id)) return;
  const row = queryOne('SELECT * FROM appointments WHERE id = ?', id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(mapAppointment(row));
});

appointmentsRouter.post('/', authRequired, (req, res) => {
  const id = uuid();
  const { patientId, firstName, lastName, dateOfBirth, gender, phone, email,
    reasonForVisit, serviceMode, scheduledTime, locationId, providerId, visitType } = req.body;

  let pid = patientId as string | undefined;
  const linkedPatientId = req.user ? getLinkedPatientId(req.user) : null;
  if (linkedPatientId) {
    pid = linkedPatientId;
  } else if (!pid) {
    pid = uuid();
    execute(`INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      pid, firstName, lastName, dateOfBirth, gender ?? 'unknown', phone, email);
  }

  execute(`INSERT INTO appointments (id, patient_id, status, service_mode, reason_for_visit, scheduled_time, location_id, provider_id, visit_type) VALUES (?, ?, 'prebooked', ?, ?, ?, ?, ?, ?)`,
    id, pid, serviceMode ?? 'in-person', reasonForVisit, scheduledTime, locationId, providerId, visitType ?? 'New Patient');

  assignPaperworkToAppointment(id);

  const row = queryOne('SELECT * FROM appointments WHERE id = ?', id)!;
  res.status(201).json(mapAppointment(row));
});

appointmentsRouter.patch('/:id/status', authRequired, (req, res) => {
  const id = String(req.params.id);
  const { status } = req.body;
  const checkInTime = status === 'in-office' ? new Date().toISOString() : null;
  execute('UPDATE appointments SET status = ?, check_in_time = COALESCE(?, check_in_time) WHERE id = ?', status, checkInTime, id);

  if (status === 'in-office') {
    const appt = queryOne('SELECT * FROM appointments WHERE id = ?', id);
    const existing = queryOne('SELECT id FROM encounters WHERE appointment_id = ?', id);
    if (!existing && appt) {
      execute(`INSERT INTO encounters (id, appointment_id, patient_id, status, chief_complaint) VALUES (?, ?, ?, 'in-progress', ?)`,
        uuid(), id, String(appt.patient_id), String(appt.reason_for_visit));
    }
  }

  const row = queryOne('SELECT * FROM appointments WHERE id = ?', id)!;
  res.json(mapAppointment(row));
});

appointmentsRouter.post('/:id/check-in', authRequired, (req, res) => {
  const id = String(req.params.id);
  if (!assertAppointmentAccess(req, res, id)) return;
  execute("UPDATE appointments SET status = 'in-office', check_in_time = datetime('now') WHERE id = ? AND status = 'prebooked'", id);
  const appt = queryOne('SELECT * FROM appointments WHERE id = ?', id);
  if (!appt) { res.status(404).json({ error: 'Not found' }); return; }
  const existing = queryOne('SELECT id FROM encounters WHERE appointment_id = ?', id);
  if (!existing) {
    execute(`INSERT INTO encounters (id, appointment_id, patient_id, status, chief_complaint) VALUES (?, ?, ?, 'in-progress', ?)`,
      uuid(), id, String(appt.patient_id), String(appt.reason_for_visit));
  }
  res.json(mapAppointment(appt));
});

appointmentsRouter.patch('/:id/cancel', authRequired, (req, res) => {
  const id = String(req.params.id);
  if (!assertAppointmentAccess(req, res, id)) return;
  execute("UPDATE appointments SET status = 'cancelled' WHERE id = ?", id);
  const row = queryOne('SELECT * FROM appointments WHERE id = ?', id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(mapAppointment(row));
});

appointmentsRouter.patch('/:id/reschedule', authRequired, (req, res) => {
  const id = String(req.params.id);
  if (!assertAppointmentAccess(req, res, id)) return;
  const { scheduledTime, providerId, locationId } = req.body;
  execute(
    'UPDATE appointments SET scheduled_time = COALESCE(?, scheduled_time), provider_id = COALESCE(?, provider_id), location_id = COALESCE(?, location_id), status = \'prebooked\' WHERE id = ?',
    scheduledTime, providerId, locationId, id,
  );
  const row = queryOne('SELECT * FROM appointments WHERE id = ?', id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(mapAppointment(row));
});
