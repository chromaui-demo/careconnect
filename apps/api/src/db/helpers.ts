import { db } from './schema.js';

type SqlParam = string | number | null | bigint;

export function queryAll(sql: string, ...params: SqlParam[]): Record<string, unknown>[] {
  return db.prepare(sql).all(...params) as Record<string, unknown>[];
}

export function queryOne(sql: string, ...params: SqlParam[]): Record<string, unknown> | undefined {
  return db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
}

export function execute(sql: string, ...params: SqlParam[]) {
  return db.prepare(sql).run(...params);
}

export function queryCount(sql: string, ...params: SqlParam[]): number {
  const row = queryOne(sql, ...params);
  if (!row) return 0;
  const val = Object.values(row)[0];
  return Number(val);
}
