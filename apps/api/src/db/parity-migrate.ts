import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from './helpers.js';

function columnExists(table: string, column: string) {
  return queryAll(`PRAGMA table_info(${table})`).some((c) => c.name === column);
}

function tableExists(table: string) {
  return !!queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name=?", table);
}

export function migrateParitySchema() {
  if (!columnExists('encounters', 'extended_chart_json')) {
    execute('ALTER TABLE encounters ADD COLUMN extended_chart_json TEXT');
  }
  if (!columnExists('claims', 'ar_stage')) {
    execute("ALTER TABLE claims ADD COLUMN ar_stage TEXT NOT NULL DEFAULT 'insurance'");
  }
  if (!columnExists('claims', 'claim_type')) {
    execute("ALTER TABLE claims ADD COLUMN claim_type TEXT NOT NULL DEFAULT 'professional'");
  }
  if (!columnExists('claims', 'notes_json')) {
    execute("ALTER TABLE claims ADD COLUMN notes_json TEXT NOT NULL DEFAULT '[]'");
  }

  dbExec(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      file_name TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS billing_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      npi TEXT,
      tax_id TEXT,
      organization INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS rendering_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      npi TEXT,
      specialty TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS service_facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      npi TEXT,
      address TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS billing_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#457B9D'
    );
    CREATE TABLE IF NOT EXISTS claim_tag_links (
      claim_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (claim_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS claim_notes (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      body TEXT NOT NULL,
      author_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS claim_diagnoses (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      icd_code TEXT NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS billing_rules (
      id TEXT PRIMARY KEY,
      engine TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      conditions_json TEXT NOT NULL DEFAULT '{}',
      actions_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS external_lab_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      lab_name TEXT,
      status TEXT NOT NULL DEFAULT 'ordered',
      ordered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inhouse_lab_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ordered',
      result_value TEXT,
      result_unit TEXT,
      ordered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS radiology_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      study_name TEXT NOT NULL,
      modality TEXT,
      status TEXT NOT NULL DEFAULT 'ordered',
      result_summary TEXT,
      ordered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS manual_payments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      claim_id TEXT,
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'cash',
      note TEXT,
      paid_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS patient_coverages (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      payer_name TEXT NOT NULL,
      member_id TEXT,
      group_number TEXT,
      rank INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
}

function dbExec(sql: string) {
  for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
    execute(stmt);
  }
}

export function seedParityDefaults() {
  if (queryAll('SELECT id FROM billing_providers').length === 0) {
    execute('INSERT INTO billing_providers (id, name, npi, organization) VALUES (?, ?, ?, ?)', uuid(), 'CareConnect Medical Group', '1234567890', 1);
  }
  if (queryAll('SELECT id FROM rendering_providers').length === 0) {
    execute('INSERT INTO rendering_providers (id, name, npi, specialty) VALUES (?, ?, ?, ?)', uuid(), 'Dr. Sarah Chen', '1111111111', 'Family Medicine');
    execute('INSERT INTO rendering_providers (id, name, npi, specialty) VALUES (?, ?, ?, ?)', uuid(), 'Dr. Michael Torres', '2222222222', 'Internal Medicine');
  }
  if (queryAll('SELECT id FROM service_facilities').length === 0) {
    execute('INSERT INTO service_facilities (id, name, npi, address) VALUES (?, ?, ?, ?)', uuid(), 'Main Clinic', '3333333333', '100 Health Way');
  }
  if (queryAll('SELECT id FROM billing_tags').length === 0) {
    execute('INSERT INTO billing_tags (id, name, color) VALUES (?, ?, ?)', uuid(), 'Hold', '#E07A5F');
    execute('INSERT INTO billing_tags (id, name, color) VALUES (?, ?, ?)', uuid(), 'Ready', '#2A9D8F');
  }
  if (queryAll('SELECT id FROM billing_rules').length === 0) {
    const rules = [
      { engine: 'claim-submission', name: 'Require payer', sort: 1, actions: [{ type: 'setField', field: 'status', value: 'ready' }] },
      { engine: 'claim-submission', name: 'Submit when ready', sort: 2, actions: [{ type: 'setField', field: 'status', value: 'submitted' }] },
      { engine: 'patient-ar-pre-invoice', name: 'Mark ready to invoice', sort: 1, actions: [{ type: 'applyTag', tag: 'Ready' }] },
      { engine: 'non-insurance-payer-pre-invoice', name: 'Mark ready to invoice', sort: 1, actions: [{ type: 'applyTag', tag: 'Ready' }] },
    ];
    for (const r of rules) {
      execute('INSERT INTO billing_rules (id, engine, name, sort_order, conditions_json, actions_json) VALUES (?, ?, ?, ?, ?, ?)',
        uuid(), r.engine, r.name, r.sort, '{}', JSON.stringify(r.actions));
    }
  }
  if (tableExists('patient_coverages') && queryAll('SELECT id FROM patient_coverages').length === 0) {
    const patients = queryAll('SELECT id FROM patients LIMIT 3');
    for (const p of patients) {
      execute('INSERT INTO patient_coverages (id, patient_id, payer_name, member_id, rank) VALUES (?, ?, ?, ?, ?)',
        uuid(), String(p.id), 'Blue Cross Blue Shield', 'MEM-' + String(p.id).slice(0, 6), 1);
    }
  }
}
