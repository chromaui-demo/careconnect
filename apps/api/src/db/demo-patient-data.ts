import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from './helpers.js';
import { assignPaperworkToAppointment } from '../services/paperwork.js';

/** Demo marker prefix — idempotent tags in reason_for_visit. */
const DEMO = '[demo]';
const HISTORY_DAYS = 90;

type DemoPatientSpec = {
  firstName: string;
  lastName: string;
  email: string;
  payerName: string;
  memberId: string;
  pharmacy: string;
  medications: Array<{ medication: string; dosage: string }>;
  pendingRefillMed: string;
  approvedRefillMed: string;
  claimAmount: number;
  partialPayment: number;
  hasPortal: boolean;
  providerIndex: number;
  patientIndex: number;
};

type TimelineVisit = {
  tag: string;
  daysAgo: number;
  status: 'completed' | 'cancelled' | 'prebooked' | 'in-office';
  serviceMode?: 'in-person' | 'virtual';
  visitType: string;
  signed?: boolean;
  clinical?: boolean;
  claimStatus?: 'submitted' | 'draft';
  withPayment?: boolean;
};

type MessageSpec = {
  tag: string;
  daysAgo: number;
  subject: string;
  providerMessage: string;
  patientMessage: string;
};

const MED_POOL = [
  [{ medication: 'Lisinopril', dosage: '10mg daily' }, { medication: 'Metformin', dosage: '500mg twice daily' }],
  [{ medication: 'Atorvastatin', dosage: '20mg nightly' }, { medication: 'Omeprazole', dosage: '20mg daily' }],
  [{ medication: 'Levothyroxine', dosage: '50mcg daily' }, { medication: 'Amlodipine', dosage: '5mg daily' }],
  [{ medication: 'Sertraline', dosage: '50mg daily' }, { medication: 'Ibuprofen', dosage: '400mg PRN' }],
  [{ medication: 'Albuterol', dosage: '2 puffs PRN' }, { medication: 'Fluticasone', dosage: '1 spray daily' }],
  [{ medication: 'Losartan', dosage: '25mg daily' }, { medication: 'Gabapentin', dosage: '300mg nightly' }],
];

const PAYERS = ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna'];
const PHARMACIES = ['Springfield Pharmacy', 'Westside Pharmacy', 'Main Street Rx', 'CareConnect Pharmacy'];

const PATIENT_TIMELINE: TimelineVisit[] = [
  { tag: 'hist-88d-physical', daysAgo: 88, status: 'completed', visitType: 'Annual Physical', signed: true, clinical: true, claimStatus: 'submitted', withPayment: true },
  { tag: 'hist-72d-virtual', daysAgo: 72, status: 'completed', serviceMode: 'virtual', visitType: 'Virtual Visit', signed: true, clinical: true, claimStatus: 'submitted', withPayment: true },
  { tag: 'hist-55d-followup', daysAgo: 55, status: 'completed', visitType: 'Follow-up', signed: true, clinical: true, claimStatus: 'submitted', withPayment: true },
  { tag: 'hist-38d-urgent', daysAgo: 38, status: 'completed', visitType: 'Urgent Care', signed: true, clinical: true, claimStatus: 'submitted' },
  { tag: 'hist-21d-followup', daysAgo: 21, status: 'completed', visitType: 'Follow-up', signed: true, clinical: true, claimStatus: 'submitted', withPayment: true },
  { tag: 'hist-12d-cancelled', daysAgo: 12, status: 'cancelled', visitType: 'New Patient' },
  { tag: 'current-in-office', daysAgo: 0, status: 'in-office', visitType: 'Urgent Care', clinical: true, claimStatus: 'draft' },
  { tag: 'current-upcoming-virtual', daysAgo: -5, status: 'prebooked', serviceMode: 'virtual', visitType: 'Virtual Visit' },
  { tag: 'current-upcoming-inperson', daysAgo: -16, status: 'prebooked', visitType: 'Follow-up' },
];

const ALICE_MESSAGES: MessageSpec[] = [
  { tag: 'msg-82d-labs', daysAgo: 82, subject: 'Annual lab review', providerMessage: 'Hi Alice, your annual labs look good overall. LDL is slightly elevated — continue current medications.', patientMessage: 'Thanks — should I adjust my diet?' },
  { tag: 'msg-48d-refill', daysAgo: 48, subject: 'Refill confirmation', providerMessage: 'Your Metformin refill was sent to Springfield Pharmacy.', patientMessage: 'Picked it up yesterday, thank you!' },
  { tag: 'msg-14d-results', daysAgo: 14, subject: 'Follow-up on lab results', providerMessage: 'Hi Alice, your recent lab work shows one value slightly outside the normal range. Please schedule a follow-up if you have concerns.', patientMessage: 'Thank you — I will book a visit this week.' },
];

const BOB_MESSAGES: MessageSpec[] = [
  { tag: 'msg-79d-lipids', daysAgo: 79, subject: 'Cholesterol update', providerMessage: 'Bob, your lipid panel improved since your last visit. Continue Atorvastatin.', patientMessage: 'Great news — any side effects I should watch for?' },
  { tag: 'msg-44d-scheduling', daysAgo: 44, subject: 'Appointment reminder', providerMessage: 'Reminder: your virtual follow-up is scheduled next week.', patientMessage: 'Confirmed — I will join from the portal link.' },
  { tag: 'msg-9d-meds', daysAgo: 9, subject: 'Medication question', providerMessage: 'Bob, your cholesterol panel improved since your last visit. Continue Atorvastatin and we will recheck in 3 months.', patientMessage: 'Sounds good — should I take it with food?' },
];

function isoDaysFromNow(daysAgo: number, hour = 10): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function getProviderId(index: number): string | null {
  const providers = queryAll("SELECT id FROM users WHERE role = 'Provider' ORDER BY email");
  return providers[index]?.id ? String(providers[index].id) : null;
}

function getLocationId(index: number): string | null {
  const locs = queryAll('SELECT id FROM locations ORDER BY name');
  return locs[index]?.id ? String(locs[index].id) : null;
}

function getStaffId(): string | null {
  const row = queryOne("SELECT id FROM users WHERE role = 'Staff' LIMIT 1");
  return row?.id ? String(row.id) : null;
}

function buildPatientSpec(row: Record<string, unknown>, index: number): DemoPatientSpec {
  const firstName = String(row.first_name);
  const lastName = String(row.last_name);
  const email = String(row.email ?? '');
  const meds = MED_POOL[index % MED_POOL.length];
  const payerName = PAYERS[index % PAYERS.length];
  const isAlice = firstName === 'Alice' && lastName === 'Smith';
  const isBob = firstName === 'Bob' && lastName === 'Johnson';
  const hasPortal = email.endsWith('@se-tools.net') || isAlice || isBob;

  return {
    firstName,
    lastName,
    email: hasPortal && !email.endsWith('@se-tools.net')
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@se-tools.net`
      : email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    payerName,
    memberId: `${payerName.slice(0, 4).toUpperCase()}-${firstName.toUpperCase()}-${100 + index}`,
    pharmacy: PHARMACIES[index % PHARMACIES.length],
    medications: meds,
    pendingRefillMed: meds[0].medication,
    approvedRefillMed: meds[1].medication,
    claimAmount: 125 + (index % 4) * 45,
    partialPayment: 40 + (index % 3) * 15,
    hasPortal,
    providerIndex: index % 2,
    patientIndex: index,
  };
}

function findPatient(spec: DemoPatientSpec): Record<string, unknown> | undefined {
  return queryOne(
    'SELECT * FROM patients WHERE first_name = ? AND last_name = ? LIMIT 1',
    spec.firstName,
    spec.lastName,
  );
}

function ensurePatientEmail(patientId: string, email: string) {
  execute('UPDATE patients SET email = ? WHERE id = ?', email, patientId);
}

function ensureCoverage(patientId: string, spec: DemoPatientSpec) {
  if (queryOne('SELECT id FROM patient_coverages WHERE patient_id = ? AND payer_name = ?', patientId, spec.payerName)) return;
  execute(
    'INSERT INTO patient_coverages (id, patient_id, payer_name, member_id, group_number, rank) VALUES (?, ?, ?, ?, ?, ?)',
    uuid(), patientId, spec.payerName, spec.memberId, 'GRP-DEMO', 1,
  );
}

function findDemoAppointment(patientId: string, tag: string): Record<string, unknown> | undefined {
  return queryOne(
    'SELECT * FROM appointments WHERE patient_id = ? AND reason_for_visit = ? LIMIT 1',
    patientId,
    `${DEMO} ${tag}`,
  );
}

function ensureAppointment(
  patientId: string,
  tag: string,
  opts: {
    status: string;
    serviceMode: string;
    daysAgo: number;
    providerIndex: number;
    locationIndex: number;
    visitType: string;
    withCheckIn?: boolean;
  },
): string {
  const existing = findDemoAppointment(patientId, tag);
  if (existing) return String(existing.id);

  const scheduled = isoDaysFromNow(opts.daysAgo, 9 + (opts.providerIndex % 3));
  const apptId = uuid();
  const checkIn = opts.withCheckIn
    ? new Date(new Date(scheduled).getTime() - 15 * 60 * 1000).toISOString()
    : null;

  execute(
    `INSERT INTO appointments (id, patient_id, status, service_mode, reason_for_visit, scheduled_time, check_in_time, location_id, provider_id, visit_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    apptId,
    patientId,
    opts.status,
    opts.serviceMode,
    `${DEMO} ${tag}`,
    scheduled,
    checkIn,
    getLocationId(opts.locationIndex),
    getProviderId(opts.providerIndex),
    opts.visitType,
  );
  assignPaperworkToAppointment(apptId);
  return apptId;
}

function ensureEncounter(
  appointmentId: string,
  patientId: string,
  opts: {
    status: string;
    signed?: boolean;
    signedDaysAgo?: number;
    allergies?: string[];
    medications?: string[];
    hpi?: string;
    assessment?: string;
    plan?: string;
  },
): string {
  const existing = queryOne('SELECT id FROM encounters WHERE appointment_id = ?', appointmentId);
  if (existing) return String(existing.id);

  const encId = uuid();
  const apptReason = queryOne('SELECT reason_for_visit FROM appointments WHERE id = ?', appointmentId);
  const chiefComplaint = apptReason?.reason_for_visit != null
    ? String(apptReason.reason_for_visit)
    : 'Demo visit';

  execute(
    `INSERT INTO encounters (id, appointment_id, patient_id, status, chief_complaint, vitals_json, allergies_json, medications_json, hpi, assessment, plan, signed_at, signed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    encId,
    appointmentId,
    patientId,
    opts.status,
    chiefComplaint,
    JSON.stringify({ temperature: 98.2, bloodPressureSystolic: 118, bloodPressureDiastolic: 76, heartRate: 72, respiratoryRate: 16, oxygenSaturation: 98 }),
    JSON.stringify(opts.allergies ?? []),
    JSON.stringify(opts.medications ?? []),
    opts.hpi ?? 'Patient reports stable symptoms. No acute distress.',
    opts.assessment ?? 'Stable chronic conditions; continue current management.',
    opts.plan ?? 'Follow up in 3 months. Continue medications.',
    opts.signed ? isoDaysFromNow(opts.signedDaysAgo ?? 0, 11) : null,
    opts.signed ? getProviderId(0) : null,
  );
  return encId;
}

function ensureTelemedSession(appointmentId: string) {
  if (queryOne('SELECT id FROM telemed_sessions WHERE appointment_id = ?', appointmentId)) return;
  execute(
    'INSERT INTO telemed_sessions (id, appointment_id, status, room_id) VALUES (?, ?, ?, ?)',
    uuid(), appointmentId, 'waiting', `room-${appointmentId.slice(0, 8)}`,
  );
}

function ensureClinicalOrders(encId: string, spec: DemoPatientSpec, daysAgo: number, includeScribe: boolean) {
  for (const med of spec.medications) {
    if (!queryOne('SELECT id FROM erx_orders WHERE encounter_id = ? AND medication = ?', encId, med.medication)) {
      execute(
        'INSERT INTO erx_orders (id, encounter_id, medication, dosage, status, pharmacy) VALUES (?, ?, ?, ?, ?, ?)',
        uuid(), encId, med.medication, med.dosage, 'active', spec.pharmacy,
      );
    }
  }

  const resultedAt = isoDaysFromNow(daysAgo - 2, 14);
  if (!queryOne('SELECT id FROM lab_orders WHERE encounter_id = ? AND test_name = ?', encId, 'CBC with differential')) {
    const cbcId = uuid();
    execute('INSERT INTO lab_orders (id, encounter_id, test_name, status) VALUES (?, ?, ?, ?)', cbcId, encId, 'CBC with differential', 'completed');
    execute('INSERT INTO lab_results (id, lab_order_id, result_value, result_unit, abnormal, resulted_at) VALUES (?, ?, ?, ?, ?, ?)',
      uuid(), cbcId, `${10.5 + (spec.patientIndex % 3) * 0.3}`, 'K/uL', 0, resultedAt);
    execute('INSERT INTO lab_results (id, lab_order_id, result_value, result_unit, abnormal, resulted_at) VALUES (?, ?, ?, ?, ?, ?)',
      uuid(), cbcId, `${4.5 + (spec.patientIndex % 2) * 0.4}`, 'K/uL', spec.patientIndex % 3 === 0 ? 1 : 0, resultedAt);
  }

  if (!queryOne('SELECT id FROM lab_orders WHERE encounter_id = ? AND test_name = ?', encId, 'Lipid panel')) {
    const lipidId = uuid();
    execute('INSERT INTO lab_orders (id, encounter_id, test_name, status) VALUES (?, ?, ?, ?)', lipidId, encId, 'Lipid panel', 'completed');
    execute('INSERT INTO lab_results (id, lab_order_id, result_value, result_unit, abnormal, resulted_at) VALUES (?, ?, ?, ?, ?, ?)',
      uuid(), lipidId, `${175 + spec.patientIndex * 8}`, 'mg/dL', spec.patientIndex % 2, resultedAt);
  }

  if (!queryOne('SELECT id FROM external_lab_orders WHERE encounter_id = ?', encId)) {
    execute(
      'INSERT INTO external_lab_orders (id, encounter_id, test_name, lab_name, status, ordered_at) VALUES (?, ?, ?, ?, ?, ?)',
      uuid(), encId, 'HbA1c', 'Quest Diagnostics', 'completed', isoDaysFromNow(daysAgo, 9),
    );
  }
  if (!queryOne('SELECT id FROM inhouse_lab_orders WHERE encounter_id = ?', encId)) {
    execute(
      'INSERT INTO inhouse_lab_orders (id, encounter_id, test_name, status, result_value, result_unit, ordered_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), encId, 'Rapid strep', 'completed', 'Negative', '', isoDaysFromNow(daysAgo, 9),
    );
  }
  if (!queryOne('SELECT id FROM radiology_orders WHERE encounter_id = ?', encId)) {
    execute(
      'INSERT INTO radiology_orders (id, encounter_id, study_name, modality, status, result_summary, ordered_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), encId, 'Chest X-ray', 'XR', 'completed', 'No acute cardiopulmonary process.', isoDaysFromNow(daysAgo, 9),
    );
  }
  if (includeScribe && !queryOne('SELECT id FROM ai_scribe_sessions WHERE encounter_id = ?', encId)) {
    execute(
      `INSERT INTO ai_scribe_sessions (id, encounter_id, transcript, generated_hpi, generated_assessment, generated_plan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuid(), encId,
      'Patient reports feeling well overall. Denies chest pain or shortness of breath.',
      'Stable follow-up visit. Chronic conditions well controlled.',
      'Hypertension — controlled. Hyperlipidemia — at goal.',
      'Continue current medications. Recheck labs in 3 months.',
      'applied',
    );
  }
}

function ensurePatientDocument(patientId: string, title: string, daysAgo: number) {
  if (queryOne('SELECT id FROM patient_documents WHERE patient_id = ? AND title = ?', patientId, title)) return;
  execute(
    'INSERT INTO patient_documents (id, patient_id, title, category, file_name, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)',
    uuid(), patientId, title, 'clinical', `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`, isoDaysFromNow(daysAgo, 8),
  );
}

function ensureFaxOutbound(patientId: string, subject: string, daysAgo: number) {
  if (queryOne('SELECT id FROM fax_outbound WHERE patient_id = ? AND subject = ?', patientId, subject)) return;
  execute(
    'INSERT INTO fax_outbound (id, patient_id, recipient_fax, subject, status, pages, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(), patientId, '(555) 400-2200', subject, 'delivered', 2, isoDaysFromNow(daysAgo, 15),
  );
}

function ensurePatientTask(patientId: string, title: string, daysAgo: number, status: string) {
  if (queryOne('SELECT id FROM tasks WHERE patient_id = ? AND title = ?', patientId, title)) return;
  execute(
    'INSERT INTO tasks (id, title, description, status, priority, assignee_id, patient_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(), title, 'Demo task for patient chart workflow', status, 'normal', getStaffId(), patientId, isoDaysFromNow(daysAgo, 8),
  );
}

function ensureMessageThread(patientId: string, spec: DemoPatientSpec, msg: MessageSpec) {
  if (queryOne('SELECT id FROM message_threads WHERE patient_id = ? AND subject = ?', patientId, msg.subject)) return;
  const threadId = uuid();
  execute(
    'INSERT INTO message_threads (id, patient_id, provider_id, subject, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    threadId, patientId, getProviderId(spec.providerIndex), msg.subject, msg.daysAgo <= 14 ? 'open' : 'closed', isoDaysFromNow(msg.daysAgo, 10),
  );
  execute('INSERT INTO messages (id, thread_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)',
    uuid(), threadId, 'provider', msg.providerMessage, isoDaysFromNow(msg.daysAgo, 10));
  execute('INSERT INTO messages (id, thread_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)',
    uuid(), threadId, 'patient', msg.patientMessage, isoDaysFromNow(msg.daysAgo - 1, 14));
}

function ensureGenericMessages(patientId: string, spec: DemoPatientSpec) {
  for (const daysAgo of [68, 41, 11]) {
    const subject = `Visit follow-up — ${daysAgo}d ago`;
    if (queryOne('SELECT id FROM message_threads WHERE patient_id = ? AND subject = ?', patientId, subject)) continue;
    const threadId = uuid();
    execute(
      'INSERT INTO message_threads (id, patient_id, provider_id, subject, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      threadId, patientId, getProviderId(spec.providerIndex), subject, daysAgo <= 14 ? 'open' : 'closed', isoDaysFromNow(daysAgo, 10),
    );
    execute('INSERT INTO messages (id, thread_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)',
      uuid(), threadId, 'provider', `Please review your visit summary from ${daysAgo} days ago.`, isoDaysFromNow(daysAgo, 10));
    execute('INSERT INTO messages (id, thread_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?)',
      uuid(), threadId, 'patient', 'Received — thank you.', isoDaysFromNow(daysAgo - 1, 15));
  }
}

function ensureRefill(
  patientId: string,
  spec: DemoPatientSpec,
  medication: string,
  status: string,
  daysAgo: number,
  notes: string,
) {
  const existing = queryOne(
    'SELECT id FROM refill_requests WHERE patient_id = ? AND medication = ? AND status = ? AND notes = ?',
    patientId, medication, status, notes,
  );
  if (existing) return;
  const dosage = spec.medications.find((m) => m.medication === medication)?.dosage ?? '';
  execute(
    'INSERT INTO refill_requests (id, patient_id, medication, dosage, pharmacy, status, notes, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    uuid(), patientId, medication, dosage, spec.pharmacy, status, notes, isoDaysFromNow(daysAgo, 11),
  );
}

function ensurePortalWorkflows(patientId: string, spec: DemoPatientSpec) {
  const messages = spec.firstName === 'Alice'
    ? ALICE_MESSAGES
    : spec.firstName === 'Bob'
      ? BOB_MESSAGES
      : null;

  if (messages) {
    for (const msg of messages) ensureMessageThread(patientId, spec, msg);
  } else {
    ensureGenericMessages(patientId, spec);
  }

  ensureRefill(patientId, spec, spec.approvedRefillMed, 'approved', 78, 'Approved — 90-day supply');
  ensureRefill(patientId, spec, spec.pendingRefillMed, 'approved', 52, 'Approved by care team');
  ensureRefill(patientId, spec, spec.approvedRefillMed, 'approved', 28, 'Approved — auto refill');
  ensureRefill(patientId, spec, spec.pendingRefillMed, 'pending', 4, 'Running low — need 90-day supply');
}

function ensureClaim(
  patientId: string,
  encounterId: string,
  spec: DemoPatientSpec,
  status: string,
  tag: string,
  daysAgo: number,
): string {
  const existing = queryOne(
    'SELECT id FROM claims WHERE patient_id = ? AND encounter_id = ? AND status = ?',
    patientId, encounterId, status,
  );
  if (existing) return String(existing.id);

  const claimId = uuid();
  execute(
    'INSERT INTO claims (id, encounter_id, patient_id, status, payer_name, total_amount, submitted_at, ar_stage, claim_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    claimId, encounterId, patientId, status, spec.payerName, spec.claimAmount,
    status === 'submitted' ? isoDaysFromNow(daysAgo, 16) : null,
    status === 'submitted' ? 'patient' : 'insurance', 'professional', isoDaysFromNow(daysAgo, 12),
  );
  execute('INSERT INTO claim_line_items (id, claim_id, cpt_code, description, amount) VALUES (?, ?, ?, ?, ?)',
    uuid(), claimId, '99213', `${tag} — office visit`, 125);
  execute('INSERT INTO claim_line_items (id, claim_id, cpt_code, description, amount) VALUES (?, ?, ?, ?, ?)',
    uuid(), claimId, '85025', `${tag} — labs`, spec.claimAmount - 125);

  if (!queryOne('SELECT id FROM claim_diagnoses WHERE claim_id = ?', claimId)) {
    execute('INSERT INTO claim_diagnoses (id, claim_id, icd_code, description) VALUES (?, ?, ?, ?)',
      uuid(), claimId, 'I10', 'Essential hypertension');
  }
  if (!queryOne('SELECT id FROM claim_notes WHERE claim_id = ?', claimId)) {
    execute('INSERT INTO claim_notes (id, claim_id, body, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
      uuid(), claimId, `Demo claim note for ${spec.firstName} ${spec.lastName} (${tag}).`, 'Billing Team', isoDaysFromNow(daysAgo, 17));
  }

  const holdTag = queryOne("SELECT id FROM billing_tags WHERE name = 'Hold'");
  if (holdTag && status === 'draft') {
    execute('INSERT OR IGNORE INTO claim_tag_links (claim_id, tag_id) VALUES (?, ?)', claimId, String(holdTag.id));
  }
  return claimId;
}

function ensurePartialPayment(patientId: string, claimId: string, amount: number, daysAgo: number) {
  if (queryOne('SELECT id FROM manual_payments WHERE patient_id = ? AND claim_id = ?', patientId, claimId)) return;
  execute(
    'INSERT INTO manual_payments (id, patient_id, claim_id, amount, method, note, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    uuid(), patientId, claimId, amount, 'check', 'Partial insurance adjustment (demo)', isoDaysFromNow(daysAgo, 18),
  );
}

function seedTimelineVisit(
  patientId: string,
  spec: DemoPatientSpec,
  visit: TimelineVisit,
): string | null {
  const serviceMode = visit.serviceMode ?? 'in-person';
  const apptId = ensureAppointment(patientId, visit.tag, {
    status: visit.status,
    serviceMode,
    daysAgo: visit.daysAgo,
    providerIndex: spec.providerIndex,
    locationIndex: visit.daysAgo % 2,
    visitType: visit.visitType,
    withCheckIn: visit.status === 'completed' || visit.status === 'in-office',
  });

  if (serviceMode === 'virtual') ensureTelemedSession(apptId);
  if (!visit.clinical) return null;

  const encId = ensureEncounter(apptId, patientId, {
    status: visit.status === 'in-office' ? 'in-progress' : visit.signed ? 'signed' : 'in-progress',
    signed: visit.signed,
    signedDaysAgo: visit.daysAgo,
    allergies: spec.patientIndex % 2 === 0 ? ['Penicillin'] : ['Sulfa drugs'],
    medications: spec.medications.map((m) => `${m.medication} ${m.dosage}`),
    hpi: `${spec.firstName} presents for ${visit.visitType.toLowerCase()}. Reports adherence to medications.`,
    assessment: 'Chronic conditions stable on current regimen.',
    plan: 'Continue medications. Order labs. Follow up in clinic as needed.',
  });

  ensureClinicalOrders(encId, spec, visit.daysAgo, visit.signed === true);

  if (visit.claimStatus === 'submitted') {
    const claimId = ensureClaim(patientId, encId, spec, 'submitted', visit.tag, visit.daysAgo);
    if (visit.withPayment) ensurePartialPayment(patientId, claimId, spec.partialPayment, visit.daysAgo - 5);
  } else if (visit.claimStatus === 'draft') {
    ensureClaim(patientId, encId, spec, 'draft', visit.tag, visit.daysAgo);
  }

  return encId;
}

function seedDemoPatient(spec: DemoPatientSpec) {
  const patient = findPatient(spec);
  if (!patient) return;
  const patientId = String(patient.id);
  const fullName = `${spec.firstName} ${spec.lastName}`;

  ensurePatientEmail(patientId, spec.email);
  ensureCoverage(patientId, spec);

  for (const visit of PATIENT_TIMELINE) {
    seedTimelineVisit(patientId, spec, visit);
  }

  ensurePatientDocument(patientId, 'Insurance card scan', 85);
  ensurePatientDocument(patientId, 'Visit summary — 90d', 88);
  ensurePatientDocument(patientId, 'Visit summary — 60d', 55);
  ensurePatientDocument(patientId, 'Visit summary — 30d', 21);
  ensureFaxOutbound(patientId, `Referral — ${fullName}`, 60);
  ensureFaxOutbound(patientId, `Records request — ${fullName}`, 30);
  ensurePatientTask(patientId, `Call patient — ${fullName}`, 75, 'completed');
  ensurePatientTask(patientId, `Review chart — ${fullName}`, 40, 'completed');
  ensurePatientTask(patientId, `Schedule follow-up — ${fullName}`, 8, 'open');

  if (spec.hasPortal) ensurePortalWorkflows(patientId, spec);
}

function ensureHistoricalEras() {
  const batches = [
    { daysAgo: 84, payer: 'Blue Cross Blue Shield', check: 'CHK-88421', total: 2450 },
    { daysAgo: 56, payer: 'Aetna', check: 'CHK-90102', total: 1820 },
    { daysAgo: 28, payer: 'Blue Cross Blue Shield', check: 'CHK-91555', total: 3100 },
  ];

  for (const batch of batches) {
    const existing = queryOne('SELECT id FROM eras WHERE check_number = ?', batch.check);
    const eraId = existing ? String(existing.id) : uuid();
    if (!existing) {
      execute(
        'INSERT INTO eras (id, payer_name, check_number, total_amount, received_at) VALUES (?, ?, ?, ?, ?)',
        eraId, batch.payer, batch.check, batch.total, isoDaysFromNow(batch.daysAgo, 8),
      );
    }

    const patients = queryAll('SELECT first_name, last_name FROM patients ORDER BY created_at LIMIT 12');
    for (let i = 0; i < patients.length; i++) {
      const name = `${String(patients[i].first_name)} ${String(patients[i].last_name)}`;
      if (queryOne('SELECT id FROM era_payments WHERE era_id = ? AND patient_name = ?', eraId, name)) continue;
      if (i % 3 !== batch.daysAgo % 3) continue;
      execute(
        'INSERT INTO era_payments (id, era_id, patient_name, paid_amount, status) VALUES (?, ?, ?, ?, ?)',
        uuid(), eraId, name, 75 + (i * 17) % 120, i % 2 === 0 ? 'unmatched' : 'matched',
      );
    }
  }
}

function ensureUnsolicitedLabsHistory() {
  const patients = queryAll('SELECT first_name, last_name FROM patients ORDER BY created_at LIMIT 12');
  const tests = ['HbA1c', 'TSH', 'Lipid Panel', 'Vitamin D', 'PSA'];
  for (let i = 0; i < patients.length; i++) {
    const name = `${String(patients[i].first_name)} ${String(patients[i].last_name)}`;
    const test = tests[i % tests.length];
    const daysAgo = 80 - (i * 6);
    if (daysAgo < 7) continue;
    if (queryOne('SELECT id FROM unsolicited_lab_results WHERE patient_name = ? AND test_name = ?', name, test)) continue;
    execute(
      'INSERT INTO unsolicited_lab_results (id, patient_name, test_name, result_value, result_unit, status, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), name, test, `${5 + (i % 4)}.${i}`, test === 'TSH' ? 'mIU/L' : '%', 'inbox', isoDaysFromNow(daysAgo, 7),
    );
  }
}

function ensureStaffWorkflowHistory() {
  const staffId = getStaffId();
  if (!staffId) return;

  const staffTasks = [
    { title: 'Review ERA batch — 90d', daysAgo: 86, status: 'completed', priority: 'normal' },
    { title: 'Verify insurance eligibility — 60d', daysAgo: 58, status: 'completed', priority: 'normal' },
    { title: 'Review unsigned encounter — 45d', daysAgo: 43, status: 'completed', priority: 'high' },
    { title: 'Prior auth follow-up — 30d', daysAgo: 29, status: 'completed', priority: 'high' },
    { title: 'Review unsigned encounter', daysAgo: 3, status: 'open', priority: 'high' },
    { title: 'Verify insurance eligibility', daysAgo: 1, status: 'open', priority: 'normal' },
  ];

  for (const t of staffTasks) {
    if (queryOne('SELECT id FROM tasks WHERE title = ? AND assignee_id = ?', t.title, staffId)) continue;
    execute(
      'INSERT INTO tasks (id, title, description, status, priority, assignee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), t.title, 'Staff workflow demo task', t.status, t.priority, staffId, isoDaysFromNow(t.daysAgo, 9),
    );
  }

  const providers = queryAll("SELECT id FROM users WHERE role = 'Provider' ORDER BY email");
  for (let i = 0; i < providers.length; i++) {
    const pid = String(providers[i].id);
    const title = `Provider inbox review — ${HISTORY_DAYS - i * 20}d`;
    if (queryOne('SELECT id FROM tasks WHERE title = ? AND assignee_id = ?', title, pid)) continue;
    execute(
      'INSERT INTO tasks (id, title, description, status, priority, assignee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), title, 'Provider demo task', 'completed', 'normal', pid, isoDaysFromNow(HISTORY_DAYS - i * 20, 10),
    );
  }
}

function ensureFaxInboundHistory() {
  const items = [
    { sender: '(555) 900-1234', daysAgo: 77, pages: 3 },
    { sender: '(555) 900-5678', daysAgo: 49, pages: 1 },
    { sender: '(555) 900-9012', daysAgo: 22, pages: 2 },
  ];
  for (const item of items) {
    if (queryOne('SELECT id FROM fax_inbound WHERE sender_fax = ? AND pages = ?', item.sender, item.pages)) continue;
    execute(
      'INSERT INTO fax_inbound (id, sender_fax, status, pages, received_at) VALUES (?, ?, ?, ?, ?)',
      uuid(), item.sender, 'unmatched', item.pages, isoDaysFromNow(item.daysAgo, 11),
    );
  }
}

/** Idempotent 90-day demo history for all patients and staff workflows. */
export function ensureDemoPatientWorkflows() {
  if (!queryOne('SELECT id FROM patients LIMIT 1')) return;

  const patients = queryAll('SELECT id, first_name, last_name, email FROM patients ORDER BY created_at');
  for (let i = 0; i < patients.length; i++) {
    seedDemoPatient(buildPatientSpec(patients[i], i));
  }

  ensureHistoricalEras();
  ensureUnsolicitedLabsHistory();
  ensureStaffWorkflowHistory();
  ensureFaxInboundHistory();
}
