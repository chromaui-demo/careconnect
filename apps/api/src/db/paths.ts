import path from 'node:path';

export const DATA_DIR = process.env.CARECONNECT_DATA_DIR ?? path.join(process.cwd(), 'data');
export const DB_PATH = process.env.CARECONNECT_DB_PATH ?? path.join(DATA_DIR, 'careconnect.db');
