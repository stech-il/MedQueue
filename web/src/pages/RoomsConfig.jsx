import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function RoomsConfig() {
  const [rooms, setRooms] = useState([]);
  const [draft, setDraft] = useState({});
  const [msg, setMsg] = useState('');

  const load = () => api.getRooms().then(setRooms);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const d = {};
    for (const r of rooms) d[r.id] = r.shared_group || '';
    setDraft(d);
  }, [rooms]);

  const save = async (id) => {
    try {
      await api.updateRoom(id, { shared_group: draft[id]?.trim() || null });
      setMsg('נשמר');
      await load();
    } catch (e) {
      setMsg(e.message);
    }
    setTimeout(() => setMsg(''), 2500);
  };

  const linkDoctors = async () => {
    const d1 = rooms.find((r) => r.slug === 'doctor-1');
    const d2 = rooms.find((r) => r.slug === 'doctor-2');
    if (d1) await api.updateRoom(d1.id, { shared_group: 'doctors' });
    if (d2) await api.updateRoom(d2.id, { shared_group: 'doctors' });
    setMsg('רופא 1 + רופא 2 מקושרים');
    await load();
    setTimeout(() => setMsg(''), 2500);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/admin" style={styles.back}>
          ← ניהול
        </Link>
        <h1>חדרים משותפים</h1>
        <p style={styles.sub}>
          חדרים עם אותה &quot;קבוצה&quot; חולקים תור ממתינים — מי שפנוי קודם לוקח את הבא.
        </p>
      </header>

      {msg && <p style={styles.msg}>{msg}</p>}

      <button type="button" className="btn-primary" style={{ marginBottom: '1.5rem' }} onClick={linkDoctors}>
        קשר רופא 1 + רופא 2 (קבוצה: doctors)
      </button>

      <div style={styles.list}>
        {rooms.map((r) => (
          <div key={r.id} className="card" style={styles.row}>
            <div>
              <strong>{r.name}</strong>
              <span style={styles.slug}>{r.slug}</span>
            </div>
            <input
              type="text"
              placeholder="שם קבוצה (ריק = חדר נפרד)"
              value={draft[r.id] ?? ''}
              onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })}
              style={styles.input}
            />
            <button type="button" className="btn-ghost" onClick={() => save(r.id)}>
              שמור
            </button>
            <Link to={`/room/${r.id}`} style={styles.link}>
              עמדה ↗
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 640, margin: '0 auto', padding: '2rem' },
  header: { marginBottom: '1.5rem' },
  back: { color: '#94a3b8', textDecoration: 'none' },
  sub: { color: '#94a3b8', marginTop: '0.5rem' },
  msg: { color: '#34d399', marginBottom: '1rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.75rem', alignItems: 'center' },
  slug: { color: '#64748b', marginRight: '0.5rem', fontSize: '0.85rem' },
  input: { margin: 0 },
  link: { fontSize: '0.9rem', whiteSpace: 'nowrap' },
};
