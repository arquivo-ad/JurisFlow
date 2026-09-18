import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'juris_db.json');

export function initLocalDbDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err: any) {
    console.warn('[LocalDb] Failed to create data dir:', err.message);
  }
}

export function loadLocalDb(): any | null {
  try {
    initLocalDbDir();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users) && parsed.users.length > 0) {
        console.log('[LocalDb] Loaded persistent database from disk:', DB_FILE, `(${parsed.users.length} users)`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[LocalDb] Warning reading local db file, falling back:', err.message);
  }
  return null;
}

export function saveLocalDb(db: any): void {
  try {
    initLocalDbDir();
    if (!db || !Array.isArray(db.users) || db.users.length === 0) {
      return;
    }
    const serialized = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_FILE, serialized, 'utf-8');
  } catch (err: any) {
    console.error('[LocalDb] Error writing database to disk:', err.message);
  }
}
