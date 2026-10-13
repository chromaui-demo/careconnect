import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const faxRouter = Router();
faxRouter.use(authRequired);

faxRouter.get('/outbound', (_req, res) => {
  res.json(queryAll('SELECT * FROM fax_outbound ORDER BY created_at DESC').map(mapOutbound));
});

faxRouter.post('/outbound', (req, res) => {
  const { recipientFax, subject, patientId, pages } = req.body;
  const id = uuid();
  execute(
    'INSERT INTO fax_outbound (id, patient_id, recipient_fax, subject, pages, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))',
    id, patientId ?? null, recipientFax, subject ?? 'Medical Records', pages ?? 1, 'sent',
  );
  res.status(201).json({ id, status: 'sent', provider: 'Demo-PostGrid', message: 'Fax queued and sent (demo)' });
});

faxRouter.get('/inbound', (_req, res) => {
  res.json(queryAll('SELECT * FROM fax_inbound ORDER BY received_at DESC').map(mapInbound));
});

faxRouter.patch('/inbound/:id/match', (req, res) => {
  const { patientId } = req.body;
  execute("UPDATE fax_inbound SET patient_id = ?, status = 'matched' WHERE id = ?", patientId, String(req.params.id));
  res.json({ ok: true });
});

function mapOutbound(row: Record<string, unknown>) {
  return {
    id: row.id, recipientFax: row.recipient_fax, subject: row.subject, status: row.status,
    pages: row.pages, sentAt: row.sent_at, createdAt: row.created_at,
  };
}

function mapInbound(row: Record<string, unknown>) {
  const patient = row.patient_id ? queryOne('SELECT first_name, last_name FROM patients WHERE id = ?', String(row.patient_id)) : null;
  return {
    id: row.id, senderFax: row.sender_fax, status: row.status, pages: row.pages,
    receivedAt: row.received_at,
    patientId: row.patient_id,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : null,
  };
}
