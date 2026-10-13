import express from 'express';
import cors from 'cors';
import { initDb } from './db/schema.js';
import { seedDatabase } from './db/seed.js';
import { migrateModules } from './db/migrate.js';
import { runMigrations } from './db/migrator.js';
import { MIGRATIONS } from './db/migrations/index.js';
import { authRouter, adminRouter } from './routes/auth.js';
import { patientsRouter } from './routes/patients.js';
import { appointmentsRouter } from './routes/appointments.js';
import { encountersRouter, reportsRouter, tasksRouter } from './routes/encounters.js';
import { paperworkRouter } from './routes/paperwork.js';
import { telemedRouter } from './routes/telemed.js';
import { labsRouter, erxRouter } from './routes/clinical.js';
import { billingRouter } from './routes/billing.js';
import { billingExtendedRouter } from './routes/billing-extended.js';
import { faxRouter } from './routes/fax.js';
import { aiRouter, labsInboxRouter } from './routes/ai.js';
import {
  clinicalExtendedRouter, documentsRouter, auditRouter,
  externalLabsRouter, inhouseLabsRouter, radiologyRouter,
} from './routes/clinical-extended.js';
import { reportsExtendedRouter } from './routes/reports-extended.js';
import { portalRouter } from './routes/portal.js';
import { APP_VERSION } from './version.js';

const PORT = Number(process.env.PORT ?? 5000);

initDb();
runMigrations(MIGRATIONS);
seedDatabase();
migrateModules();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'careconnect-api', version: APP_VERSION });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'careconnect-api', version: APP_VERSION });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/paperwork', paperworkRouter);
app.use('/api/telemed', telemedRouter);
app.use('/api/labs', labsRouter);
app.use('/api/labs-inbox', labsInboxRouter);
app.use('/api/erx', erxRouter);
app.use('/api/billing', billingRouter);
app.use('/api/billing', billingExtendedRouter);
app.use('/api/fax', faxRouter);
app.use('/api/ai-scribe', aiRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/reports', reportsExtendedRouter);
app.use('/api/clinical', clinicalExtendedRouter);
app.use('/api/external-labs', externalLabsRouter);
app.use('/api/inhouse-labs', inhouseLabsRouter);
app.use('/api/radiology', radiologyRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/portal', portalRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`CareConnect API listening on http://localhost:${PORT}`);
});
