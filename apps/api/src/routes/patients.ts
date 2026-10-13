import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const patientsRouter = Router();
patientsRouter.use(authRequired);

patientsRouter.get('/', (req, res) => {
  const search = (req.query.search as string)?.toLowerCase();
  let rows = queryAll('SELECT * FROM patients ORDER BY last_name, first_name');
  if (search) {
    rows = rows.filter((p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search) ||
      String(p.email ?? '').toLowerCase().includes(search));
  }
  res.json(rows.map(mapPatient));
});

patientsRouter.get('/:id', (req, res) => {
  const row = queryOne('SELECT * FROM patients WHERE id = ?', String(req.params.id));
  if (!row) { res.status(404).json({ error: 'Patient not found' }); return; }
  res.json(mapPatient(row));
});

patientsRouter.post('/', (req, res) => {
  const id = uuid();
  const { firstName, lastName, dateOfBirth, gender, phone, email, address } = req.body;
  execute(`INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email, address_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id, firstName, lastName, dateOfBirth, gender ?? 'unknown', phone, email, address ? JSON.stringify(address) : null);
  res.status(201).json({ id });
});

function mapPatient(row: Record<string, unknown>) {
  return {
    id: row.id, firstName: row.first_name, lastName: row.last_name,
    dateOfBirth: row.date_of_birth, gender: row.gender, phone: row.phone, email: row.email,
    address: row.address_json ? JSON.parse(String(row.address_json)) : undefined,
    createdAt: row.created_at,
  };
}
