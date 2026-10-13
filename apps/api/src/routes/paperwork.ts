import { Router } from 'express';
import { execute, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';
import { getPaperworkProgress, harvestPaperworkAnswers } from '../services/paperwork.js';
import { assertAppointmentAccess } from '../services/patient-access.js';

export const paperworkRouter = Router();

paperworkRouter.get('/:appointmentId', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  res.json(getPaperworkProgress(appointmentId));
});

paperworkRouter.get('/:appointmentId/:questionnaireId', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const progress = getPaperworkProgress(String(req.params.appointmentId));
  const step = progress.steps.find((s) => s.id === req.params.questionnaireId || s.slug === req.params.questionnaireId);
  if (!step) { res.status(404).json({ error: 'Questionnaire not found' }); return; }
  res.json(step);
});

paperworkRouter.put('/:appointmentId/:questionnaireId', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const qid = String(req.params.questionnaireId);
  const row = queryOne(
    `SELECT pr.id FROM paperwork_responses pr
     JOIN questionnaires q ON q.id = pr.questionnaire_id
     WHERE pr.appointment_id = ? AND (pr.questionnaire_id = ? OR q.slug = ?)`,
    appointmentId, qid, qid,
  );
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  execute('UPDATE paperwork_responses SET answers_json = ? WHERE id = ?', JSON.stringify(req.body.answers ?? {}), String(row.id));
  res.json(getPaperworkProgress(appointmentId));
});

paperworkRouter.post('/:appointmentId/:questionnaireId/submit', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const qid = String(req.params.questionnaireId);
  const row = queryOne(
    `SELECT pr.id, q.slug FROM paperwork_responses pr
     JOIN questionnaires q ON q.id = pr.questionnaire_id
     WHERE pr.appointment_id = ? AND (pr.questionnaire_id = ? OR q.slug = ?)`,
    appointmentId, qid, qid,
  );
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }

  const answers = req.body.answers ?? {};
  execute(
    'UPDATE paperwork_responses SET answers_json = ?, completed = 1, submitted_at = datetime(\'now\') WHERE id = ?',
    JSON.stringify(answers), String(row.id),
  );
  harvestPaperworkAnswers(appointmentId, String(row.slug), answers);
  res.json(getPaperworkProgress(appointmentId));
});
