import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const aiRouter = Router();
aiRouter.use(authRequired);

function generateNoteFromTranscript(transcript: string) {
  const lower = transcript.toLowerCase();
  const hpi = transcript.length > 20
    ? `Patient presents with the following history: ${transcript.slice(0, 500)}`
    : 'Patient reports symptoms as discussed during visit.';
  const assessment = lower.includes('fever') || lower.includes('cough')
    ? 'Acute upper respiratory infection, likely viral etiology.'
    : 'Assessment pending full clinical evaluation.';
  const plan = 'Supportive care, return precautions discussed. Follow up if symptoms worsen.';
  return { hpi, assessment, plan };
}

aiRouter.get('/encounter/:encounterId', (req, res) => {
  const rows = queryAll('SELECT * FROM ai_scribe_sessions WHERE encounter_id = ? ORDER BY created_at DESC', String(req.params.encounterId));
  res.json(rows.map(mapSession));
});

aiRouter.post('/encounter/:encounterId/start', (req, res) => {
  const id = uuid();
  execute('INSERT INTO ai_scribe_sessions (id, encounter_id, status) VALUES (?, ?, ?)', id, String(req.params.encounterId), 'recording');
  res.status(201).json(mapSession(queryOne('SELECT * FROM ai_scribe_sessions WHERE id = ?', id)!));
});

aiRouter.post('/:sessionId/transcript', (req, res) => {
  const { transcript } = req.body as { transcript: string };
  const id = String(req.params.sessionId);
  const generated = generateNoteFromTranscript(transcript ?? '');
  execute(
    `UPDATE ai_scribe_sessions SET transcript = ?, generated_hpi = ?, generated_assessment = ?, generated_plan = ?, status = 'processed' WHERE id = ?`,
    transcript, generated.hpi, generated.assessment, generated.plan, id,
  );
  res.json(mapSession(queryOne('SELECT * FROM ai_scribe_sessions WHERE id = ?', id)!));
});

aiRouter.post('/:sessionId/apply', (req, res) => {
  const session = queryOne('SELECT * FROM ai_scribe_sessions WHERE id = ?', String(req.params.sessionId));
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }
  execute(
    'UPDATE encounters SET hpi = COALESCE(?, hpi), assessment = COALESCE(?, assessment), plan = COALESCE(?, plan) WHERE id = ?',
    String(session.generated_hpi ?? ''), String(session.generated_assessment ?? ''), String(session.generated_plan ?? ''), String(session.encounter_id),
  );
  execute("UPDATE ai_scribe_sessions SET status = 'applied' WHERE id = ?", String(req.params.sessionId));
  res.json({ ok: true });
});

function mapSession(row: Record<string, unknown>) {
  return {
    id: row.id, encounterId: row.encounter_id, status: row.status, transcript: row.transcript,
    generatedHpi: row.generated_hpi, generatedAssessment: row.generated_assessment, generatedPlan: row.generated_plan,
    createdAt: row.created_at,
  };
}

export const labsInboxRouter = Router();
labsInboxRouter.use(authRequired);

labsInboxRouter.get('/unsolicited', (_req, res) => {
  res.json(queryAll("SELECT * FROM unsolicited_lab_results WHERE status = 'inbox' ORDER BY received_at DESC").map((r) => ({
    id: r.id, patientName: r.patient_name, testName: r.test_name, resultValue: r.result_value,
    resultUnit: r.result_unit, receivedAt: r.received_at,
  })));
});

labsInboxRouter.post('/unsolicited/:id/match', (req, res) => {
  const { patientId } = req.body;
  const patient = queryOne('SELECT first_name, last_name FROM patients WHERE id = ?', patientId);
  execute("UPDATE unsolicited_lab_results SET status = 'matched', patient_name = ? WHERE id = ?",
    patient ? `${patient.first_name} ${patient.last_name}` : 'Matched', String(req.params.id));
  res.json({ ok: true });
});
