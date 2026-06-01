import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import { setSession, getToken } from '../lib/authStore';

const nav = [
  { to: '/manage', end: true, label: 'לוח בקרה', admin: true },
  { to: '/manage/reports', label: 'דוחות וסטטיסטיקה', admin: true },
  { to: '/manage/rooms', label: 'חדרים', admin: true },
  { to: '/manage/users', label: 'משתמשי ניהול', admin: true },
  { to: '/manage/status', label: 'סטטוס מערכת', admin: true },
  { to: '/manage/settings', label: 'הגדרות מרפאה', admin: true },
  { to: '/manage/services', label: 'שירותים', admin: true },
  { to: '/manage/stations', label: 'עמדות חדר' },
];

export default function ManageLayout() {
  const { user, logout, isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const [pwDone, setPwDone] = useState(false);
  const mustChange = isAdmin && user?.must_change_password && !pwDone;

  const onPasswordChanged = (u) => {
    setSession(getToken(), u);
    setPwDone(true);
    refresh();
  };

  return (
    <div style={styles.shell}>
      {mustChange && <ChangePasswordModal onDone={onPasswordChanged} />}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span>🏥</span> MedQueue
        </div>
        <p style={styles.user}>
          {user?.display_name || user?.username}
          <span style={styles.role}>{isAdmin ? 'מנהל' : 'צוות'}</span>
        </p>
        <nav style={styles.nav}>
          {nav
            .filter((n) => !n.admin || isAdmin)
            .map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                style={({ isActive }) => ({
                  ...styles.link,
                  ...(isActive ? styles.linkActive : {}),
                })}
              >
                {n.label}
              </NavLink>
            ))}
        </nav>
        <div style={styles.external}>
          <a href="/kiosk" target="_blank" rel="noreferrer" style={styles.extLink}>
            קיוסק ↗
          </a>
          <a href="/display" target="_blank" rel="noreferrer" style={styles.extLink}>
            מסך ראשי ↗
          </a>
        </div>
        <button
          type="button"
          style={styles.logout}
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          התנתק
        </button>
        <p className="manage-credit">פותח ע&quot;י שיטכנולוגיות 2026</p>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  sidebar: {
    width: 240,
    background: '#1e293b',
    padding: '1.25rem',
    borderLeft: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
  },
  brand: { fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' },
  user: { fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.25rem' },
  role: { display: 'block', color: '#64748b', fontSize: '0.75rem' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 },
  link: {
    padding: '0.6rem 0.75rem',
    borderRadius: 8,
    color: '#cbd5e1',
    textDecoration: 'none',
    fontWeight: 500,
  },
  linkActive: { background: '#334155', color: '#fff' },
  external: { marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  extLink: { color: '#64748b', fontSize: '0.85rem' },
  logout: {
    marginTop: '1rem',
    background: 'transparent',
    border: '1px solid #475569',
    color: '#94a3b8',
    padding: '0.5rem',
    borderRadius: 8,
  },
  main: { flex: 1, padding: '1.5rem 2rem', overflow: 'auto' },
};
