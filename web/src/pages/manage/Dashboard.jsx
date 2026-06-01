import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getDashboard().then(setData);
  }, []);

  if (!data) return <p>טוען...</p>;

  const { stats, roomStats } = data;

  return (
    <div>
      <div style={topRow}>
        <h1 style={h1}>לוח בקרה</h1>
        <Link to="/manage/reports" style={reportsLink}>
          דוחות מלאים וסטטיסטיקה →
        </Link>
      </div>
      <div style={grid}>
        <Stat label="תורים היום" value={stats.total} />
        <Stat label="ממתינים" value={stats.waiting} color="#fbbf24" />
        <Stat label="בטיפול/נקראו" value={stats.serving} color="#38bdf8" />
        <Stat label="הושלמו" value={stats.completed} color="#34d399" />
      </div>
      <h2 style={h2}>מצב חדרים</h2>
      <div style={roomGrid}>
        {roomStats.map(({ room, waiting, current, partners }) => (
          <div key={room.id} className="card" style={roomCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ color: room.color }}>{room.name}</strong>
              <Link to={`/room/${room.id}`} target="_blank">
                עמדה ↗
              </Link>
            </div>
            {partners.length > 0 && (
              <p style={meta}>תור משותף: {partners.join(', ')}</p>
            )}
            <p style={meta}>ממתינים: {waiting}</p>
            <p style={currentStyle}>{current ? `פעיל: ${current}` : 'פנוי'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card" style={statCard}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: color || '#f1f5f9' }}>{value}</div>
      <div style={{ color: '#94a3b8', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

const topRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.75rem',
  marginBottom: '1.25rem',
};
const h1 = { fontSize: '1.75rem', margin: 0 };
const reportsLink = { color: '#38bdf8', fontWeight: 600, textDecoration: 'none' };
const h2 = { fontSize: '1.2rem', margin: '1.5rem 0 0.75rem' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' };
const statCard = { textAlign: 'center', padding: '1.25rem' };
const roomGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' };
const roomCard = { padding: '1rem' };
const meta = { color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' };
const currentStyle = { marginTop: '0.5rem', fontWeight: 600 };
