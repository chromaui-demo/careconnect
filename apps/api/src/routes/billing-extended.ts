import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { computePatientBalance } from '../services/billing-balance.js';
import { authRequired } from '../middleware/auth.js';
import { billingViewGuard, billingWriteGuard } from '../middleware/billing-access.js';

export const billingExtendedRouter = Router();
billingExtendedRouter.use(authRequired);

// --- Claims extended ---
billingExtendedRouter.patch('/claims/:id', billingWriteGuard, (req, res) => {
  const id = String(req.params.id);
  const { status, payerName, arStage, claimType } = req.body;
  execute(`UPDATE claims SET status = COALESCE(?, status), payer_name = COALESCE(?, payer_name),
    ar_stage = COALESCE(?, ar_stage), claim_type = COALESCE(?, claim_type) WHERE id = ?`,
    status, payerName, arStage, claimType, id);
  res.json(mapClaim(queryOne('SELECT * FROM claims WHERE id = ?', id)!));
});

billingExtendedRouter.post('/claims/:id/notes', billingWriteGuard, (req, res) => {
  const claimId = String(req.params.id);
  const { body, authorName } = req.body as { body: string; authorName?: string };
  const id = uuid();
  execute('INSERT INTO claim_notes (id, claim_id, body, author_name) VALUES (?, ?, ?, ?)', id, claimId, body, authorName ?? 'Staff');
  res.status(201).json({ id });
});

billingExtendedRouter.get('/claims/:id/notes', billingViewGuard, (req, res) => {
  res.json(queryAll('SELECT * FROM claim_notes WHERE claim_id = ? ORDER BY created_at DESC', String(req.params.id)).map((n) => ({
    id: n.id, body: n.body, authorName: n.author_name, createdAt: n.created_at,
  })));
});

billingExtendedRouter.post('/claims/:id/diagnoses', billingWriteGuard, (req, res) => {
  const claimId = String(req.params.id);
  const { icdCode, description } = req.body;
  const id = uuid();
  execute('INSERT INTO claim_diagnoses (id, claim_id, icd_code, description) VALUES (?, ?, ?, ?)', id, claimId, icdCode, description ?? '');
  res.status(201).json({ id });
});

billingExtendedRouter.get('/claims/:id/diagnoses', billingViewGuard, (req, res) => {
  res.json(queryAll('SELECT * FROM claim_diagnoses WHERE claim_id = ?', String(req.params.id)).map((d) => ({
    id: d.id, icdCode: d.icd_code, description: d.description,
  })));
});

billingExtendedRouter.post('/claims/:id/tags/:tagId', billingWriteGuard, (req, res) => {
  execute('INSERT OR IGNORE INTO claim_tag_links (claim_id, tag_id) VALUES (?, ?)', String(req.params.id), String(req.params.tagId));
  res.json({ ok: true });
});

billingExtendedRouter.delete('/claims/:id/tags/:tagId', billingWriteGuard, (req, res) => {
  execute('DELETE FROM claim_tag_links WHERE claim_id = ? AND tag_id = ?', String(req.params.id), String(req.params.tagId));
  res.json({ ok: true });
});

billingExtendedRouter.get('/claims/:id/export-x12', billingViewGuard, (req, res) => {
  const claim = queryOne('SELECT * FROM claims WHERE id = ?', String(req.params.id));
  if (!claim) { res.status(404).json({ error: 'Not found' }); return; }
  res.type('text/plain').send(`ISA*00*          *00*          *ZZ*CARECONNECT    *ZZ*DEMO-CLEARING  *${new Date().toISOString().slice(0, 10).replace(/-/g, '')}*1200*^*00501*000000001*0*P*:~CLM*${claim.id}*${claim.total_amount}***11:B:1*Y*A*Y*Y~`);
});

// --- ERA extended ---
billingExtendedRouter.post('/eras/import', billingWriteGuard, (req, res) => {
  const { x12Content } = req.body as { x12Content: string };
  const eraId = uuid();
  const amount = 500 + Math.random() * 500;
  execute('INSERT INTO eras (id, payer_name, check_number, total_amount) VALUES (?, ?, ?, ?)',
    eraId, 'Imported Payer', 'IMP-' + Date.now(), amount);
  execute('INSERT INTO era_payments (id, era_id, patient_name, paid_amount, status) VALUES (?, ?, ?, ?, ?)',
    uuid(), eraId, 'Imported Patient', amount / 2, 'unmatched');
  res.status(201).json({ id: eraId, message: 'ERA imported (demo)', bytes: x12Content?.length ?? 0 });
});

billingExtendedRouter.post('/eras/:eraId/payments/:paymentId/match', billingWriteGuard, (req, res) => {
  const { claimId } = req.body as { claimId: string };
  execute('UPDATE era_payments SET claim_id = ?, status = ? WHERE id = ? AND era_id = ?',
    claimId, 'matched', String(req.params.paymentId), String(req.params.eraId));
  res.json({ ok: true });
});

billingExtendedRouter.post('/eras/:eraId/payments/:paymentId/unmatch', billingWriteGuard, (req, res) => {
  execute('UPDATE era_payments SET claim_id = NULL, status = ? WHERE id = ? AND era_id = ?',
    'unmatched', String(req.params.paymentId), String(req.params.eraId));
  res.json({ ok: true });
});

billingExtendedRouter.get('/eras/:eraId/claims/:claimId', billingViewGuard, (req, res) => {
  const payment = queryOne('SELECT * FROM era_payments WHERE era_id = ? AND claim_id = ?', String(req.params.eraId), String(req.params.claimId));
  if (!payment) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({
    claimId: payment.claim_id, patientName: payment.patient_name, paidAmount: payment.paid_amount,
    status: payment.status, adjustments: [{ code: 'CO-45', amount: 25, description: 'Contractual adjustment' }],
  });
});

// --- Billing patients ---
billingExtendedRouter.get('/patients', billingViewGuard, (req, res) => {
  const search = (req.query.search as string)?.toLowerCase();
  let rows = queryAll('SELECT * FROM patients ORDER BY last_name');
  if (search) rows = rows.filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search));
  res.json(rows.map(mapBillingPatient));
});

billingExtendedRouter.get('/patients/:id', billingViewGuard, (req, res) => {
  const row = queryOne('SELECT * FROM patients WHERE id = ?', String(req.params.id));
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  const coverages = queryAll('SELECT * FROM patient_coverages WHERE patient_id = ? AND active = 1', String(req.params.id));
  const claims = queryAll('SELECT * FROM claims WHERE patient_id = ?', String(req.params.id));
  const payments = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM manual_payments WHERE patient_id = ?', String(req.params.id));
  res.json({
    ...mapBillingPatient(row),
    coverages: coverages.map(mapCoverage),
    claims: claims.map(mapClaim),
    balance: computePatientBalance(String(req.params.id)),
    pendingPayments: payments[0]?.total ?? 0,
  });
});

billingExtendedRouter.post('/patients/:id/coverages', billingWriteGuard, (req, res) => {
  const { payerName, memberId, groupNumber, rank } = req.body;
  const id = uuid();
  execute('INSERT INTO patient_coverages (id, patient_id, payer_name, member_id, group_number, rank) VALUES (?, ?, ?, ?, ?, ?)',
    id, String(req.params.id), payerName, memberId, groupNumber, rank ?? 1);
  res.status(201).json({ id });
});

billingExtendedRouter.post('/patient-ar/:patientId/payments', billingWriteGuard, (req, res) => {
  const { amount, method, claimId, note } = req.body;
  const id = uuid();
  execute('INSERT INTO manual_payments (id, patient_id, claim_id, amount, method, note) VALUES (?, ?, ?, ?, ?, ?)',
    id, String(req.params.patientId), claimId ?? null, amount, method ?? 'cash', note);
  res.status(201).json({ id });
});

// --- Master data CRUD ---
const masterCrud = [
  { path: 'billing-providers', table: 'billing_providers', fields: ['name', 'npi', 'tax_id', 'organization'] },
  { path: 'rendering-providers', table: 'rendering_providers', fields: ['name', 'npi', 'specialty'] },
  { path: 'service-facilities', table: 'service_facilities', fields: ['name', 'npi', 'address'] },
  { path: 'tags', table: 'billing_tags', fields: ['name', 'color'] },
] as const;

for (const m of masterCrud) {
  billingExtendedRouter.get(`/${m.path}`, billingViewGuard, (_req, res) => {
    const where = m.table === 'billing_tags' ? '' : ' WHERE active = 1';
    res.json(queryAll(`SELECT * FROM ${m.table}${where} ORDER BY name`).map((r) => mapRow(r, m.table)));
  });
  billingExtendedRouter.post(`/${m.path}`, billingWriteGuard, (req, res) => {
    const id = uuid();
    const body = req.body as Record<string, unknown>;
    if (m.table === 'billing_providers') {
      execute('INSERT INTO billing_providers (id, name, npi, tax_id, organization) VALUES (?, ?, ?, ?, ?)',
        id, String(body.name ?? ''), body.npi ? String(body.npi) : null, body.taxId ? String(body.taxId) : null, body.organization ? 1 : 0);
    } else if (m.table === 'rendering_providers') {
      execute('INSERT INTO rendering_providers (id, name, npi, specialty) VALUES (?, ?, ?, ?)',
        id, String(body.name ?? ''), body.npi ? String(body.npi) : null, body.specialty ? String(body.specialty) : null);
    } else if (m.table === 'service_facilities') {
      execute('INSERT INTO service_facilities (id, name, npi, address) VALUES (?, ?, ?, ?)',
        id, String(body.name ?? ''), body.npi ? String(body.npi) : null, body.address ? String(body.address) : null);
    } else {
      execute('INSERT INTO billing_tags (id, name, color) VALUES (?, ?, ?)', id, String(body.name ?? ''), String(body.color ?? '#457B9D'));
    }
    res.status(201).json({ id });
  });
}

billingExtendedRouter.get('/charge-masters', billingViewGuard, (_req, res) => {
  res.json(queryAll('SELECT * FROM charge_item_definitions WHERE active = 1 ORDER BY cpt_code').map((c) => ({
    id: c.id, cptCode: c.cpt_code, description: c.description, defaultAmount: c.default_amount,
  })));
});

billingExtendedRouter.post('/charge-masters', billingWriteGuard, (req, res) => {
  const { cptCode, description, defaultAmount } = req.body;
  const id = uuid();
  execute('INSERT INTO charge_item_definitions (id, cpt_code, description, default_amount) VALUES (?, ?, ?, ?)',
    id, cptCode, description, defaultAmount);
  res.status(201).json({ id });
});

// --- Rules engine ---
billingExtendedRouter.get('/rules/:engine', billingViewGuard, (req, res) => {
  res.json(queryAll('SELECT * FROM billing_rules WHERE engine = ? ORDER BY sort_order', String(req.params.engine)).map(mapRule));
});

billingExtendedRouter.post('/rules/:engine', billingWriteGuard, (req, res) => {
  const { name, sortOrder, conditions, actions } = req.body;
  const id = uuid();
  execute('INSERT INTO billing_rules (id, engine, name, sort_order, conditions_json, actions_json) VALUES (?, ?, ?, ?, ?, ?)',
    id, String(req.params.engine), name, sortOrder ?? 0, JSON.stringify(conditions ?? {}), JSON.stringify(actions ?? []));
  res.status(201).json({ id });
});

billingExtendedRouter.patch('/rules/:engine/:id', billingWriteGuard, (req, res) => {
  const { name, enabled, sortOrder, conditions, actions } = req.body;
  execute(`UPDATE billing_rules SET name = COALESCE(?, name), enabled = COALESCE(?, enabled),
    sort_order = COALESCE(?, sort_order), conditions_json = COALESCE(?, conditions_json),
    actions_json = COALESCE(?, actions_json) WHERE id = ?`,
    name, enabled, sortOrder, conditions ? JSON.stringify(conditions) : null,
    actions ? JSON.stringify(actions) : null, String(req.params.id));
  res.json({ ok: true });
});

billingExtendedRouter.post('/rules/:engine/run', billingWriteGuard, (req, res) => {
  const engine = String(req.params.engine);
  const { claimIds } = req.body as { claimIds: string[] };
  const rules = queryAll('SELECT * FROM billing_rules WHERE engine = ? AND enabled = 1 ORDER BY sort_order', engine);
  const results: Array<{ claimId: string; applied: string[] }> = [];
  for (const claimId of claimIds ?? []) {
    const applied: string[] = [];
    for (const rule of rules) {
      const actions = JSON.parse(String(rule.actions_json)) as Array<{ type: string; field?: string; value?: string; tag?: string }>;
      for (const action of actions) {
        if (action.type === 'setField' && action.field === 'status') {
          execute('UPDATE claims SET status = ? WHERE id = ?', action.value ?? 'submitted', claimId);
          applied.push(`${rule.name}: status=${action.value}`);
        }
        if (action.type === 'applyTag' && action.tag) {
          const tag = queryOne('SELECT id FROM billing_tags WHERE name = ?', action.tag);
          if (tag) execute('INSERT OR IGNORE INTO claim_tag_links (claim_id, tag_id) VALUES (?, ?)', claimId, String(tag.id));
          applied.push(`${rule.name}: tag=${action.tag}`);
        }
      }
    }
    results.push({ claimId, applied });
  }
  res.json({ engine, results });
});

function mapClaim(row: Record<string, unknown>) {
  const patient = queryOne('SELECT first_name, last_name FROM patients WHERE id = ?', String(row.patient_id));
  const tags = queryAll(`SELECT t.* FROM billing_tags t JOIN claim_tag_links l ON l.tag_id = t.id WHERE l.claim_id = ?`, String(row.id));
  return {
    id: row.id, encounterId: row.encounter_id, patientId: row.patient_id,
    patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
    status: row.status, payerName: row.payer_name, totalAmount: row.total_amount,
    arStage: row.ar_stage ?? 'insurance', claimType: row.claim_type ?? 'professional',
    submittedAt: row.submitted_at, createdAt: row.created_at, tags: tags.map((t) => t.name),
  };
}

function mapBillingPatient(row: Record<string, unknown>) {
  return {
    id: row.id, firstName: row.first_name, lastName: row.last_name,
    dateOfBirth: row.date_of_birth, gender: row.gender,
    balance: computePatientBalance(String(row.id)),
  };
}

function mapCoverage(row: Record<string, unknown>) {
  return { id: row.id, payerName: row.payer_name, memberId: row.member_id, groupNumber: row.group_number, rank: row.rank };
}

function mapRule(row: Record<string, unknown>) {
  return {
    id: row.id, engine: row.engine, name: row.name, sortOrder: row.sort_order, enabled: row.enabled === 1,
    conditions: JSON.parse(String(row.conditions_json)), actions: JSON.parse(String(row.actions_json)),
  };
}

function mapRow(row: Record<string, unknown>, table: string) {
  if (table === 'billing_providers') return { id: row.id, name: row.name, npi: row.npi, taxId: row.tax_id, organization: row.organization === 1 };
  if (table === 'rendering_providers') return { id: row.id, name: row.name, npi: row.npi, specialty: row.specialty };
  if (table === 'service_facilities') return { id: row.id, name: row.name, npi: row.npi, address: row.address };
  return { id: row.id, name: row.name, color: row.color };
}
