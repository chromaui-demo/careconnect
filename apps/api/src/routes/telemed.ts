import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { execute, queryAll, queryOne } from '../db/helpers.js';
import { authRequired } from '../middleware/auth.js';
import { assertAppointmentAccess } from '../services/patient-access.js';

export const telemedRouter = Router();

function getOrCreateSession(appointmentId: string) {
  let session = queryOne('SELECT * FROM telemed_sessions WHERE appointment_id = ?', appointmentId);
  if (!session) {
    const id = uuid();
    const roomId = `careconnect-${appointmentId.slice(0, 8)}`;
    execute(
      'INSERT INTO telemed_sessions (id, appointment_id, status, room_id) VALUES (?, ?, ?, ?)',
      id, appointmentId, 'waiting', roomId,
    );
    session = queryOne('SELECT * FROM telemed_sessions WHERE id = ?', id)!;
  }
  return session;
}

function mapSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    status: row.status,
    roomId: row.room_id,
    patientJoinedAt: row.patient_joined_at,
    providerJoinedAt: row.provider_joined_at,
    endedAt: row.ended_at,
  };
}

telemedRouter.get('/:appointmentId/session', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const appt = queryOne('SELECT service_mode FROM appointments WHERE id = ?', appointmentId);
  if (!appt) { res.status(404).json({ error: 'Not found' }); return; }
  if (appt.service_mode !== 'virtual') {
    res.status(400).json({ error: 'Not a virtual visit' });
    return;
  }
  res.json(mapSession(getOrCreateSession(appointmentId)));
});

telemedRouter.post('/:appointmentId/join', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const role = (req.body.role as string) ?? 'patient';
  const session = getOrCreateSession(appointmentId);

  if (role === 'patient') {
    execute(
      'UPDATE telemed_sessions SET patient_joined_at = datetime(\'now\'), status = CASE WHEN status = \'waiting\' THEN \'patient-ready\' ELSE status END WHERE appointment_id = ?',
      appointmentId,
    );
  } else {
    execute(
      'UPDATE telemed_sessions SET provider_joined_at = datetime(\'now\'), status = \'in-call\' WHERE appointment_id = ?',
      appointmentId,
    );
    execute("UPDATE appointments SET status = 'in-office' WHERE id = ? AND status = 'prebooked'", appointmentId);
  }

  const updated = queryOne('SELECT * FROM telemed_sessions WHERE appointment_id = ?', appointmentId)!;
  res.json({
    ...mapSession(updated),
    token: `demo-token-${appointmentId}-${Date.now()}`,
    message: 'Demo telemed — integrate WebRTC/Twilio for production video',
  });
});

telemedRouter.post('/:appointmentId/end', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  execute(
    'UPDATE telemed_sessions SET status = \'ended\', ended_at = datetime(\'now\') WHERE appointment_id = ?',
    appointmentId,
  );
  const updated = queryOne('SELECT * FROM telemed_sessions WHERE appointment_id = ?', appointmentId);
  res.json(updated ? mapSession(updated) : { status: 'ended' });
});

telemedRouter.post('/:appointmentId/signal', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const { fromRole, signalType, payload } = req.body;
  const id = uuid();
  execute(
    'INSERT INTO telemed_signals (id, appointment_id, from_role, signal_type, payload_json) VALUES (?, ?, ?, ?, ?)',
    id, appointmentId, fromRole, signalType, JSON.stringify(payload ?? {}),
  );
  res.status(201).json({ id });
});

telemedRouter.get('/:appointmentId/signals', authRequired, (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  if (!assertAppointmentAccess(req, res, appointmentId)) return;
  const after = req.query.after as string | undefined;
  let rows = queryAll(
    'SELECT * FROM telemed_signals WHERE appointment_id = ? ORDER BY created_at ASC',
    appointmentId,
  );
  if (after) {
    const afterRow = queryOne('SELECT created_at FROM telemed_signals WHERE id = ?', after);
    if (afterRow) {
      rows = rows.filter((r) => String(r.created_at) > String(afterRow.created_at));
    }
  }
  res.json(rows.map((r) => ({
    id: r.id, fromRole: r.from_role, signalType: r.signal_type,
    payload: JSON.parse(String(r.payload_json)), createdAt: r.created_at,
  })));
});
