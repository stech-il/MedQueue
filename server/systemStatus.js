import { stat } from 'fs/promises';
import { existsSync } from 'fs';
import { DB_PATH, getLastBackupTime } from './backup.js';

export async function getSystemStatus(db) {
  const settings = db.getSettings();
  let dbSize = null;
  if (existsSync(DB_PATH)) {
    try {
      const st = await stat(DB_PATH);
      dbSize = st.size;
    } catch {
      /* ignore */
    }
  }

  let internet_ok = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch('https://www.microsoft.com/favicon.ico', {
      method: 'HEAD',
      signal: ctrl.signal,
    });
    clearTimeout(t);
    internet_ok = res.ok;
  } catch {
    internet_ok = false;
  }

  const lastBackup = await getLastBackupTime();

  return {
    server_ok: true,
    db_exists: existsSync(DB_PATH),
    db_size_bytes: dbSize,
    internet_ok,
    tts_provider: settings.tts_provider || 'edge',
    tts_playback: settings.tts_playback || 'browser',
    backup_auto_daily: settings.backup_auto_daily === '1',
    last_called_at: db.getLastCalledAtToday(),
    last_backup_at: lastBackup,
    clinic_name: settings.clinic_name || 'MedQueue',
    checked_at: new Date().toISOString(),
  };
}
