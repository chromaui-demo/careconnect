import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const encountersRouter = Router();
encountersRouter.use(authRequired);

encountersRouter.get('/by-appointment/:appointmentId', (req, res) => {
  const row = queryOne('SELECT * FROM encounters WHERE appointment_id = ?', String(req.params.appointmentId));
  if (!row) { res.status(404).json({ error: 'Encounter not found' }); return; }
  res.json(mapEncounter(row));
});

encountersRouter.put('/:id/chart-data', (req, res) => {
  const { chiefComplaint, vitals, allergies, medications, hpi, assessment, plan } = req.body;
  execute(`UPDATE encounters SET chief_complaint = COALESCE(?, chief_complaint), vitals_json = COALESCE(?, vitals_json),
    allergies_json = COALESCE(?, allergies_json), medications_json = COALESCE(?, medications_json),
    hpi = COALESCE(?, hpi), assessment = COALESCE(?, assessment), plan = COALESCE(?, plan) WHERE id = ?`,
    chiefComplaint, vitals ? JSON.stringify(vitals) : null, allergies ? JSON.stringify(allergies) : null,
    medications ? JSON.stringify(medications) : null,     hpi, assessment, plan, String(req.params.id));
  res.json(mapEncounter(queryOne('SELECT * FROM encounters WHERE id = ?', String(req.params.id))!));
});

encountersRouter.post('/:id/sign', (req, res) => {
  const id = String(req.params.id);
  execute(`UPDATE encounters SET status = 'signed', signed_at = datetime('now'), signed_by = ? WHERE id = ?`, req.user!.id, id);
  execute(`UPDATE appointments SET status = 'completed' WHERE id = (SELECT appointment_id FROM encounters WHERE id = ?)`, id);
  res.json(mapEncounter(queryOne('SELECT * FROM encounters WHERE id = ?', id)!));
});

function mapEncounter(row: Record<string, unknown>) {
  return {
    id: row.id, appointmentId: row.appointment_id, patientId: row.patient_id, status: row.status,
    chiefComplaint: row.chief_complaint,
    vitals: row.vitals_json ? JSON.parse(String(row.vitals_json)) : undefined,
    allergies: row.allergies_json ? JSON.parse(String(row.allergies_json)) : [],
    medications: row.medications_json ? JSON.parse(String(row.medications_json)) : [],
    hpi: row.hpi, assessment: row.assessment, plan: row.plan,
    signedAt: row.signed_at, signedBy: row.signed_by,
  };
}

export const tasksRouter = Router();
tasksRouter.use(authRequired);

tasksRouter.get('/', (req, res) => {
  const status = req.query.status as string | undefined;
  let rows = queryAll(`SELECT t.*, u.first_name || ' ' || u.last_name as assignee_name, p.first_name || ' ' || p.last_name as patient_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN patients p ON p.id = t.patient_id ORDER BY t.created_at DESC`);
  if (status) rows = rows.filter((r) => r.status === status);
  res.json(rows.map((t) => ({
    id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
    assigneeId: t.assignee_id, assigneeName: t.assignee_name, patientId: t.patient_id,
    patientName: t.patient_name, dueDate: t.due_date, createdAt: t.created_at,
  })));
});

tasksRouter.post('/', (req, res) => {
  const { title, description, priority, assigneeId, patientId, dueDate } = req.body;
  const id = uuid();
  execute('INSERT INTO tasks (id, title, description, priority, assignee_id, patient_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, title, description ?? '', priority ?? 'normal', assigneeId ?? null, patientId ?? null, dueDate ?? null);
  res.status(201).json({ id });
});

tasksRouter.patch('/:id', (req, res) => {
  const { status, assigneeId, priority } = req.body;
  execute('UPDATE tasks SET status = COALESCE(?, status), assignee_id = COALESCE(?, assignee_id), priority = COALESCE(?, priority) WHERE id = ?',
    status, assigneeId, priority, String(req.params.id));
  res.json({ ok: true });
});

export const reportsRouter = Router();
reportsRouter.use(authRequired);

reportsRouter.get('/incomplete-encounters', (_req, res) => {
  const rows = queryAll("SELECT e.*, p.first_name, p.last_name FROM encounters e JOIN patients p ON p.id = e.patient_id WHERE e.status = 'in-progress'");
  res.json(rows.map((r) => ({ id: r.id, patientName: `${r.first_name} ${r.last_name}`, status: r.status, chiefComplaint: r.chief_complaint })));
});

reportsRouter.get('/recent-patients', (_req, res) => {
  res.json(queryAll('SELECT id, first_name, last_name, created_at FROM patients ORDER BY created_at DESC LIMIT 20').map((p) => ({
    id: p.id, name: `${p.first_name} ${p.last_name}`, createdAt: p.created_at,
  })));
});

reportsRouter.get('/daily-payments', (_req, res) => {
  res.json(queryAll("SELECT id, payer_name, total_amount, submitted_at FROM claims WHERE status = 'submitted' ORDER BY submitted_at DESC LIMIT 30").map((c) => ({
    claimId: c.id, payer: c.payer_name, amount: c.total_amount, date: c.submitted_at,
  })));
});

reportsRouter.get('/kpis', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    totalAppointments: queryAll('SELECT id FROM appointments').length,
    inOffice: queryAll("SELECT id FROM appointments WHERE status = 'in-office'").length,
    completedToday: queryAll("SELECT id FROM appointments WHERE status = 'completed'").length,
    appointmentsToday: queryAll('SELECT id FROM appointments WHERE scheduled_time LIKE ?', `${today}%`).length,
    openTasks: queryAll("SELECT id FROM tasks WHERE status = 'open'").length,
  });
});

