import { DEFAULT_QUESTIONNAIRES } from '@careconnect/types';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { execute, queryAll, queryOne } from './helpers.js';
import { assignPaperworkToAppointment } from '../services/paperwork.js';
import { ensureDemoPatientWorkflows } from './demo-patient-data.js';
import { seededPassword } from './seeded-password.js';

function ensurePatientPortalUsers() {
  // patient_id column now owned by migrations/0002-users-patient-id-column.ts —
  // db:migrate must run before this function is called against a fresh DB.
  const patients = queryAll('SELECT id, first_name, last_name FROM patients ORDER BY created_at LIMIT 2');
  for (const p of patients) {
    const email = `${String(p.first_name).toLowerCase()}.${String(p.last_name).toLowerCase()}@se-tools.net`;
    const existing = queryOne('SELECT id FROM users WHERE email = ?', email);
    if (!existing) {
      execute(
        'INSERT INTO users (id, email, password_hash, first_name, last_name, role, patient_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        uuid(), email, bcrypt.hashSync(seededPassword(), 10), String(p.first_name), String(p.last_name), 'Patient', String(p.id),
      );
    } else {
      execute('UPDATE users SET role = ?, patient_id = ? WHERE email = ?', 'Patient', String(p.id), email);
    }
  }
}

/** Apply module schema updates to existing databases without re-seeding. */
export function migrateModules() {
  // migrateParitySchema() now owned by migrations/0001-parity-schema.ts —
  // db:migrate must run before this function is called against a fresh DB.
  ensurePatientPortalUsers();
  for (const q of DEFAULT_QUESTIONNAIRES) {
    const existing = queryOne('SELECT id FROM questionnaires WHERE slug = ?', q.slug);
    if (existing) {
      execute('UPDATE questionnaires SET title = ?, schema_json = ? WHERE slug = ?',
        q.title, JSON.stringify(q.schema), q.slug);
    } else {
      execute('INSERT INTO questionnaires (id, title, slug, schema_json) VALUES (?, ?, ?, ?)',
        uuid(), q.title, q.slug, JSON.stringify(q.schema));
    }
  }

  for (const a of queryAll('SELECT id FROM appointments')) {
    assignPaperworkToAppointment(String(a.id));
  }

  if (queryAll('SELECT id FROM charge_item_definitions').length === 0) {
    const charges = [
      { cpt: '99213', desc: 'Office visit, established, low', amt: 125 },
      { cpt: '99214', desc: 'Office visit, established, moderate', amt: 185 },
      { cpt: '99203', desc: 'Office visit, new, low', amt: 165 },
      { cpt: '87880', desc: 'Strep test', amt: 45 },
      { cpt: '85025', desc: 'CBC with diff', amt: 35 },
    ];
    for (const c of charges) {
      execute('INSERT INTO charge_item_definitions (id, cpt_code, description, default_amount) VALUES (?, ?, ?, ?)',
        uuid(), c.cpt, c.desc, c.amt);
    }
  }

  if (queryAll('SELECT id FROM fax_inbound').length === 0) {
    execute('INSERT INTO fax_inbound (id, sender_fax, status, pages) VALUES (?, ?, ?, ?)', uuid(), '(555) 900-1234', 'unmatched', 3);
    execute('INSERT INTO fax_inbound (id, sender_fax, status, pages) VALUES (?, ?, ?, ?)', uuid(), '(555) 900-5678', 'unmatched', 1);
  }

  if (queryAll('SELECT id FROM unsolicited_lab_results').length === 0) {
    execute('INSERT INTO unsolicited_lab_results (id, patient_name, test_name, result_value, result_unit) VALUES (?, ?, ?, ?, ?)',
      uuid(), 'Unknown Patient', 'Lipid Panel', '220', 'mg/dL');
    execute('INSERT INTO unsolicited_lab_results (id, patient_name, test_name, result_value, result_unit) VALUES (?, ?, ?, ?, ?)',
      uuid(), 'J. Smith', 'HbA1c', '6.2', '%');
  }

  if (queryAll('SELECT id FROM eras').length === 0) {
    const eraId = uuid();
    execute('INSERT INTO eras (id, payer_name, check_number, total_amount) VALUES (?, ?, ?, ?)', eraId, 'Blue Cross Blue Shield', 'CHK-88421', 2450.00);
    execute('INSERT INTO era_payments (id, era_id, patient_name, paid_amount, status) VALUES (?, ?, ?, ?, ?)',
      uuid(), eraId, 'Alice Smith', 125.00, 'unmatched');
    execute('INSERT INTO era_payments (id, era_id, patient_name, paid_amount, status) VALUES (?, ?, ?, ?, ?)',
      uuid(), eraId, 'Bob Johnson', 185.00, 'unmatched');
  }

  if (queryAll('SELECT id FROM claims').length === 0) {
    const enc = queryOne('SELECT id, patient_id FROM encounters LIMIT 1');
    if (enc) {
      const claimId = uuid();
      execute('INSERT INTO claims (id, encounter_id, patient_id, status, payer_name, total_amount) VALUES (?, ?, ?, ?, ?, ?)',
        claimId, String(enc.id), String(enc.patient_id), 'draft', 'Blue Cross Blue Shield', 310);
      execute('INSERT INTO claim_line_items (id, claim_id, cpt_code, description, amount) VALUES (?, ?, ?, ?, ?)',
        uuid(), claimId, '99213', 'Office visit', 125);
      execute('INSERT INTO claim_line_items (id, claim_id, cpt_code, description, amount) VALUES (?, ?, ?, ?, ?)',
        uuid(), claimId, '87880', 'Strep test', 45);
    }
  }

  ensureDemoPatientWorkflows();
}
