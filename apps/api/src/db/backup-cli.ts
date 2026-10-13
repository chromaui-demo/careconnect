import { backupDatabase } from './backup.js';

const backupPath = backupDatabase();
if (backupPath) {
  console.log(backupPath);
}
