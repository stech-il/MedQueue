import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useSocket } from '../hooks/useSocket';

const STATUS_LABEL = {
  waiting: 'ממתין',
  called: 'נקרא',
  serving: 'בטיפול',
  completed: 'הושלם',
};

export default function Admin() {
  const navigate = useNavigate();
  const { roomId: roomParam } = useParams();
  const [rooms, setRooms] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState({});
  const [selectedRoom, setSelectedRoom] = useState(roomParam ? Number(roomParam) : null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const [r, t, s, st] = await Promise.all([
      api.getRooms(),
      api.getTickets(),
      api.getStats(),
      api.getSettings(),
    ]);
    setRooms(r);
    setTickets(t);
    setStats(s);
    setSettings(st);
    if (selectedRoom) {
      const q = await api.getQueue(selectedRoom);
      setQueue(q);
    }
  }, [selectedRoom]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (roomParam) navigate(`/room/${roomParam}`, { replace: true });
  }, [roomParam, navigate]);

  useSocket({
    'state:refresh': refresh,
    'ticket:created': refresh,
    'ticket:called': refresh,
    'ticket:updated': refresh,
    'ticket:moved': refresh,
    'ticket:completed': refresh,
  });

  const room = rooms.find((r) => r.id === selectedRoom);

  const showMsg = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const act = async (fn, successMsg) => {
    setLoading(true);
    try {
      await fn();
      showMsg(successMsg);
      await refresh();
    } catch (e) {
      showMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const roomTickets = tickets.filter((t) => t.current_room_id === selectedRoom && t.status !== 'completed');

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <Link to="/" style={styles.brandLink}>
            🏥 {settings.clinic_name || 'MedQueue'}
          </Link>
        </div>
        <div style={styles.stats}>
          <div>
            <strong>{stats.total ?? 0}</strong>
            <span>היום</span>
          </div>
          <div>
            <strong>{stats.waiting ?? 0}</strong>
            <span>ממתינים</span>
          </div>
          <div>
            <strong>{stats.completed ?? 0}</strong>
            <span>הושלמו</span>
          </div>
        </div>
        <h3 style={styles.sideTitle}>חדרים</h3>
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            style={{
              ...styles.roomBtn,
              ...(selectedRoom === r.id ? { borderColor: r.color, background: '#334155' } : {}),
            }}
            onClick={() => navigate(`/room/${r.id}`)}
          >
            <span style={{ ...styles.dot, background: r.color }} />
            {r.name}
            <span style={styles.count}>
              {tickets.filter((t) => t.current_room_id === r.id && t.status !== 'completed').length}
            </span>
          </button>
        ))}
        <div style={styles.links}>
          <Link to="/kiosk" target="_blank">
            קיוסק ↗
          </Link>
          <Link to="/display" target="_blank">
            מסך ראשי ↗
          </Link>
          <Link to="/settings/rooms">חדרים משותפים</Link>
          {selectedRoom && (
            <>
              <Link to={`/room/${selectedRoom}`} target="_blank">
                עמדת חדר ↗
              </Link>
              <Link to={`/display/room/${selectedRoom}`} target="_blank">
                מסך חדר ↗
              </Link>
            </>
          )}
        </div>
      </aside>

      <main style={styles.main}>
        {msg && <div style={styles.toast}>{msg}</div>}

        {!selectedRoom ? (
          <div style={styles.placeholder}>
            <p>בחר חדר מהרשימה — ייפתח עמדת חדר חדשה</p>
            <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '0.95rem' }}>
              רופא 1: <Link to="/room/3">/room/3</Link> · קבלה: <Link to="/room/1">/room/1</Link>
            </p>
          </div>
        ) : (
          <>
            <header style={styles.header}>
              <h1 style={{ color: room?.color }}>{room?.name}</h1>
              <div style={styles.headerActions}>
                <button
                  type="button"
                  className="btn-success"
                  disabled={loading}
                  onClick={() =>
                    act(() => api.callNext(selectedRoom), 'התור הבא נקרא')
                  }
                >
                  ▶ קרא הבא
                </button>
              </div>
            </header>

            <section style={styles.section}>
              <h2>פעילים בחדר ({roomTickets.length})</h2>
              <div style={styles.ticketGrid}>
                {roomTickets.map((t) => (
                  <div key={t.id} className="card" style={styles.ticketCard}>
                    <div style={styles.ticketTop}>
                      <span style={styles.code}>{t.display_code}</span>
                      <span className={`badge status-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                    </div>
                    <p style={styles.patient}>
                      {t.patient_name || (t.id_number ? `ת.ז. ${t.id_number}` : '—')}
                    </p>
                    {(t.phone || t.health_fund) && (
                      <p style={styles.meta} dir="ltr">
                        {t.phone}
                        {t.health_fund && ` · ${t.health_fund}`}
                      </p>
                    )}
                    <p style={styles.svc}>{t.service_name}</p>
                    <div style={styles.btnRow}>
                      {t.status === 'called' && (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={loading}
                          onClick={() => act(() => api.serveTicket(t.id), 'בטיפול')}
                        >
                          התחל טיפול
                        </button>
                      )}
                      {t.status === 'serving' && (
                        <button
                          type="button"
                          className="btn-success"
                          disabled={loading}
                          onClick={() => act(() => api.completeTicket(t.id), 'הושלם')}
                        >
                          סיים
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-warning"
                        disabled={loading}
                        onClick={() =>
                          act(() => api.recallTicket(t.id, selectedRoom), 'נקרא שוב')
                        }
                      >
                        הקרא שוב
                      </button>
                      {t.status === 'called' && (
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={loading}
                          onClick={() => act(() => api.skipTicket(t.id), 'דולג')}
                        >
                          דלג
                        </button>
                      )}
                    </div>
                    <div style={styles.moveRow}>
                      <label>העבר לחדר:</label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const rid = Number(e.target.value);
                          if (rid)
                            act(() => api.moveTicket(t.id, rid), `הועבר ל${rooms.find((r) => r.id === rid)?.name}`);
                          e.target.value = '';
                        }}
                      >
                        <option value="">בחר...</option>
                        {rooms
                          .filter((r) => r.id !== selectedRoom)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ))}
                {roomTickets.length === 0 && <p style={styles.empty}>אין תורים פעילים בחדר זה</p>}
              </div>
            </section>

            <section style={styles.section}>
              <h2>תור המתנה ({queue.length})</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>מספר</th>
                    <th>ת.ז. / שם</th>
                    <th>טלפון</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.display_code}</strong>
                      </td>
                      <td dir="ltr">{t.id_number || t.patient_name || '—'}</td>
                      <td dir="ltr">{t.phone || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                          disabled={loading}
                          onClick={() =>
                            act(() => api.callTicket(t.id, selectedRoom), `נקרא ${t.display_code}`)
                          }
                        >
                          קרא
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {queue.length === 0 && <p style={styles.empty}>אין ממתינים</p>}
            </section>

            <section style={styles.section}>
              <h2>כל התורים הפעילים היום</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>מספר</th>
                    <th>ת.ז. / שם</th>
                    <th>טלפון</th>
                    <th>חדר</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 30).map((t) => (
                    <tr key={t.id}>
                      <td>{t.display_code}</td>
                      <td dir="ltr">{t.id_number || t.patient_name || '—'}</td>
                      <td dir="ltr">{t.phone || '—'}</td>
                      <td>{t.room_name || '—'}</td>
                      <td>
                        <span className={`badge status-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', minHeight: '100%' },
  sidebar: {
    width: '260px',
    background: '#1e293b',
    padding: '1.25rem',
    borderLeft: '1px solid #334155',
    flexShrink: 0,
  },
  brand: { marginBottom: '1.5rem' },
  brandLink: { color: '#f1f5f9', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  sideTitle: { fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' },
  roomBtn: {
    width: '100%',
    textAlign: 'right',
    padding: '0.65rem 0.75rem',
    marginBottom: '0.35rem',
    background: '#0f172a',
    color: '#f1f5f9',
    border: '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  count: { marginRight: 'auto', background: '#334155', padding: '0.1rem 0.45rem', borderRadius: 8, fontSize: '0.75rem' },
  links: { marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' },
  main: { flex: 1, padding: '1.5rem', overflow: 'auto' },
  toast: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#22c55e',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: 8,
    zIndex: 100,
    fontWeight: 600,
  },
  placeholder: { color: '#64748b', marginTop: '4rem', textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  headerActions: { display: 'flex', gap: '0.5rem' },
  section: { marginBottom: '2rem' },
  ticketGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' },
  ticketCard: {},
  ticketTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: '1.75rem', fontWeight: 800 },
  patient: { fontSize: '1.1rem', marginTop: '0.5rem' },
  svc: { color: '#94a3b8', fontSize: '0.9rem' },
  meta: { color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' },
  btnRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' },
  moveRow: { marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' },
  empty: { color: '#64748b', padding: '1rem' },
};
