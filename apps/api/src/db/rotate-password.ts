import bcrypt from 'bcryptjs';
import { db } from './schema.js';

const newPassword = process.env.NEW_SEEDED_PASSWORD;

if (!newPassword) {
  console.error('ERROR: set NEW_SEEDED_PASSWORD to the new password before running this.');
  process.exit(1);
}
if (newPassword.length < 12) {
  console.error('ERROR: NEW_SEEDED_PASSWORD is too short (min 12 characters).');
  process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 10);
const result = db.prepare('UPDATE users SET password_hash = ?').run(hash);

console.log(`Rotated password_hash for ${result.changes} user(s).`);
