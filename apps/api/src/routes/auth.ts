import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired, requireRoles, signToken, type AuthUser } from '../middleware/auth.js';

export const authRouter = Router();

function mapAuthUser(row: Record<string, unknown>): AuthUser {
  const user: AuthUser = {
    id: String(row.id),
    email: String(row.email),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    role: row.role as AuthUser['role'],
  };
  if (row.patient_id) user.patientId = String(row.patient_id);
  return user;
}

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const row = queryOne('SELECT id, email, password_hash, first_name, last_name, role, patient_id FROM users WHERE email = ? AND active = 1', email);
  if (!row || !bcrypt.compareSync(password, String(row.password_hash))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const user = mapAuthUser(row);
  res.json({ token: signToken(user), user });
});

authRouter.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

export const adminRouter = Router();
adminRouter.use(authRequired, requireRoles('Administrator', 'Manager', 'CustomerSupport'));

adminRouter.get('/employees', (_req, res) => {
  res.json(queryAll('SELECT id, email, first_name, last_name, role, active, created_at FROM users ORDER BY last_name').map(mapUser));
});

adminRouter.post('/employees', (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  // No default: a fallback would give new accounts the public demo password.
  if (typeof password !== 'string' || password.length < 12) {
    res.status(400).json({ error: 'password is required (min 12 characters)' });
    return;
  }
  const id = uuid();
  execute('INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
    id, email, bcrypt.hashSync(password, 10), firstName, lastName, role ?? 'Staff');
  res.status(201).json({ id });
});

adminRouter.get('/locations', (_req, res) => res.json(queryAll('SELECT * FROM locations ORDER BY name')));
adminRouter.get('/service-categories', (_req, res) => res.json(queryAll('SELECT * FROM service_categories ORDER BY name')));
adminRouter.get('/schedules', (_req, res) => res.json(queryAll(`
    SELECT s.*, u.first_name || ' ' || u.last_name as practitioner_name, l.name as location_name
    FROM schedules s JOIN users u ON u.id = s.practitioner_id JOIN locations l ON l.id = s.location_id
    ORDER BY s.day_of_week, s.start_time`)));
adminRouter.get('/insurance-payers', (_req, res) => res.json(queryAll('SELECT * FROM insurance_payers WHERE active = 1')));
adminRouter.get('/questionnaires', (_req, res) => res.json(queryAll('SELECT id, title, slug, active FROM questionnaires')));
adminRouter.get('/questionnaires/:id', (req, res) => {
  const row = queryOne('SELECT * FROM questionnaires WHERE id = ? OR slug = ?', String(req.params.id), String(req.params.id));
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ id: row.id, title: row.title, slug: row.slug, active: row.active === 1, schema: JSON.parse(String(row.schema_json)) });
});
adminRouter.post('/questionnaires', (req, res) => {
  const { title, slug, schema } = req.body;
  const id = uuid();
  execute('INSERT INTO questionnaires (id, title, slug, schema_json) VALUES (?, ?, ?, ?)', id, title, slug, JSON.stringify(schema));
  res.status(201).json({ id });
});
adminRouter.put('/questionnaires/:id', (req, res) => {
  const { title, slug, schema, active } = req.body;
  execute(
    'UPDATE questionnaires SET title = COALESCE(?, title), slug = COALESCE(?, slug), schema_json = COALESCE(?, schema_json), active = COALESCE(?, active) WHERE id = ?',
    title, slug, schema ? JSON.stringify(schema) : null, active, String(req.params.id),
  );
  res.json({ ok: true });
});
adminRouter.delete('/questionnaires/:id', (req, res) => {
  execute('UPDATE questionnaires SET active = 0 WHERE id = ?', String(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/audit-logs', (_req, res) => res.json(queryAll('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').map((a) => ({
  id: a.id, action: a.action, resource_type: a.resource_type, created_at: a.created_at,
}))));

adminRouter.post('/locations', (req, res) => {
  const { name, address, phone } = req.body;
  const id = uuid();
  execute('INSERT INTO locations (id, name, address, phone) VALUES (?, ?, ?, ?)', id, name, address, phone);
  res.status(201).json({ id });
});

adminRouter.post('/schedules', (req, res) => {
  const { practitionerId, locationId, dayOfWeek, startTime, endTime } = req.body;
  const id = uuid();
  execute('INSERT INTO schedules (id, practitioner_id, location_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
    id, practitionerId, locationId, dayOfWeek, startTime, endTime);
  res.status(201).json({ id });
});

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name,
    role: row.role, active: row.active === 1, createdAt: row.created_at,
  };
}
