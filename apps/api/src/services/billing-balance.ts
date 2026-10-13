import { queryOne } from '../db/helpers.js';

export function computePatientBalance(patientId: string): number {
  const row = queryOne(
    `SELECT COALESCE(SUM(CASE WHEN status IN ('submitted','denied','draft') THEN total_amount ELSE 0 END), 0) as bal FROM claims WHERE patient_id = ?`,
    patientId,
  );
  const paid = queryOne('SELECT COALESCE(SUM(amount),0) as total FROM manual_payments WHERE patient_id = ?', patientId);
  return Math.max(0, Number(row?.bal ?? 0) - Number(paid?.total ?? 0));
}
