import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';
import { billingViewGuard, billingWriteGuard } from '../middleware/billing-access.js';

export const billingRouter = Router();
billingRouter.use(authRequired);

billingRouter.get('/claims', billingViewGuard, (_req, res) => {
  const rows = queryAll(`
    SELECT c.*, p.first_name || ' ' || p.last_name as patient_name
    FROM claims c JOIN patients p ON p.id = c.patient_id ORDER BY c.created_at DESC`);
  res.json(rows.map(mapClaim));
});

billingRouter.get('/claims/:id', billingViewGuard, (req, res) => {
  const row = queryOne('SELECT * FROM claims WHERE id = ?', String(req.params.id));
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  const lines = queryAll('SELECT * FROM claim_line_items WHERE claim_id = ?', String(req.params.id));
  res.json({ ...mapClaim(row), lineItems: lines.map((l) => ({
    id: l.id, cptCode: l.cpt_code, description: l.description, amount: l.amount, units: l.units,
  })) });
});

billingRouter.post('/claims', billingWriteGuard, (req, res) => {
  const { encounterId, patientId, payerName, lineItems } = req.body as {
    encounterId: string; patientId: string; payerName?: string;
    lineItems: Array<{ cptCode: string; description?: string; amount: number; units?: number }>;
  };
  const id = uuid();
  const total = (lineItems ?? []).reduce((s, l) => s + l.amount * (l.units ?? 1), 0);
  execute('INSERT INTO claims (id, encounter_id, patient_id, status, payer_name, total_amount) VALUES (?, ?, ?, ?, ?, ?)',
    id, encounterId, patientId, 'draft', payerName ?? 'Self Pay', total);
  for (const l of lineItems ?? []) {
    execute('INSERT INTO claim_line_items (id, claim_id, cpt_code, description, amount, units) VALUES (?, ?, ?, ?, ?, ?)',
      uuid(), id, l.cptCode, l.description ?? '', l.amount, l.units ?? 1);
  }
  res.status(201).json({ id });
});

billingRouter.post('/claims/:id/submit', billingWriteGuard, (req, res) => {
  const id = String(req.params.id);
  execute("UPDATE claims SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?", id);
  res.json({ id, status: 'submitted', clearinghouse: 'Demo-Candid', message: 'Claim submitted to clearinghouse (demo)' });
});

billingRouter.get('/eras', billingViewGuard, (_req, res) => {
  res.json(queryAll('SELECT * FROM eras ORDER BY received_at DESC').map((e) => ({
    id: e.id, payerName: e.payer_name, checkNumber: e.check_number, totalAmount: e.total_amount, receivedAt: e.received_at,
  })));
});

billingRouter.get('/eras/:id', billingViewGuard, (req, res) => {
  const era = queryOne('SELECT * FROM eras WHERE id = ?', String(req.params.id));
  if (!era) { res.status(404).json({ error: 'Not found' }); return; }
  const payments = queryAll('SELECT * FROM era_payments WHERE era_id = ?', String(req.params.id));
  res.json({
    id: era.id, payerName: era.payer_name, checkNumber: era.check_number, totalAmount: era.total_amount,
    payments: payments.map((p) => ({ id: p.id, claimId: p.claim_id, patientName: p.patient_name, paidAmount: p.paid_amount, status: p.status })),
  });
});

billingRouter.get('/charge-items', billingViewGuard, (_req, res) => {
  res.json(queryAll('SELECT * FROM charge_item_definitions WHERE active = 1 ORDER BY cpt_code').map((c) => ({
    id: c.id, cptCode: c.cpt_code, description: c.description, defaultAmount: c.default_amount,
  })));
});

billingRouter.get('/patient-ar', billingViewGuard, (_req, res) => {
  const rows = queryAll(`
    SELECT p.id, p.first_name, p.last_name,
      COALESCE(SUM(CASE WHEN c.status IN ('submitted','denied') THEN c.total_amount ELSE 0 END), 0) as balance
    FROM patients p LEFT JOIN claims c ON c.patient_id = p.id
    GROUP BY p.id HAVING balance > 0 ORDER BY balance DESC`);
  res.json(rows.map((r) => ({ patientId: r.id, name: `${r.first_name} ${r.last_name}`, balance: r.balance })));
});

function mapClaim(row: Record<string, unknown>) {
  const patient = queryOne('SELECT first_name, last_name FROM patients WHERE id = ?', String(row.patient_id));
  return {
    id: row.id, encounterId: row.encounter_id, patientId: row.patient_id,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
    status: row.status, payerName: row.payer_name, totalAmount: row.total_amount,
    submittedAt: row.submitted_at, createdAt: row.created_at,
  };
}
