import { db } from './schema.js';

type SqlParam = string | number | null | bigint;

/**
 * Optional request-body fields arrive as undefined, which SQLite refuses to
 * bind ("Provided value cannot be bound"). Store them as NULL, which is what
 * every caller means — COALESCE(?, column) then keeps the existing value.
 */
function bindable(params: SqlParam[]): SqlParam[] {
  return params.map((p) => (p === undefined ? null : p));
}

export function queryAll(sql: string, ...params: SqlParam[]): Record<string, unknown>[] {
  return db.prepare(sql).all(...bindable(params)) as Record<string, unknown>[];
}

export function queryOne(sql: string, ...params: SqlParam[]): Record<string, unknown> | undefined {
  return db.prepare(sql).get(...bindable(params)) as Record<string, unknown> | undefined;
}

export function execute(sql: string, ...params: SqlParam[]) {
  return db.prepare(sql).run(...bindable(params));
}

export function queryCount(sql: string, ...params: SqlParam[]): number {
  const row = queryOne(sql, ...params);
  if (!row) return 0;
  const val = Object.values(row)[0];
  return Number(val);
}
