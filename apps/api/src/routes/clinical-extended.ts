import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';

export const clinicalExtendedRouter = Router();
clinicalExtendedRouter.use(authRequired);

clinicalExtendedRouter.put('/encounters/:id/extended-chart', (req, res) => {
  const id = String(req.params.id);
  execute('UPDATE encounters SET extended_chart_json = ? WHERE id = ?', JSON.stringify(req.body), id);
  const row = queryOne('SELECT extended_chart_json FROM encounters WHERE id = ?', id);
  res.json(row?.extended_chart_json ? JSON.parse(String(row.extended_chart_json)) : {});
});

clinicalExtendedRouter.get('/encounters/:id/extended-chart', (req, res) => {
  const row = queryOne('SELECT extended_chart_json FROM encounters WHERE id = ?', String(req.params.id));
  res.json(row?.extended_chart_json ? JSON.parse(String(row.extended_chart_json)) : {});
});

function orderRoutes(table: string, nameField: string): Router {
  const router = Router();
  router.get('/encounter/:encounterId', (req, res) => {
    res.json(queryAll(`SELECT * FROM ${table} WHERE encounter_id = ? ORDER BY ordered_at DESC`, String(req.params.encounterId)).map((r) => mapOrder(r, table, nameField)));
  });
  router.post('/encounter/:encounterId', (req, res) => {
    const id = uuid();
    const encId = String(req.params.encounterId);
    const body = req.body as Record<string, string>;
    if (table === 'external_lab_orders') {
      execute(`INSERT INTO ${table} (id, encounter_id, test_name, lab_name) VALUES (?, ?, ?, ?)`, id, encId, body.testName, body.labName ?? 'Quest');
    } else if (table === 'radiology_orders') {
      execute(`INSERT INTO ${table} (id, encounter_id, study_name, modality) VALUES (?, ?, ?, ?)`, id, encId, body.studyName, body.modality ?? 'XR');
    } else {
      execute(`INSERT INTO ${table} (id, encounter_id, test_name) VALUES (?, ?, ?)`, id, encId, body.testName);
    }
    res.status(201).json({ id });
  });
  router.patch('/:id/result', (req, res) => {
    const body = req.body as Record<string, string>;
    if (table === 'inhouse_lab_orders') {
      execute(`UPDATE ${table} SET status = 'resulted', result_value = ?, result_unit = ? WHERE id = ?`, body.resultValue, body.resultUnit, String(req.params.id));
    } else if (table === 'radiology_orders') {
      execute(`UPDATE ${table} SET status = 'resulted', result_summary = ? WHERE id = ?`, body.resultSummary, String(req.params.id));
    } else {
      execute(`UPDATE ${table} SET status = 'resulted' WHERE id = ?`, String(req.params.id));
    }
    res.json({ ok: true });
  });
  return router;
}

export const externalLabsRouter = orderRoutes('external_lab_orders', 'test_name');
export const inhouseLabsRouter = orderRoutes('inhouse_lab_orders', 'test_name');
export const radiologyRouter = orderRoutes('radiology_orders', 'study_name');

function mapOrder(row: Record<string, unknown>, table: string, nameField: string) {
  const base = { id: row.id, encounterId: row.encounter_id, status: row.status, orderedAt: row.ordered_at, name: row[nameField] };
  if (table === 'external_lab_orders') return { ...base, testName: row.test_name, labName: row.lab_name };
  if (table === 'radiology_orders') return { ...base, studyName: row.study_name, modality: row.modality, resultSummary: row.result_summary };
  return { ...base, testName: row.test_name, resultValue: row.result_value, resultUnit: row.result_unit };
}

export const documentsRouter = Router();
documentsRouter.use(authRequired);

documentsRouter.get('/patient/:patientId', (req, res) => {
  res.json(queryAll('SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY uploaded_at DESC', String(req.params.patientId)).map((d) => ({
    id: d.id, title: d.title, category: d.category, fileName: d.file_name, uploadedAt: d.uploaded_at,
  })));
});

documentsRouter.post('/patient/:patientId', (req, res) => {
  const { title, category, fileName } = req.body;
  const id = uuid();
  execute('INSERT INTO patient_documents (id, patient_id, title, category, file_name) VALUES (?, ?, ?, ?, ?)',
    id, String(req.params.patientId), title, category ?? 'general', fileName ?? 'document.pdf');
  res.status(201).json({ id });
});

export const auditRouter = Router();
auditRouter.use(authRequired);

auditRouter.get('/', (req, res) => {
  const patientId = req.query.patientId as string | undefined;
  let rows = queryAll('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  if (patientId) rows = rows.filter((r) => String(r.resource_id) === patientId || String(r.details_json ?? '').includes(patientId));
  res.json(rows.map((a) => ({
    id: a.id, action: a.action, resourceType: a.resource_type, resourceId: a.resource_id,
    details: a.details_json ? JSON.parse(String(a.details_json)) : undefined, createdAt: a.created_at,
  })));
});

auditRouter.post('/', (req, res) => {
  const { action, resourceType, resourceId, details } = req.body;
  const id = uuid();
  execute('INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details_json) VALUES (?, ?, ?, ?, ?, ?)',
    id, req.user!.id, action, resourceType, resourceId, details ? JSON.stringify(details) : null);
  res.status(201).json({ id });
});
