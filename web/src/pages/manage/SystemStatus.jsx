import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

function formatBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('he-IL');
  } catch {
    return iso;
  }
}

function StatusRow({ label, ok, detail }) {
  return (
    <div className="sys-status__row">
      <span className={`sys-status__dot ${ok ? 'sys-status__dot--ok' : 'sys-status__dot--bad'}`} />
      <div>
        <strong>{label}</strong>
        {detail && <p className="sys-status__detail">{detail}</p>}
      </div>
    </div>
  );
}

export default function SystemStatus() {
  const [data, setData] = useState(null);
  const [backups, setBackups] = useState([]);
  const [msg, setMsg] = useState('');
  const [backing, setBacking] = useState(false);

  const load = useCallback(async () => {
    const [status, b] = await Promise.all([api.getSystemStatus(), api.getBackups()]);
    setData(status);
    setBackups(b.backups || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const runBackup = async () => {
    setBacking(true);
    setMsg('');
    try {
      const r = await api.createBackup();
      setMsg(`גיבוי נוצר: ${r.filename}`);
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBacking(false);
    }
  };

  if (!data) return <p style={{ color: 'var(--muted)' }}>טוען סטטוס…</p>;

  return (
    <div className="sys-status">
      <h1 className="sys-status__title">סטטוס מערכת</h1>
      <p className="sys-status__sub">בדיקה אחרונה: {formatDt(data.checked_at)}</p>
      {msg && <p className="sys-status__msg">{msg}</p>}

      <div className="card sys-status__card">
        <h2>תפעול</h2>
        <StatusRow label="שרת API" ok={data.server_ok} />
        <StatusRow label="מסד נתונים" ok={data.db_exists} detail={`גודל: ${formatBytes(data.db_size_bytes)}`} />
        <StatusRow
          label="אינטרנט (להקראה Edge)"
          ok={data.internet_ok}
          detail={data.internet_ok ? 'זמין' : 'לא זוהה — בדקו חיבור'}
        />
        <StatusRow
          label="הקראה"
          ok
          detail={`${data.tts_playback === 'server' ? 'מהשרת' : 'בדפדפן'} · ${
            data.tts_provider === 'gemini'
              ? 'Gemini'
              : data.tts_provider === 'edge'
                ? 'Microsoft Neural'
                : 'דפדפן'
          }`}
        />
        <StatusRow label="קריאה אחרונה היום" ok={Boolean(data.last_called_at)} detail={formatDt(data.last_called_at)} />
      </div>

      <div className="card sys-status__card">
        <h2>גיבויים</h2>
        <StatusRow
          label="גיבוי אוטומטי יומי"
          ok={data.backup_auto_daily}
          detail={data.backup_auto_daily ? 'פעיל' : 'כבוי — הפעילו בהגדרות'}
        />
        <StatusRow label="גיבוי אחרון" ok={Boolean(data.last_backup_at)} detail={formatDt(data.last_backup_at)} />
        <button type="button" className="btn-primary" disabled={backing} onClick={runBackup}>
          {backing ? 'מגבה…' : 'גיבוי ידני עכשיו'}
        </button>
        {backups.length > 0 && (
          <ul className="sys-status__backups">
            {backups.slice(0, 8).map((b) => (
              <li key={b.filename}>
                {b.filename} — {formatBytes(b.size_bytes)} — {formatDt(b.created_at)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
