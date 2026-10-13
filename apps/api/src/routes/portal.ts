import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';
import { requirePatientContext, assertPatientResourceAccess } from '../services/patient-access.js';
import { computePatientBalance } from '../services/billing-balance.js';

export const portalRouter = Router();

function mapProviderName(providerId: string | null | undefined): string {
  if (!providerId) return 'Care Team';
  const p = queryOne('SELECT first_name, last_name FROM users WHERE id = ?', String(providerId));
  return p ? `Dr. ${p.first_name} ${p.last_name}` : 'Care Team';
}

function defaultProviderId(patientId: string): string | null {
  const appt = queryOne(
    `SELECT provider_id FROM appointments WHERE patient_id = ? AND provider_id IS NOT NULL ORDER BY scheduled_time DESC LIMIT 1`,
    patientId,
  );
  return appt?.provider_id ? String(appt.provider_id) : null;
}

portalRouter.get('/medications', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const meds: Array<{
    id: string;
    medication: string;
    dosage: string;
    pharmacy?: string;
    status: string;
    orderedAt: string;
    source: 'erx' | 'encounter';
  }> = [];

  const erxRows = queryAll(
    `SELECT e.id, e.medication, e.dosage, e.pharmacy, e.status, e.ordered_at
     FROM erx_orders e
     JOIN encounters enc ON enc.id = e.encounter_id
     WHERE enc.patient_id = ?
     ORDER BY e.ordered_at DESC`,
    ctx.patientId,
  );
  for (const row of erxRows) {
    meds.push({
      id: String(row.id),
      medication: String(row.medication),
      dosage: String(row.dosage),
      pharmacy: row.pharmacy ? String(row.pharmacy) : undefined,
      status: String(row.status),
      orderedAt: String(row.ordered_at),
      source: 'erx',
    });
  }

  const encRows = queryAll(
    'SELECT id, medications_json, signed_at FROM encounters WHERE patient_id = ? AND medications_json IS NOT NULL',
    ctx.patientId,
  );
  const seen = new Set(meds.map((m) => `${m.medication}|${m.dosage}`.toLowerCase()));
  for (const enc of encRows) {
    try {
      const list = JSON.parse(String(enc.medications_json)) as string[];
      for (const entry of list) {
        const key = entry.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const parts = entry.match(/^(.+?)\s+(\d+\S*.*)$/);
        meds.push({
          id: `enc-${enc.id}-${entry}`,
          medication: parts ? parts[1] : entry,
          dosage: parts ? parts[2] : '',
          status: 'active',
          orderedAt: enc.signed_at ? String(enc.signed_at) : new Date().toISOString(),
          source: 'encounter',
        });
      }
    } catch {
      /* ignore malformed json */
    }
  }

  res.json(meds);
});

portalRouter.get('/lab-results', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const rows = queryAll(
    `SELECT lo.id as order_id, lo.test_name, lo.status as order_status, lo.ordered_at,
            lr.id as result_id, lr.result_value, lr.result_unit, lr.abnormal, lr.resulted_at,
            enc.id as encounter_id, a.provider_id
     FROM lab_orders lo
     JOIN encounters enc ON enc.id = lo.encounter_id
     LEFT JOIN lab_results lr ON lr.lab_order_id = lo.id
     LEFT JOIN appointments a ON a.id = enc.appointment_id
     WHERE enc.patient_id = ? AND lr.id IS NOT NULL
     ORDER BY lr.resulted_at DESC`,
    ctx.patientId,
  );

  res.json(rows.map((row) => ({
    orderId: String(row.order_id),
    testName: String(row.test_name),
    orderStatus: String(row.order_status),
    orderedAt: String(row.ordered_at),
    resultId: String(row.result_id),
    resultValue: row.result_value ? String(row.result_value) : undefined,
    resultUnit: row.result_unit ? String(row.result_unit) : undefined,
    abnormal: row.abnormal === 1,
    resultedAt: row.resulted_at ? String(row.resulted_at) : undefined,
    providerName: mapProviderName(row.provider_id ? String(row.provider_id) : null),
  })));
});

portalRouter.get('/lab-results/:orderId', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const order = queryOne(
    `SELECT lo.*, enc.patient_id, a.provider_id
     FROM lab_orders lo
     JOIN encounters enc ON enc.id = lo.encounter_id
     LEFT JOIN appointments a ON a.id = enc.appointment_id
     WHERE lo.id = ?`,
    String(req.params.orderId),
  );
  if (!order) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!assertPatientResourceAccess(res, ctx.patientId, String(order.patient_id))) return;

  const results = queryAll('SELECT * FROM lab_results WHERE lab_order_id = ?', String(order.id));
  res.json({
    orderId: String(order.id),
    testName: String(order.test_name),
    orderStatus: String(order.status),
    orderedAt: String(order.ordered_at),
    providerName: mapProviderName(order.provider_id ? String(order.provider_id) : null),
    results: results.map((r) => ({
      id: String(r.id),
      resultValue: r.result_value ? String(r.result_value) : undefined,
      resultUnit: r.result_unit ? String(r.result_unit) : undefined,
      abnormal: r.abnormal === 1,
      resultedAt: r.resulted_at ? String(r.resulted_at) : undefined,
      referenceRange: r.abnormal === 1 ? 'Outside normal range' : 'Within normal range',
    })),
  });
});

portalRouter.get('/messages/unread-count', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const row = queryOne(
    `SELECT COUNT(*) as c FROM messages m
     JOIN message_threads t ON t.id = m.thread_id
     WHERE t.patient_id = ? AND m.sender_role = 'provider' AND m.read_at IS NULL`,
    ctx.patientId,
  );
  res.json({ count: Number(row?.c ?? 0) });
});

portalRouter.get('/messages', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const threads = queryAll(
    'SELECT * FROM message_threads WHERE patient_id = ? ORDER BY updated_at DESC',
    ctx.patientId,
  );

  res.json(threads.map((t) => {
    const lastMsg = queryOne(
      'SELECT body, sender_role, created_at FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1',
      String(t.id),
    );
    const unread = queryOne(
      `SELECT COUNT(*) as c FROM messages WHERE thread_id = ? AND sender_role = 'provider' AND read_at IS NULL`,
      String(t.id),
    );
    return {
      id: String(t.id),
      subject: String(t.subject),
      status: String(t.status),
      providerName: mapProviderName(t.provider_id ? String(t.provider_id) : null),
      updatedAt: String(t.updated_at),
      lastPreview: lastMsg?.body ? String(lastMsg.body).slice(0, 120) : '',
      unreadCount: Number(unread?.c ?? 0),
    };
  }));
});

portalRouter.get('/messages/:threadId', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const thread = queryOne('SELECT * FROM message_threads WHERE id = ?', String(req.params.threadId));
  if (!thread) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!assertPatientResourceAccess(res, ctx.patientId, String(thread.patient_id))) return;

  execute(
    `UPDATE messages SET read_at = datetime('now') WHERE thread_id = ? AND sender_role = 'provider' AND read_at IS NULL`,
    String(thread.id),
  );

  const messages = queryAll(
    'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC',
    String(thread.id),
  );

  res.json({
    id: String(thread.id),
    subject: String(thread.subject),
    providerName: mapProviderName(thread.provider_id ? String(thread.provider_id) : null),
    messages: messages.map((m) => ({
      id: String(m.id),
      senderRole: String(m.sender_role),
      body: String(m.body),
      createdAt: String(m.created_at),
      readAt: m.read_at ? String(m.read_at) : undefined,
    })),
  });
});

portalRouter.post('/messages', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const { subject, body, providerId } = req.body as { subject?: string; body?: string; providerId?: string };
  if (!subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'Subject and body are required' });
    return;
  }

  const threadId = uuid();
  const msgId = uuid();
  const pid = providerId ?? defaultProviderId(ctx.patientId);
  execute(
    'INSERT INTO message_threads (id, patient_id, provider_id, subject, status, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    threadId, ctx.patientId, pid, subject.trim(), 'open',
  );
  execute(
    'INSERT INTO messages (id, thread_id, sender_role, body) VALUES (?, ?, ?, ?)',
    msgId, threadId, 'patient', body.trim(),
  );
  res.status(201).json({ threadId });
});

portalRouter.post('/messages/:threadId/reply', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const { body } = req.body as { body?: string };
  if (!body?.trim()) {
    res.status(400).json({ error: 'Body is required' });
    return;
  }

  const thread = queryOne('SELECT * FROM message_threads WHERE id = ?', String(req.params.threadId));
  if (!thread) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!assertPatientResourceAccess(res, ctx.patientId, String(thread.patient_id))) return;

  const msgId = uuid();
  execute('INSERT INTO messages (id, thread_id, sender_role, body) VALUES (?, ?, ?, ?)',
    msgId, String(thread.id), 'patient', body.trim());
  execute('UPDATE message_threads SET updated_at = datetime(\'now\') WHERE id = ?', String(thread.id));
  res.status(201).json({ id: msgId });
});

portalRouter.get('/billing', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const claims = queryAll('SELECT * FROM claims WHERE patient_id = ? ORDER BY created_at DESC', ctx.patientId);
  const payments = queryAll(
    'SELECT * FROM manual_payments WHERE patient_id = ? ORDER BY rowid DESC LIMIT 10',
    ctx.patientId,
  );

  res.json({
    balance: computePatientBalance(ctx.patientId),
    claims: claims.map((c) => ({
      id: String(c.id),
      status: String(c.status),
      payerName: c.payer_name ? String(c.payer_name) : undefined,
      totalAmount: Number(c.total_amount),
      submittedAt: c.submitted_at ? String(c.submitted_at) : undefined,
      createdAt: String(c.created_at),
    })),
    recentPayments: payments.map((p) => ({
      id: String(p.id),
      amount: Number(p.amount),
      method: p.method ? String(p.method) : undefined,
      claimId: p.claim_id ? String(p.claim_id) : undefined,
      note: p.note ? String(p.note) : undefined,
      createdAt: p.paid_at ? String(p.paid_at) : undefined,
    })),
  });
});

portalRouter.post('/billing/pay', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const { amount, claimId } = req.body as { amount?: number; claimId?: string };
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'Valid amount is required' });
    return;
  }

  if (claimId) {
    const claim = queryOne('SELECT patient_id FROM claims WHERE id = ?', claimId);
    if (!claim || !assertPatientResourceAccess(res, ctx.patientId, String(claim.patient_id))) return;
  }

  const balance = computePatientBalance(ctx.patientId);
  if (amount > balance) {
    res.status(400).json({ error: 'Amount exceeds balance due' });
    return;
  }

  const id = uuid();
  execute(
    'INSERT INTO manual_payments (id, patient_id, claim_id, amount, method, note) VALUES (?, ?, ?, ?, ?, ?)',
    id, ctx.patientId, claimId ?? null, amount, 'portal', 'Patient portal payment',
  );
  res.status(201).json({ balance: computePatientBalance(ctx.patientId) });
});

portalRouter.get('/refill-requests', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const rows = queryAll(
    'SELECT * FROM refill_requests WHERE patient_id = ? ORDER BY requested_at DESC',
    ctx.patientId,
  );
  res.json(rows.map((r) => ({
    id: String(r.id),
    medication: String(r.medication),
    dosage: r.dosage ? String(r.dosage) : undefined,
    pharmacy: r.pharmacy ? String(r.pharmacy) : undefined,
    status: String(r.status),
    erxOrderId: r.erx_order_id ? String(r.erx_order_id) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    requestedAt: String(r.requested_at),
  })));
});

portalRouter.post('/refill-requests', authRequired, (req, res) => {
  const ctx = requirePatientContext(req, res);
  if (!ctx) return;

  const { medication, dosage, pharmacy, notes, erxOrderId } = req.body as {
    medication?: string;
    dosage?: string;
    pharmacy?: string;
    notes?: string;
    erxOrderId?: string;
  };
  if (!medication?.trim()) {
    res.status(400).json({ error: 'Medication is required' });
    return;
  }

  const id = uuid();
  execute(
    'INSERT INTO refill_requests (id, patient_id, medication, dosage, pharmacy, status, erx_order_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, ctx.patientId, medication.trim(), dosage ?? null, pharmacy ?? null, 'pending', erxOrderId ?? null, notes ?? null,
  );
  res.status(201).json({ id });
});
