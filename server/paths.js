import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** תיקיית נתונים: ב-Render דיסק ב-/var/data, מקומית server/data */
export const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');

export function ensureDataDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, 'backups'), { recursive: true });
  mkdirSync(join(DATA_DIR, 'uploads'), { recursive: true });
  mkdirSync(join(DATA_DIR, 'uploads', 'display'), { recursive: true });
  mkdirSync(join(DATA_DIR, 'whatsapp-auth'), { recursive: true });
}

export const DB_PATH = join(DATA_DIR, 'medqueue.db');
export const BACKUP_DIR = join(DATA_DIR, 'backups');
export const UPLOAD_DIR = join(DATA_DIR, 'uploads');
