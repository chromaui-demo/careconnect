import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { DATA_DIR, DB_PATH } from './paths.js';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL,
      patient_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS service_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      practitioner_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slot_minutes INTEGER NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      status TEXT NOT NULL,
      service_mode TEXT NOT NULL,
      reason_for_visit TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      check_in_time TEXT,
      location_id TEXT,
      provider_id TEXT,
      visit_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      appointment_id TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      status TEXT NOT NULL,
      chief_complaint TEXT,
      vitals_json TEXT,
      allergies_json TEXT,
      medications_json TEXT,
      hpi TEXT,
      assessment TEXT,
      plan TEXT,
      signed_at TEXT,
      signed_by TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal',
      assignee_id TEXT,
      patient_id TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questionnaires (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      schema_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS insurance_payers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      payer_id TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS paperwork_responses (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL,
      questionnaire_id TEXT NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '{}',
      completed INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT,
      UNIQUE(appointment_id, questionnaire_id)
    );

    CREATE TABLE IF NOT EXISTS telemed_sessions (
      id TEXT PRIMARY KEY,
      appointment_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      room_id TEXT NOT NULL,
      patient_joined_at TEXT,
      provider_joined_at TEXT,
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lab_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ordered',
      ordered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      lab_order_id TEXT NOT NULL,
      result_value TEXT,
      result_unit TEXT,
      abnormal INTEGER DEFAULT 0,
      resulted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS erx_orders (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      medication TEXT NOT NULL,
      dosage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      pharmacy TEXT,
      ordered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patient_insurance (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      payer_name TEXT,
      member_id TEXT,
      group_number TEXT,
      subscriber_name TEXT
    );

    CREATE TABLE IF NOT EXISTS telemed_signals (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL,
      from_role TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      payer_name TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      submitted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS claim_line_items (
      id TEXT PRIMARY KEY,
      claim_id TEXT NOT NULL,
      cpt_code TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      units INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS eras (
      id TEXT PRIMARY KEY,
      payer_name TEXT NOT NULL,
      check_number TEXT,
      total_amount REAL NOT NULL,
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS era_payments (
      id TEXT PRIMARY KEY,
      era_id TEXT NOT NULL,
      claim_id TEXT,
      patient_name TEXT,
      paid_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unmatched'
    );

    CREATE TABLE IF NOT EXISTS charge_item_definitions (
      id TEXT PRIMARY KEY,
      cpt_code TEXT NOT NULL,
      description TEXT NOT NULL,
      default_amount REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS fax_outbound (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      recipient_fax TEXT NOT NULL,
      subject TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      pages INTEGER DEFAULT 1,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fax_inbound (
      id TEXT PRIMARY KEY,
      sender_fax TEXT NOT NULL,
      patient_id TEXT,
      status TEXT NOT NULL DEFAULT 'unmatched',
      pages INTEGER DEFAULT 1,
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_scribe_sessions (
      id TEXT PRIMARY KEY,
      encounter_id TEXT NOT NULL,
      transcript TEXT,
      generated_hpi TEXT,
      generated_assessment TEXT,
      generated_plan TEXT,
      status TEXT NOT NULL DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS unsolicited_lab_results (
      id TEXT PRIMARY KEY,
      patient_name TEXT NOT NULL,
      test_name TEXT NOT NULL,
      result_value TEXT,
      result_unit TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_threads (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      provider_id TEXT,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT
    );

    CREATE TABLE IF NOT EXISTS refill_requests (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      medication TEXT NOT NULL,
      dosage TEXT,
      pharmacy TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      erx_order_id TEXT,
      notes TEXT,
      requested_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
