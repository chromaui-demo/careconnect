import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const reportsExtendedRouter = Router();
reportsExtendedRouter.use(authRequired);

reportsExtendedRouter.get('/complete-encounters', (_req, res) => {
  res.json(queryAll("SELECT e.*, p.first_name, p.last_name FROM encounters e JOIN patients p ON p.id = e.patient_id WHERE e.status = 'signed' ORDER BY e.signed_at DESC LIMIT 50").map(mapEncReport));
});

reportsExtendedRouter.get('/visits-overview', (_req, res) => {
  const byStatus = queryAll('SELECT status, COUNT(*) as cnt FROM appointments GROUP BY status');
  res.json({ byStatus: byStatus.map((r) => ({ status: r.status, count: r.cnt })), total: queryAll('SELECT id FROM appointments').length });
});

reportsExtendedRouter.get('/practice-kpis', (_req, res) => {
  res.json({
    totalPatients: queryAll('SELECT id FROM patients').length,
    signedEncounters: queryAll("SELECT id FROM encounters WHERE status = 'signed'").length,
    openClaims: queryAll("SELECT id FROM claims WHERE status IN ('draft','submitted')").length,
    unmatchedEras: queryAll("SELECT id FROM era_payments WHERE status = 'unmatched'").length,
  });
});

reportsExtendedRouter.get('/data-exports/patients', (_req, res) => {
  res.json(queryAll('SELECT id, first_name, last_name, date_of_birth, email FROM patients').map((p) => ({
    id: p.id, name: `${p.first_name} ${p.last_name}`, dob: p.date_of_birth, email: p.email,
  })));
});

reportsExtendedRouter.post('/ad-hoc', (req, res) => {
  const { reportType } = req.body as { reportType: string };
  if (reportType === 'claims') {
    return res.json(queryAll('SELECT id, status, payer_name, total_amount FROM claims').map((c) => ({
      id: c.id, status: c.status, payer: c.payer_name, amount: c.total_amount,
    })));
  }
  res.json([]);
});

reportsExtendedRouter.get('/invoiceable-patients', (_req, res) => {
  res.json(queryAll("SELECT patient_id, SUM(total_amount) as total FROM claims WHERE status = 'submitted' GROUP BY patient_id").map((r) => {
    const p = queryOne('SELECT first_name, last_name FROM patients WHERE id = ?', String(r.patient_id));
    return { patientId: r.patient_id, name: p ? `${p.first_name} ${p.last_name}` : 'Unknown', amount: r.total };
  }));
});

reportsExtendedRouter.get('/mailed-statements', (_req, res) => {
  res.json([{ id: uuid(), patientName: 'Demo Patient', mailedAt: new Date().toISOString(), status: 'sent (simulated)' }]);
});

reportsExtendedRouter.get('/ai-assisted-encounters', (_req, res) => {
  res.json(queryAll('SELECT s.*, e.patient_id FROM ai_scribe_sessions s JOIN encounters e ON e.id = s.encounter_id WHERE s.status = ?', 'applied').map((s) => {
    const p = queryOne('SELECT first_name, last_name FROM patients WHERE id = ?', String(s.patient_id));
    return { sessionId: s.id, patientName: p ? `${p.first_name} ${p.last_name}` : 'Unknown', status: s.status };
  }));
});

function mapEncReport(r: Record<string, unknown>) {
  return { id: r.id, patientName: `${r.first_name} ${r.last_name}`, signedAt: r.signed_at, chiefComplaint: r.chief_complaint };
}
