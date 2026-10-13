import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { DEFAULT_QUESTIONNAIRES } from '@careconnect/types';
import { initDb } from './schema.js';
import { execute, queryCount, queryOne, queryAll } from './helpers.js';
import { seedParityDefaults } from './parity-migrate.js';
import { ensureDemoPatientWorkflows } from './demo-patient-data.js';
import { seededPassword } from './seeded-password.js';

export function seedDatabase() {
  initDb();
  seedParityDefaults();

  if (queryCount('SELECT COUNT(*) as c FROM users') > 0) {
    console.log('Database already seeded.');
    return;
  }

  const password = seededPassword();
  const hash = bcrypt.hashSync(password, 10);

  const users = [
    { id: uuid(), email: 'admin@se-tools.net', first: 'Admin', last: 'User', role: 'Administrator' },
    { id: uuid(), email: 'dr.chen@se-tools.net', first: 'Sarah', last: 'Chen', role: 'Provider' },
    { id: uuid(), email: 'dr.torres@se-tools.net', first: 'Michael', last: 'Torres', role: 'Provider' },
    { id: uuid(), email: 'staff@se-tools.net', first: 'Lisa', last: 'Wong', role: 'Staff' },
    { id: uuid(), email: 'billing@se-tools.net', first: 'Rita', last: 'Alvarez', role: 'Billing' },
    { id: uuid(), email: 'manager@se-tools.net', first: 'James', last: 'Patel', role: 'Manager' },
  ];

  for (const u of users) {
    execute('INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      u.id, u.email, hash, u.first, u.last, u.role);
  }

  const locMain = uuid();
  const locWest = uuid();
  execute('INSERT INTO locations (id, name, address, phone) VALUES (?, ?, ?, ?)', locMain, 'Main Clinic', '100 Main Street, Springfield, IL 62701', '(555) 100-0000');
  execute('INSERT INTO locations (id, name, address, phone) VALUES (?, ?, ?, ?)', locWest, 'Urgent Care West', '450 West Ave, Springfield, IL 62704', '(555) 200-0000');

  for (const s of [
    { name: 'Urgent Care Visit', mode: 'in-person', desc: 'In-person urgent care' },
    { name: 'Virtual Visit', mode: 'virtual', desc: 'Telemedicine appointment' },
    { name: 'Follow-up', mode: 'in-person', desc: 'Follow-up visit' },
    { name: 'Annual Physical', mode: 'in-person', desc: 'Preventive care' },
  ]) {
    execute('INSERT INTO service_categories (id, name, mode, description) VALUES (?, ?, ?, ?)', uuid(), s.name, s.mode, s.desc);
  }

  const providers = users.filter((u) => u.role === 'Provider');
  for (let day = 1; day <= 5; day++) {
    for (const p of providers) {
      execute('INSERT INTO schedules (id, practitioner_id, location_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
        uuid(), p.id, locMain, day, '08:00', '17:00');
    }
  }

  const FIRST = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona'];
  const LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

  for (let i = 0; i < 12; i++) {
    const year = 1960 + (i * 7) % 40;
    const first = FIRST[i % 6];
    const last = LAST[i % 6];
    const portalEmail = i < 2
      ? `${first.toLowerCase()}.${last.toLowerCase()}@se-tools.net`
      : `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    execute(`INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, phone, email, address_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(), first, last, `${year}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      i % 2 === 0 ? 'female' : 'male', `(555) ${100 + i}-${1000 + i * 11}`, portalEmail,
      JSON.stringify({ line: `${100 + i * 10} Main St`, city: 'Springfield', state: 'IL', zip: '62701' }));
  }

  execute('INSERT INTO insurance_payers (id, name, payer_id) VALUES (?, ?, ?)', uuid(), 'Blue Cross Blue Shield', 'BCBS');
  execute('INSERT INTO insurance_payers (id, name, payer_id) VALUES (?, ?, ?)', uuid(), 'Aetna', 'AETNA');

  for (const q of DEFAULT_QUESTIONNAIRES) {
    execute('INSERT INTO questionnaires (id, title, slug, schema_json) VALUES (?, ?, ?, ?)',
      uuid(), q.title, q.slug, JSON.stringify(q.schema));
  }

  const demoPatients = queryAll('SELECT id, first_name, last_name FROM patients ORDER BY created_at LIMIT 2');
  for (const p of demoPatients) {
    const email = `${String(p.first_name).toLowerCase()}.${String(p.last_name).toLowerCase()}@se-tools.net`;
    execute('INSERT INTO users (id, email, password_hash, first_name, last_name, role, patient_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), email, hash, String(p.first_name), String(p.last_name), 'Patient', String(p.id));
  }

  execute('INSERT INTO tasks (id, title, status, priority, assignee_id) VALUES (?, ?, ?, ?, ?)', uuid(), 'Review unsigned encounter', 'open', 'high', users[3].id);
  execute('INSERT INTO tasks (id, title, status, priority, assignee_id) VALUES (?, ?, ?, ?, ?)', uuid(), 'Verify insurance eligibility', 'open', 'normal', users[3].id);

  ensureDemoPatientWorkflows();

  // Print the password only when it is the public local default; a deployed one stays out of logs.
  const shown = process.env.SEEDED_PASSWORD ? '(SEEDED_PASSWORD)' : password;
  console.log('Database seeded. Staff: admin@se-tools.net /', shown);
  console.log('Billing: billing@se-tools.net, Manager: manager@se-tools.net /', shown);
  console.log('Patient portal: alice.smith@se-tools.net / bob.johnson@se-tools.net /', shown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}
