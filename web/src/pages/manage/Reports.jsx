import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api';

const STATUS_OPTIONS = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'waiting', label: 'ממתין' },
  { value: 'called', label: 'נקרא' },
  { value: 'serving', label: 'בטיפול' },
  { value: 'completed', label: 'הושלם' },
];

const STATUS_LABEL = {
  waiting: 'ממתין',
  called: 'נקרא',
  serving: 'בטיפול',
  completed: 'הושלם',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMin(m, live) {
  if (m == null || m === '') return '—';
  const suffix = live ? ' (עכשיו)' : '';
  if (m < 60) return `${m} דק׳${suffix}`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h} ש׳ ${r} דק׳${suffix}`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return iso.slice(11, 16);
}

const ACTION_LABEL = {
  call: 'קריאת תור',
  complete: 'סיום טיפול',
  summon_doctor: 'קריאה דחופה לרופא',
};

export default function Reports() {
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const [roomId, setRoomId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [report, log] = await Promise.all([
        api.getReports({
          from,
          to,
          room_id: roomId || undefined,
          service_id: serviceId || undefined,
          status: status || undefined,
        }),
        api.getActivityLog({ from, to, limit: 200 }),
      ]);
      setData(report);
      setActivity(log);
    } finally {
      setLoading(false);
    }
  }, [from, to, roomId, serviceId, status]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;

  return (
    <div>
      <h1 style={h1}>דוחות וסטטיסטיקה</h1>
      <p style={sub}>כמה נכנסו, זמני המתנה וטיפול, פילוח לפי חדר ושירות</p>

      <div className="card" style={filtersCard}>
        <div style={filtersRow}>
          <label style={flbl}>
            מתאריך
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label style={flbl}>
            עד תאריך
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label style={flbl}>
            חדר
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">הכל</option>
              {data?.rooms?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label style={flbl}>
            שירות
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">הכל</option>
              {data?.services?.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </label>
          <label style={flbl}>
            סטטוס
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={btnRow}>
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'טוען...' : 'הצג דוח'}
          </button>
          <button
            type="button"
            style={secBtn}
            onClick={() => {
              setFrom(todayStr());
              setTo(todayStr());
              setRoomId('');
              setServiceId('');
              setStatus('');
            }}
          >
            איפוס סינון
          </button>
          {data?.summary?.total > 0 && (
            <button
              type="button"
              className="reports-export-btn"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const { exportReportExcel } = await import('../../lib/exportReportExcel');
                  await exportReportExcel(data);
                } catch (e) {
                  alert(e.message || 'שגיאה בייצוא');
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? 'מייצא…' : 'ייצוא לאקסל'}
            </button>
          )}
        </div>
        {data?.period && (
          <p style={periodLbl}>
            תקופה: {data.period.from}
            {data.period.to !== data.period.from ? ` — ${data.period.to}` : ' (היום)'}
          </p>
        )}
      </div>

      {!data ? (
        <p>טוען...</p>
      ) : (
        <>
          <div style={grid}>
            <Stat label="נכנסו לתור" value={s.total} />
            <Stat label="ממתינים עכשיו" value={s.waiting} color="#fbbf24" />
            <Stat label="בטיפול / נקראו" value={s.in_progress} color="#38bdf8" />
            <Stat label="הושלמו" value={s.completed} color="#34d399" />
            <Stat label="נקראו (סה״כ)" value={s.called_count} color="#a78bfa" />
            <Stat label="המתנה ממוצעת" value={formatMin(s.avg_wait_min)} color="#f472b6" />
            <Stat label="המתנה מקסימלית" value={formatMin(s.max_wait_min)} color="#fb923c" />
            <Stat label="המתנה מינימלית" value={formatMin(s.min_wait_min)} />
            <Stat label="זמן טיפול ממוצע" value={formatMin(s.avg_service_min)} color="#2dd4bf" />
            <Stat label="זמן כולל ממוצע" value={formatMin(s.avg_total_min)} subtitle="כניסה → סיום" />
          </div>

          <h2 style={h2}>לפי חדר</h2>
          <div style={tableWrap}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>חדר</th>
                  <th>נכנסו</th>
                  <th>הושלמו</th>
                  <th>ממתינים</th>
                  <th>המתנה ממוצעת</th>
                </tr>
              </thead>
              <tbody>
                {data.byRoom.length ? (
                  data.byRoom.map((r) => (
                    <tr key={r.room_id ?? 'none'}>
                      <td style={{ color: r.room_color || '#e2e8f0', fontWeight: 600 }}>{r.room_name}</td>
                      <td>{r.total}</td>
                      <td>{r.completed}</td>
                      <td>{r.waiting}</td>
                      <td>{formatMin(r.avg_wait_min)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={empty}>
                      אין נתונים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 style={h2}>לפי שירות</h2>
          <div style={tableWrap}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>שירות</th>
                  <th>נכנסו</th>
                  <th>הושלמו</th>
                  <th>המתנה ממוצעת</th>
                </tr>
              </thead>
              <tbody>
                {data.byService.map((r) => (
                  <tr key={r.service_id}>
                    <td>
                      {r.service_name} <span style={muted}>({r.prefix})</span>
                    </td>
                    <td>{r.total}</td>
                    <td>{r.completed}</td>
                    <td>{formatMin(r.avg_wait_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={h2}>לפי קופת חולים</h2>
          <div style={tableWrap}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>קופה</th>
                  <th>נכנסו</th>
                  <th>הושלמו</th>
                  <th>ממתינים</th>
                  <th>המתנה ממוצעת</th>
                </tr>
              </thead>
              <tbody>
                {data.byHealthFund?.length ? (
                  data.byHealthFund.map((r) => (
                    <tr key={r.health_fund}>
                      <td style={{ fontWeight: 600 }}>{r.health_fund}</td>
                      <td>{r.total}</td>
                      <td>{r.completed}</td>
                      <td>{r.waiting}</td>
                      <td>{formatMin(r.avg_wait_min)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={empty}>
                      אין נתונים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 style={h2}>כניסות לפי שעה</h2>
          <div style={hourBar}>
            {Array.from({ length: 24 }, (_, h) => {
              const key = String(h).padStart(2, '0');
              const row = data.byHour.find((x) => x.hour === key);
              const count = row?.count || 0;
              const max = Math.max(...data.byHour.map((x) => x.count), 1);
              return (
                <div key={key} style={hourCell} title={`${key}:00 — ${count}`}>
                  <div
                    style={{
                      ...hourFill,
                      height: count ? `${Math.max(8, (count / max) * 72)}px` : 4,
                    }}
                  />
                  <span style={hourLbl}>{key}</span>
                </div>
              );
            })}
          </div>

          <h2 style={h2}>פירוט תורים ({data.tickets.length})</h2>
          <div style={tableWrap}>
            <table className="report-table report-table--detail">
              <thead>
                <tr>
                  <th>מספר</th>
                  <th>קופה</th>
                  <th>שירות</th>
                  <th>חדר</th>
                  <th>סטטוס</th>
                  <th>נכנס</th>
                  <th>נקרא</th>
                  <th>הושלם</th>
                  <th>המתנה</th>
                  <th>טיפול</th>
                  <th>סה״כ</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.display_code}</strong>
                    </td>
                    <td>{t.health_fund || '—'}</td>
                    <td>{t.service_name}</td>
                    <td style={{ color: t.room_color || '#94a3b8' }}>{t.room_name || '—'}</td>
                    <td>
                      <span style={statusPill(t.status)}>{STATUS_LABEL[t.status] || t.status}</span>
                    </td>
                    <td>{formatTime(t.created_at)}</td>
                    <td>{formatTime(t.called_at)}</td>
                    <td>{formatTime(t.completed_at)}</td>
                    <td>{formatMin(t.wait_min, t.wait_min_live)}</td>
                    <td>{formatMin(t.service_min)}</td>
                    <td>{formatMin(t.total_min)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={h2}>יומן פעולות</h2>
      <p style={sub}>מי קרא, סיים או הזמין רופא — לפי טווח התאריכים למעלה</p>
      {!activity?.length ? (
        <p style={empty}>אין רשומות בטווח זה</p>
      ) : (
        <div style={tableWrap}>
          <table className="report-table">
            <thead>
              <tr>
                <th>זמן</th>
                <th>משתמש</th>
                <th>פעולה</th>
                <th>תור</th>
                <th>חדר</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr key={row.id}>
                  <td>{formatTime(row.created_at)}</td>
                  <td>{row.username}</td>
                  <td>{ACTION_LABEL[row.action] || row.action}</td>
                  <td>{row.display_code || '—'}</td>
                  <td>{row.room_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, subtitle }) {
  return (
    <div className="card" style={statCard}>
      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: color || '#f1f5f9' }}>{value}</div>
      <div style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.85rem' }}>{label}</div>
      {subtitle && <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{subtitle}</div>}
    </div>
  );
}

function statusPill(st) {
  const colors = {
    waiting: { bg: '#422006', color: '#fbbf24' },
    called: { bg: '#0c4a6e', color: '#38bdf8' },
    serving: { bg: '#1e3a5f', color: '#60a5fa' },
    completed: { bg: '#052e16', color: '#34d399' },
  };
  const c = colors[st] || { bg: '#334155', color: '#cbd5e1' };
  return {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 600,
    background: c.bg,
    color: c.color,
  };
}

const h1 = { fontSize: '1.75rem', marginBottom: '0.35rem' };
const sub = { color: '#94a3b8', marginBottom: '1.25rem' };
const h2 = { fontSize: '1.15rem', margin: '1.5rem 0 0.65rem' };
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: '0.75rem',
};
const statCard = { textAlign: 'center', padding: '1rem' };
const filtersCard = { padding: '1.25rem', marginBottom: '1.25rem' };
const filtersRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: '0.75rem',
};
const flbl = { display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: '#94a3b8' };
const btnRow = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' };
const secBtn = {
  background: '#334155',
  color: '#e2e8f0',
  border: 'none',
  padding: '0.6rem 1rem',
  borderRadius: 10,
  fontWeight: 600,
  cursor: 'pointer',
};
const periodLbl = { marginTop: '0.75rem', fontSize: '0.9rem', color: '#64748b' };
const tableWrap = { overflow: 'auto', borderRadius: 10, border: '1px solid #334155' };
const empty = { textAlign: 'center', padding: '1.5rem', color: '#64748b' };
const muted = { color: '#64748b', fontSize: '0.85rem' };
const hourBar = {
  display: 'flex',
  gap: 4,
  alignItems: 'flex-end',
  padding: '1rem',
  background: '#1e293b',
  borderRadius: 10,
  overflowX: 'auto',
};
const hourCell = { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 };
const hourFill = { width: 20, background: '#0ea5e9', borderRadius: 4 };
const hourLbl = { fontSize: '0.65rem', color: '#64748b', marginTop: 4 };
