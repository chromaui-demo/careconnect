import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const labsRouter = Router();
labsRouter.use(authRequired);

labsRouter.get('/encounter/:encounterId', (req, res) => {
  const encounterId = String(req.params.encounterId);
  const orders = queryAll('SELECT * FROM lab_orders WHERE encounter_id = ? ORDER BY ordered_at DESC', encounterId);
  res.json(orders.map(mapOrder));
});

labsRouter.post('/encounter/:encounterId', (req, res) => {
  const encounterId = String(req.params.encounterId);
  const { testName } = req.body;
  const id = uuid();
  execute('INSERT INTO lab_orders (id, encounter_id, test_name) VALUES (?, ?, ?)', id, encounterId, testName);
  res.status(201).json(mapOrder(queryOne('SELECT * FROM lab_orders WHERE id = ?', id)!));
});

labsRouter.post('/:orderId/result', (req, res) => {
  const orderId = String(req.params.orderId);
  const { resultValue, resultUnit, abnormal } = req.body;
  const resultId = uuid();
  execute(
    'INSERT INTO lab_results (id, lab_order_id, result_value, result_unit, abnormal, resulted_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
    resultId, orderId, resultValue, resultUnit ?? '', abnormal ? 1 : 0,
  );
  execute("UPDATE lab_orders SET status = 'resulted' WHERE id = ?", orderId);
  res.json({ id: resultId });
});

function mapOrder(row: Record<string, unknown>) {
  const results = queryAll('SELECT * FROM lab_results WHERE lab_order_id = ?', String(row.id));
  return {
    id: row.id,
    encounterId: row.encounter_id,
    testName: row.test_name,
    status: row.status,
    orderedAt: row.ordered_at,
    results: results.map((r) => ({
      id: r.id,
      value: r.result_value,
      unit: r.result_unit,
      abnormal: r.abnormal === 1,
      resultedAt: r.resulted_at,
    })),
  };
}

export const erxRouter = Router();
erxRouter.use(authRequired);

erxRouter.get('/encounter/:encounterId', (req, res) => {
  const rows = queryAll('SELECT * FROM erx_orders WHERE encounter_id = ? ORDER BY ordered_at DESC', String(req.params.encounterId));
  res.json(rows.map((r) => ({
    id: r.id,
    medication: r.medication,
    dosage: r.dosage,
    status: r.status,
    pharmacy: r.pharmacy,
    orderedAt: r.ordered_at,
  })));
});

erxRouter.post('/encounter/:encounterId', (req, res) => {
  const id = uuid();
  const { medication, dosage, pharmacy } = req.body;
  execute(
    'INSERT INTO erx_orders (id, encounter_id, medication, dosage, pharmacy, status) VALUES (?, ?, ?, ?, ?, ?)',
    id, String(req.params.encounterId), medication, dosage, pharmacy ?? 'CVS Pharmacy', 'sent',
  );
  res.status(201).json({ id, status: 'sent', message: 'Demo eRx — integrate Surescripts for production' });
});
