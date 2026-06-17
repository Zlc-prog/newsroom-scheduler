import Database from '@tauri-apps/plugin-sql';
import { MIGRATIONS, COLUMN_MIGRATIONS } from './migrations';
import { seedTestData } from './seed';

const DB_URL = 'sqlite:app.db';

let dbPromise: Promise<Database> | null = null;

async function ensureHaomeiDept(db: Database): Promise<void> {
  await db.execute(
    "INSERT OR IGNORE INTO departments (name, description) VALUES ('海媒室', '默认部门')"
  );
  await db.execute(
    "UPDATE employees SET department_id = (SELECT id FROM departments WHERE name = '海媒室')"
  );
}

async function init(db: Database): Promise<Database> {
  await db.execute('PRAGMA journal_mode = WAL;');
  await db.execute('PRAGMA busy_timeout = 5000;');
  await db.execute('PRAGMA foreign_keys = ON;');
  // Disable auto-checkpoint: prevents brief exclusive locks on all connections
  await db.execute('PRAGMA wal_autocheckpoint = 0;');
  for (const stmt of MIGRATIONS) {
    await db.execute(stmt);
  }
  // Column additions: swallow errors so they're safe on both fresh and upgraded DBs
  for (const stmt of COLUMN_MIGRATIONS) {
    try { await db.execute(stmt); } catch { /* column already exists */ }
  }
  await ensureHaomeiDept(db);
  await seedTestData(db);
  return db;
}

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).then(init);
  }
  return dbPromise;
}
