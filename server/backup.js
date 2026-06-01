import { copyFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { DB_PATH, BACKUP_DIR } from './paths.js';

export { DB_PATH, BACKUP_DIR };
const KEEP_DAYS = 14;

function backupFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `medqueue-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.db`;
}

export async function createBackup() {
  if (!existsSync(DB_PATH)) throw new Error('קובץ מסד נתונים לא נמצא');
  await mkdir(BACKUP_DIR, { recursive: true });
  const dest = join(BACKUP_DIR, backupFileName());
  await copyFile(DB_PATH, dest);
  await pruneOldBackups();
  return { path: dest, filename: dest.split(/[/\\]/).pop(), at: new Date().toISOString() };
}

async function pruneOldBackups() {
  let files;
  try {
    files = await readdir(BACKUP_DIR);
  } catch {
    return;
  }
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const f of files) {
    if (!f.endsWith('.db')) continue;
    const full = join(BACKUP_DIR, f);
    try {
      const st = await stat(full);
      if (st.mtimeMs < cutoff) await unlink(full);
    } catch {
      /* ignore */
    }
  }
}

export async function listBackups() {
  await mkdir(BACKUP_DIR, { recursive: true });
  let files;
  try {
    files = await readdir(BACKUP_DIR);
  } catch {
    return [];
  }
  const rows = [];
  for (const f of files) {
    if (!f.endsWith('.db')) continue;
    const full = join(BACKUP_DIR, f);
    try {
      const st = await stat(full);
      rows.push({
        filename: f,
        size_bytes: st.size,
        created_at: st.mtime.toISOString(),
      });
    } catch {
      /* ignore */
    }
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rows;
}

export async function getLastBackupTime() {
  const list = await listBackups();
  return list[0]?.created_at || null;
}

/** גיבוי יומי אם מופעל בהגדרות */
export async function maybeAutoBackup(settings) {
  if (settings?.backup_auto_daily !== '1') return null;
  const last = await getLastBackupTime();
  const today = new Date().toISOString().slice(0, 10);
  if (last && last.slice(0, 10) === today) return null;
  return createBackup();
}
