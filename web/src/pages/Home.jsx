import { Link } from 'react-router-dom';
import { unlockAudioPlayback } from '../lib/announce';

const links = [
  { to: '/kiosk', title: 'קיוסק', desc: 'לקיחת תור', icon: '🎫', color: '#059669' },
  { to: '/room', title: 'עמדת חדר', desc: 'נפתח אוטומטית לחדר האחרון', icon: '🚪', color: '#0d9488' },
  { to: '/display', title: 'מסך ראשי', desc: 'ממתינים + הודעות', icon: '📺', color: '#2563eb' },
  { to: '/login', title: 'ניהול מערכת', desc: 'מנהל בלבד — סיסמה נדרשת', icon: '🔐', color: '#dc2626' },
];

export default function Home() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>🏥</div>
        <h1 style={styles.title}>MedQueue</h1>
        <p style={styles.sub}>מערכת ניהול תורים לבית רופאים</p>
      </header>
      <div style={styles.grid}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            style={{ ...styles.card, borderColor: l.color }}
            onPointerDown={() => {
              if (l.to.startsWith('/display')) unlockAudioPlayback();
            }}
          >
            <span style={styles.icon}>{l.icon}</span>
            <h2>{l.title}</h2>
            <p>{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
  },
  header: { textAlign: 'center', marginBottom: '3rem' },
  logo: { fontSize: '4rem' },
  title: { fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem' },
  sub: { color: '#94a3b8', marginTop: '0.5rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    maxWidth: '900px',
    width: '100%',
  },
  card: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '1.75rem',
    textDecoration: 'none',
    color: '#f1f5f9',
    border: '2px solid',
  },
  icon: { fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' },
};
