import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';

export function assignPaperworkToAppointment(appointmentId: string) {
  const questionnaires = queryAll('SELECT id FROM questionnaires WHERE active = 1');
  for (const q of questionnaires) {
    const existing = queryOne(
      'SELECT id FROM paperwork_responses WHERE appointment_id = ? AND questionnaire_id = ?',
      appointmentId, String(q.id),
    );
    if (!existing) {
      execute(
        'INSERT INTO paperwork_responses (id, appointment_id, questionnaire_id, answers_json) VALUES (?, ?, ?, ?)',
        uuid(), appointmentId, String(q.id), '{}',
      );
    }
  }
}

export function harvestPaperworkAnswers(appointmentId: string, questionnaireSlug: string, answers: Record<string, unknown>) {
  const appt = queryOne('SELECT patient_id FROM appointments WHERE id = ?', appointmentId);
  if (!appt) return;

  const patientId = String(appt.patient_id);

  if (questionnaireSlug === 'contact-information') {
    execute(
      'UPDATE patients SET phone = COALESCE(?, phone), email = COALESCE(?, email), address_json = COALESCE(?, address_json) WHERE id = ?',
      answers.phone != null ? String(answers.phone) : null,
      answers.email != null ? String(answers.email) : null,
      answers.addressLine ? JSON.stringify({
        line: answers.addressLine,
        city: answers.city,
        state: answers.state,
        zip: answers.zip,
      }) : null,
      patientId,
    );
  }

  if (questionnaireSlug === 'medical-history') {
    const allergies = parseList(String(answers.allergies ?? ''));
    const medications = parseList(String(answers.medications ?? ''));
    const encounter = queryOne('SELECT id FROM encounters WHERE appointment_id = ?', appointmentId);
    if (encounter) {
      execute(
        'UPDATE encounters SET allergies_json = ?, medications_json = ? WHERE id = ?',
        JSON.stringify(allergies),
        JSON.stringify(medications),
        String(encounter.id),
      );
    }
  }

  if (questionnaireSlug === 'insurance') {
    const existing = queryOne('SELECT id FROM patient_insurance WHERE patient_id = ?', patientId);
    if (existing) {
      execute(
        'UPDATE patient_insurance SET payer_name = ?, member_id = ?, group_number = ?, subscriber_name = ? WHERE patient_id = ?',
        String(answers.payerName ?? ''), String(answers.memberId ?? ''), answers.groupNumber != null ? String(answers.groupNumber) : null, String(answers.subscriberName ?? ''), patientId,
      );
    } else {
      execute(
        'INSERT INTO patient_insurance (id, patient_id, payer_name, member_id, group_number, subscriber_name) VALUES (?, ?, ?, ?, ?, ?)',
        uuid(), patientId, String(answers.payerName ?? ''), String(answers.memberId ?? ''), answers.groupNumber != null ? String(answers.groupNumber) : null, String(answers.subscriberName ?? ''),
      );
    }
  }
}

function parseList(text: string): string[] {
  const t = text.trim().toLowerCase();
  if (!t || t === 'none' || t === 'n/a') return [];
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

export function getPaperworkProgress(appointmentId: string) {
  const rows = queryAll(`
    SELECT pr.*, q.title, q.slug, q.schema_json
    FROM paperwork_responses pr
    JOIN questionnaires q ON q.id = pr.questionnaire_id
    WHERE pr.appointment_id = ?
    ORDER BY q.title
  `, appointmentId);

  const total = rows.length;
  const completed = rows.filter((r) => r.completed === 1).length;

  return {
    total,
    completed,
    complete: total > 0 && completed === total,
    percent: total ? Math.round((completed / total) * 100) : 0,
    steps: rows.map((r) => ({
      id: String(r.questionnaire_id),
      responseId: String(r.id),
      title: String(r.title),
      slug: String(r.slug),
      completed: r.completed === 1,
      answers: JSON.parse(String(r.answers_json || '{}')),
      schema: JSON.parse(String(r.schema_json)),
    })),
  };
}
